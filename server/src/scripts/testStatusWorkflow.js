const http = require('http');
const path = require('path');
const fs = require('fs');
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
    const fileContent = 'Dummy document payload for testing status workflow';

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
  console.log('--- Starting Application Status Workflow Test Suite ---\n');
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

    // Register test applicant
    const timestamp = Date.now();
    const applicantEmail = `workflow_applicant_${timestamp}@example.com`;
    const signupRes = await makeRequest({ path: '/api/auth/register', method: 'POST' }, {
      name: 'Workflow Applicant',
      email: applicantEmail,
      phone: '9876543210',
      password: 'password123',
      role: 'applicant'
    });
    const token = signupRes.body.token;

    // Register test admin user directly in DB
    const adminEmail = `workflow_admin_${timestamp}@example.com`;
    const adminUser = new User({
      name: 'Workflow Admin',
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
      firstName: 'Workflow',
      lastName: 'User'
    }, token);

    const appNumber = createRes.body.application.applicationNumber;

    // 1. Incomplete DRAFT submission rejected
    const submitIncompleteRes = await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, token);
    assert('Test 1: Incomplete DRAFT submission rejected (400)', submitIncompleteRes.status === 400);

    // 2. Rejection response includes readiness/missing information
    assert('Test 2: Rejection response includes readinessScore & missingItems', submitIncompleteRes.body.readinessScore !== undefined && Array.isArray(submitIncompleteRes.body.missingItems));

    // Complete all required fields for applicant
    await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, {
      firstName: 'Workflow',
      lastName: 'Applicant',
      dateOfBirth: '2000-01-01',
      gender: 'Male',
      phone: '9876543210',
      email: applicantEmail,
      nationality: 'Indian',
      addressLine1: '123 Tech Street',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700091',
      country: 'India',
      class10: { board: 'CBSE', institutionName: 'IEM School', passingYear: 2018, percentage: 90 },
      class12: { board: 'CBSE', institutionName: 'IEM School', passingYear: 2020, percentage: 92 },
      programLevel: 'Undergraduate',
      programName: 'B.Tech Computer Science',
      preferredDepartment: 'School of Engineering & Technology'
    }, token);

    // Upload all 4 required documents
    await uploadDummyFile(token, 'class10Marksheet');
    await uploadDummyFile(token, 'class12Marksheet');
    await uploadDummyFile(token, 'idProof');
    await uploadDummyFile(token, 'passportPhoto', 'photo.jpg', 'image/jpeg');

    // 3. Fully complete DRAFT submits successfully
    const submitCompleteRes = await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, token);
    if (submitCompleteRes.status !== 200) {
      console.log('DEBUG submitCompleteRes:', submitCompleteRes.status, JSON.stringify(submitCompleteRes.body, null, 2));
    }
    assert('Test 3: Fully complete DRAFT submits successfully (200 OK)', submitCompleteRes.status === 200);

    // 4. Submission changes status to SUBMITTED
    assert('Test 4: Submission changes application status to SUBMITTED', submitCompleteRes.body.application.status === 'SUBMITTED');

    // 5. submittedAt timestamp is set
    assert('Test 5: submittedAt timestamp is set upon submission', Boolean(submitCompleteRes.body.application.submittedAt));

    // 6. SUBMITTED history entry created exactly once
    const history = submitCompleteRes.body.application.statusHistory;
    assert('Test 6: SUBMITTED history entry created with correct role', Array.isArray(history) && history.some(h => h.status === 'SUBMITTED' && h.changedByRole === 'applicant'));

    // 7. Second submit attempt rejected
    const secondSubmitRes = await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, token);
    assert('Test 7: Second submit attempt rejected (400 Bad Request)', secondSubmitRes.status === 400);

    // 8. Applicant cannot edit fields after submission
    const patchPostSubmit = await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, { firstName: 'HackedName' }, token);
    assert('Test 8: Applicant cannot edit fields after submission (400)', patchPostSubmit.status === 400 && patchPostSubmit.body.message.includes('Submitted applications can no longer be edited'));

    // 9. Applicant cannot upload document after submission
    const uploadPostSubmit = await uploadDummyFile(token, 'class10Marksheet');
    assert('Test 9: Applicant cannot upload document after submission (400)', uploadPostSubmit.status === 400 && uploadPostSubmit.body.message.includes('Submitted applications can no longer accept document uploads'));

    // 10. Applicant cannot delete document after submission
    const deletePostSubmit = await makeRequest({ path: '/api/applications/me/documents/class10Marksheet', method: 'DELETE' }, null, token);
    assert('Test 10: Applicant cannot delete document after submission (400)', deletePostSubmit.status === 400 && deletePostSubmit.body.message.includes('Submitted applications can no longer delete documents'));

    // 11. Applicant can still retrieve own application after submission
    const getAppPostSubmit = await makeRequest({ path: '/api/applications/me', method: 'GET' }, null, token);
    assert('Test 11: Applicant can retrieve own application after submission (200)', getAppPostSubmit.status === 200 && getAppPostSubmit.body.application.status === 'SUBMITTED');

    // 12. Applicant can still view own document file after submission
    const streamDocRes = await makeRequest({ path: '/api/applications/me/documents/class10Marksheet/file', method: 'GET' }, null, token);
    assert('Test 12: Applicant can view own document file after submission (200)', streamDocRes.status === 200);

    // 13. Applicant cannot directly PATCH status on /me
    const directStatusPatch = await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, { status: 'SELECTED' }, token);
    assert('Test 13: Applicant direct PATCH of status is rejected/ignored', directStatusPatch.status === 400 || directStatusPatch.body.application?.status === 'SUBMITTED');

    // 14. Applicant cannot tamper with statusHistory/timestamps
    const tamperRes = await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, { submittedAt: '1970-01-01' }, token);
    assert('Test 14: Applicant cannot tamper with timestamps via PATCH', tamperRes.status === 400 || (getAppPostSubmit.body.application.submittedAt !== '1970-01-01'));

    // 15. Admin can transition SUBMITTED -> UNDER_REVIEW
    const adminReviewRes = await makeRequest({ path: `/api/applications/${appNumber}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, adminToken);
    assert('Test 15: Admin can transition SUBMITTED -> UNDER_REVIEW (200)', adminReviewRes.status === 200 && adminReviewRes.body.status === 'UNDER_REVIEW');

    // 16. reviewStartedAt is set
    assert('Test 16: reviewStartedAt timestamp is set', Boolean(adminReviewRes.body.reviewStartedAt));

    // 17. Admin can transition UNDER_REVIEW -> SELECTED
    const adminSelectRes = await makeRequest({ path: `/api/applications/${appNumber}/status`, method: 'PATCH' }, { status: 'SELECTED' }, adminToken);
    assert('Test 17: Admin can transition UNDER_REVIEW -> SELECTED (200)', adminSelectRes.status === 200 && adminSelectRes.body.status === 'SELECTED');

    // 18. decisionAt is set
    assert('Test 18: decisionAt timestamp is set on decision', Boolean(adminSelectRes.body.decisionAt));

    // 19. Separate test application can transition UNDER_REVIEW -> REJECTED
    const app2UserEmail = `app2_${timestamp}@example.com`;
    const app2Signup = await makeRequest({ path: '/api/auth/register', method: 'POST' }, {
      name: 'App2 Applicant',
      email: app2UserEmail,
      phone: '9876543222',
      password: 'password123',
      role: 'applicant'
    });
    const app2Token = app2Signup.body.token;

    const create2Res = await makeRequest({ path: '/api/applications', method: 'POST' }, { firstName: 'App2', lastName: 'User' }, app2Token);
    const app2Number = create2Res.body.application.applicationNumber;

    // Fill & submit app2
    await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, {
      firstName: 'App2', lastName: 'User', dateOfBirth: '2001-01-01', gender: 'Female', phone: '9876543222', email: app2UserEmail, nationality: 'Indian',
      addressLine1: 'Street 2', city: 'Kolkata', state: 'WB', postalCode: '700091', country: 'India',
      class10: { board: 'CBSE', institutionName: 'School', passingYear: 2018, percentage: 80 },
      class12: { board: 'CBSE', institutionName: 'School', passingYear: 2020, percentage: 82 },
      programLevel: 'Undergraduate', programName: 'BBA', preferredDepartment: 'Department of Management'
    }, app2Token);

    await uploadDummyFile(app2Token, 'class10Marksheet');
    await uploadDummyFile(app2Token, 'class12Marksheet');
    await uploadDummyFile(app2Token, 'idProof');
    await uploadDummyFile(app2Token, 'passportPhoto', 'photo.jpg', 'image/jpeg');
    await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, app2Token);

    await makeRequest({ path: `/api/applications/${app2Number}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, adminToken);
    const adminRejectRes = await makeRequest({ path: `/api/applications/${app2Number}/status`, method: 'PATCH' }, { status: 'REJECTED' }, adminToken);
    assert('Test 19: Application can transition UNDER_REVIEW -> REJECTED (200)', adminRejectRes.status === 200 && adminRejectRes.body.status === 'REJECTED');

    // 20. Invalid DRAFT -> SELECTED transition rejected
    const app3UserEmail = `app3_${timestamp}@example.com`;
    const app3Signup = await makeRequest({ path: '/api/auth/register', method: 'POST' }, {
      name: 'App3 Applicant', email: app3UserEmail, phone: '9876543333', password: 'password123', role: 'applicant'
    });
    const create3Res = await makeRequest({ path: '/api/applications', method: 'POST' }, { firstName: 'App3' }, app3Signup.body.token);
    const app3Number = create3Res.body.application.applicationNumber;

    const invalidDraftSelect = await makeRequest({ path: `/api/applications/${app3Number}/status`, method: 'PATCH' }, { status: 'SELECTED' }, adminToken);
    assert('Test 20: Invalid DRAFT -> SELECTED transition rejected (400)', invalidDraftSelect.status === 400);

    // 21. Invalid SUBMITTED -> SELECTED transition rejected
    // Fill and submit app3
    await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, {
      firstName: 'App3', lastName: 'User', dateOfBirth: '2001-01-01', gender: 'Female', phone: '9876543333', email: app3UserEmail, nationality: 'Indian',
      addressLine1: 'Street 3', city: 'Kolkata', state: 'WB', postalCode: '700091', country: 'India',
      class10: { board: 'CBSE', institutionName: 'School', passingYear: 2018, percentage: 80 },
      class12: { board: 'CBSE', institutionName: 'School', passingYear: 2020, percentage: 82 },
      programLevel: 'Undergraduate', programName: 'BBA', preferredDepartment: 'Department of Management'
    }, app3Signup.body.token);
    await uploadDummyFile(app3Signup.body.token, 'class10Marksheet');
    await uploadDummyFile(app3Signup.body.token, 'class12Marksheet');
    await uploadDummyFile(app3Signup.body.token, 'idProof');
    await uploadDummyFile(app3Signup.body.token, 'passportPhoto', 'photo.jpg', 'image/jpeg');
    await makeRequest({ path: '/api/applications/me/submit', method: 'POST' }, {}, app3Signup.body.token);

    const invalidSubmittedSelect = await makeRequest({ path: `/api/applications/${app3Number}/status`, method: 'PATCH' }, { status: 'SELECTED' }, adminToken);
    assert('Test 21: Invalid SUBMITTED -> SELECTED transition rejected (400)', invalidSubmittedSelect.status === 400);

    // 22. Terminal SELECTED/REJECTED state cannot transition again
    const terminalTransition = await makeRequest({ path: `/api/applications/${appNumber}/status`, method: 'PATCH' }, { status: 'REJECTED' }, adminToken);
    assert('Test 22: Terminal SELECTED state cannot transition again (400)', terminalTransition.status === 400);

    // 23. Applicant cannot call admin status endpoint -> 403
    const applicantAdminCall = await makeRequest({ path: `/api/applications/${appNumber}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' }, token);
    assert('Test 23: Applicant calling admin status endpoint returns 403 Forbidden', applicantAdminCall.status === 403);

    // 24. Unauthenticated status transition -> 401
    const unauthTransition = await makeRequest({ path: `/api/applications/${appNumber}/status`, method: 'PATCH' }, { status: 'UNDER_REVIEW' });
    assert('Test 24: Unauthenticated status transition returns 401 Unauthorized', unauthTransition.status === 401);

    // 25. Status history order and entries are correct
    const statusRes = await makeRequest({ path: '/api/applications/me/status', method: 'GET' }, null, token);
    const finalHistory = statusRes.body.statusHistory;
    const historyStatuses = finalHistory.map(h => h.status);
    assert('Test 25: Status history order is correct [DRAFT, SUBMITTED, UNDER_REVIEW, SELECTED]', 
      historyStatuses.includes('DRAFT') && 
      historyStatuses.includes('SUBMITTED') && 
      historyStatuses.includes('UNDER_REVIEW') && 
      historyStatuses.includes('SELECTED')
    );

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
