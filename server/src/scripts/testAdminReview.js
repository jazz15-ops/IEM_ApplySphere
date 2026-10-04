const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const connectDB = require('../config/db');
const User = require('../models/User');
const Application = require('../models/Application');
const jwt = require('jsonwebtoken');

const makeRequest = (options, postData = null, token = null) => {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      host: '127.0.0.1',
      port: process.env.PORT || 3000,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({ status: res.statusCode, body });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const uploadDummyFile = (token, documentType, filename = 'test_doc.pdf', mimeType = 'application/pdf') => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = 'Dummy document payload for testing admin review module';

    let headerPayload = `--${boundary}\r\n`;
    headerPayload += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
    headerPayload += `Content-Type: ${mimeType}\r\n\r\n`;

    const footerPayload = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(headerPayload),
      Buffer.from(fileContent),
      Buffer.from(footerPayload)
    ]);

    const req = http.request(
      {
        host: '127.0.0.1',
        port: process.env.PORT || 3000,
        path: `/api/applications/me/documents/${documentType}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length,
          'Authorization': `Bearer ${token}`
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
};

const runTests = async () => {
  console.log('--- Starting Admin Application Review Test Suite ---\n');
  let passed = 0;
  let failed = 0;
  let serverInstance = null;

  const assert = (testName, condition, detail = '') => {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  };

  try {
    await connectDB();
    const port = process.env.PORT || 3000;
    serverInstance = app.listen(port);
    await new Promise((res) => setTimeout(res, 500));

    const timestamp = Date.now();

    // Register applicant user
    const applicantEmail = `adminreview_app_${timestamp}@example.com`;
    const signupRes = await makeRequest({ path: '/api/auth/register', method: 'POST' }, {
      name: 'Review Applicant',
      email: applicantEmail,
      phone: '9876543210',
      password: 'password123',
      role: 'applicant'
    });
    const applicantToken = signupRes.body.token;

    // Register admin user directly in DB
    const adminEmail = `adminreview_admin_${timestamp}@example.com`;
    const adminUser = new User({
      name: 'Review Admin',
      email: adminEmail,
      phone: '9876543211',
      passwordHash: 'dummyhash',
      role: 'admin'
    });
    await adminUser.save();
    const adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create draft application
    const createRes = await makeRequest({ path: '/api/applications', method: 'POST' }, {
      firstName: 'ReviewFirst',
      lastName: 'ReviewLast',
      preferredDepartment: 'School of Engineering & Technology'
    }, applicantToken);

    const appNumber = createRes.body.application.applicationNumber;
    const appId = createRes.body.application._id;

    // 1. Admin can list applications (200 OK)
    const listRes = await makeRequest({ path: '/api/admin/applications', method: 'GET' }, null, adminToken);
    assert('Test 1: Admin can list applications (200 OK)', listRes.status === 200 && Array.isArray(listRes.body.applications));

    // 2. Unauthenticated list -> 401
    const unauthList = await makeRequest({ path: '/api/admin/applications', method: 'GET' });
    assert('Test 2: Unauthenticated list request returns 401 Unauthorized', unauthList.status === 401);

    // 3. Applicant list -> 403
    const applicantList = await makeRequest({ path: '/api/admin/applications', method: 'GET' }, null, applicantToken);
    assert('Test 3: Applicant list request returns 403 Forbidden', applicantList.status === 403);

    // 4. Status filter returns appropriate records
    const statusFilterRes = await makeRequest({ path: '/api/admin/applications?status=DRAFT', method: 'GET' }, null, adminToken);
    assert('Test 4: Status filter returns matching DRAFT applications', statusFilterRes.status === 200 && statusFilterRes.body.applications.every(a => a.status === 'DRAFT'));

    // 5. Department filter returns appropriate records
    const deptFilterRes = await makeRequest({ path: '/api/admin/applications?department=School', method: 'GET' }, null, adminToken);
    assert('Test 5: Department filter returns matching records', deptFilterRes.status === 200 && deptFilterRes.body.applications.length > 0);

    // 6. Search by applicationNumber works
    const searchAppNumRes = await makeRequest({ path: `/api/admin/applications?search=${appNumber}`, method: 'GET' }, null, adminToken);
    assert('Test 6: Search by applicationNumber works', searchAppNumRes.status === 200 && searchAppNumRes.body.applications.some(a => a.applicationNumber === appNumber));

    // 7. Search by applicant name works
    const searchNameRes = await makeRequest({ path: '/api/admin/applications?search=ReviewFirst', method: 'GET' }, null, adminToken);
    assert('Test 7: Search by applicant name works', searchNameRes.status === 200 && searchNameRes.body.applications.some(a => a.applicantName.includes('ReviewFirst')));

    // 8. Pagination works (page & limit)
    const pageRes = await makeRequest({ path: '/api/admin/applications?page=1&limit=2', method: 'GET' }, null, adminToken);
    assert('Test 8: Pagination metadata returns limit and page info', pageRes.status === 200 && pageRes.body.pagination.limit === 2);

    // 9. Limit above maximum (50) is constrained to 50
    const maxLimitRes = await makeRequest({ path: '/api/admin/applications?limit=100', method: 'GET' }, null, adminToken);
    assert('Test 9: Limit above maximum (50) is constrained to 50', maxLimitRes.status === 200 && maxLimitRes.body.pagination.limit === 50);

    // 10. Admin can retrieve application detail
    const detailRes = await makeRequest({ path: `/api/admin/applications/${appId}`, method: 'GET' }, null, adminToken);
    assert('Test 10: Admin can retrieve application detail (200 OK)', detailRes.status === 200 && detailRes.body.applicationNumber === appNumber);

    // 11. Invalid application ID handled safely
    const invalidIdRes = await makeRequest({ path: '/api/admin/applications/invalid_id_format', method: 'GET' }, null, adminToken);
    assert('Test 11: Invalid application ID handled safely (404 Not Found)', invalidIdRes.status === 404);

    // 12. Missing application -> 404
    const missingIdRes = await makeRequest({ path: `/api/admin/applications/${new mongoose.Types.ObjectId()}`, method: 'GET' }, null, adminToken);
    assert('Test 12: Missing application returns 404 Not Found', missingIdRes.status === 404);

    // 13. Detail response excludes passwordHash
    assert('Test 13: Detail response excludes passwordHash', detailRes.body.applicant.passwordHash === undefined);

    // 14. Detail readiness matches readiness service
    assert('Test 14: Detail response includes readiness calculation object', typeof detailRes.body.readiness?.readinessScore === 'number');

    // Complete applicant application & upload document for streaming test
    await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, {
      firstName: 'ReviewFirst',
      lastName: 'ReviewLast',
      dateOfBirth: '2000-01-01',
      gender: 'Male',
      phone: '9876543210',
      email: applicantEmail,
      nationality: 'Indian',
      addressLine1: 'Road 1',
      city: 'Kolkata',
      state: 'WB',
      postalCode: '700091',
      country: 'India',
      class10: { board: 'CBSE', institutionName: 'School', passingYear: 2018, percentage: 88 },
      class12: { board: 'CBSE', institutionName: 'School', passingYear: 2020, percentage: 90 },
      programLevel: 'Undergraduate',
      programName: 'B.Tech Computer Science',
      preferredDepartment: 'School of Engineering & Technology'
    }, applicantToken);

    await uploadDummyFile(applicantToken, 'class10Marksheet');
    await uploadDummyFile(applicantToken, 'class12Marksheet');
    await uploadDummyFile(applicantToken, 'idProof');
    await uploadDummyFile(applicantToken, 'passportPhoto', 'photo.jpg', 'image/jpeg');

    // Submit application
    await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, applicantToken);

    // 15. Admin securely retrieves uploaded document
    const adminDocStream = await makeRequest({ path: `/api/admin/applications/${appId}/documents/class10Marksheet/file`, method: 'GET' }, null, adminToken);
    assert('Test 15: Admin securely streams applicant document (200 OK)', adminDocStream.status === 200);

    // 16. Applicant admin-document access -> 403
    const applicantAdminDocStream = await makeRequest({ path: `/api/admin/applications/${appId}/documents/class10Marksheet/file`, method: 'GET' }, null, applicantToken);
    assert('Test 16: Applicant calling admin document endpoint returns 403 Forbidden', applicantAdminDocStream.status === 403);

    // 17. Invalid document type rejected
    const invalidDocTypeRes = await makeRequest({ path: `/api/admin/applications/${appId}/documents/invalidDocType/file`, method: 'GET' }, null, adminToken);
    assert('Test 17: Invalid document type rejected (400 Bad Request)', invalidDocTypeRes.status === 400);

    // 18. Admin SUBMITTED -> UNDER_REVIEW succeeds
    const adminStartReview = await makeRequest({ path: `/api/admin/applications/${appId}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, adminToken);
    assert('Test 18: Admin SUBMITTED -> UNDER_REVIEW transition succeeds (200 OK)', adminStartReview.status === 200 && adminStartReview.body.status === 'UNDER_REVIEW');

    // 19. Admin UNDER_REVIEW -> SELECTED succeeds
    const adminSelect = await makeRequest({ path: `/api/admin/applications/${appId}/status`, method: 'PATCH' }, { status: 'SELECTED' }, adminToken);
    assert('Test 19: Admin UNDER_REVIEW -> SELECTED transition succeeds (200 OK)', adminSelect.status === 200 && adminSelect.body.status === 'SELECTED');

    // 20. Separate review can result in REJECTED
    const app2UserEmail = `adminreview_app2_${timestamp}@example.com`;
    const app2Signup = await makeRequest({ path: '/api/auth/register', method: 'POST' }, {
      name: 'App2 Review', email: app2UserEmail, phone: '9876543222', password: 'password123', role: 'applicant'
    });
    const app2Token = app2Signup.body.token;

    const create2 = await makeRequest({ path: '/api/applications', method: 'POST' }, { firstName: 'App2', lastName: 'Reject' }, app2Token);
    const app2Id = create2.body.application._id;

    await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, {
      firstName: 'App2', lastName: 'Reject', dateOfBirth: '2001-01-01', gender: 'Female', phone: '9876543222', email: app2UserEmail, nationality: 'Indian',
      addressLine1: 'Road 2', city: 'Kolkata', state: 'WB', postalCode: '700091', country: 'India',
      class10: { board: 'CBSE', institutionName: 'School', passingYear: 2018, percentage: 80 },
      class12: { board: 'CBSE', institutionName: 'School', passingYear: 2020, percentage: 82 },
      programLevel: 'Undergraduate', programName: 'BBA', preferredDepartment: 'Department of Management'
    }, app2Token);
    await uploadDummyFile(app2Token, 'class10Marksheet');
    await uploadDummyFile(app2Token, 'class12Marksheet');
    await uploadDummyFile(app2Token, 'idProof');
    await uploadDummyFile(app2Token, 'passportPhoto', 'photo.jpg', 'image/jpeg');
    await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, app2Token);

    await makeRequest({ path: `/api/admin/applications/${app2Id}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, adminToken);
    const adminReject = await makeRequest({ path: `/api/admin/applications/${app2Id}/status`, method: 'PATCH' }, { status: 'REJECTED' }, adminToken);
    assert('Test 20: Separate review can transition UNDER_REVIEW -> REJECTED (200 OK)', adminReject.status === 200 && adminReject.body.status === 'REJECTED');

    // 21. Invalid transition still rejected
    const invalidTransRes = await makeRequest({ path: `/api/admin/applications/${app2Id}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, adminToken);
    assert('Test 21: Invalid status transition rejected (400 Bad Request)', invalidTransRes.status === 400);

    // 22. Terminal states expose no valid next actions
    const terminalTransRes = await makeRequest({ path: `/api/admin/applications/${appId}/status`, method: 'PATCH' }, { status: 'REJECTED' }, adminToken);
    assert('Test 22: Terminal SELECTED state rejects further status transitions', terminalTransRes.status === 400);

    // 23. Applicant cannot use admin status transition
    const applicantStatusCall = await makeRequest({ path: `/api/admin/applications/${appId}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, applicantToken);
    assert('Test 23: Applicant calling admin status transition endpoint returns 403 Forbidden', applicantStatusCall.status === 403);

    console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed`);

    if (serverInstance) serverInstance.close();
    await mongoose.connection.close();

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    if (serverInstance) serverInstance.close();
    await mongoose.connection.close();
    process.exit(1);
  }
};

runTests();
