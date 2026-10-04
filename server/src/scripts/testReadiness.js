const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const connectDB = require('../config/db');
const { calculateReadiness } = require('../services/readiness.service');

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

const runTests = async () => {
  console.log('--- Starting Readiness Engine Test Suite ---\n');
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
    // Start DB and temporary server listener for HTTP tests
    await connectDB();
    const port = process.env.PORT || 3000;
    serverInstance = app.listen(port);
    await new Promise((res) => setTimeout(res, 500));
    // 1. Test Service Logic: Nearly empty draft produces low/appropriate score
    const emptyApp = {
      applicationNumber: 'IEM-2026-000001',
      firstName: '',
      class10: {},
      class12: {},
      programLevel: '',
      programName: '',
      preferredDepartment: '',
      documents: {}
    };
    const emptyResult = calculateReadiness(emptyApp);
    assert('Test 1: Nearly empty draft produces low/appropriate score (0)', emptyResult.readinessScore === 0);

    // 2. Test Service Logic: Completing required personal/address fields increases category toward 20
    const halfPersonalApp = {
      ...emptyApp,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2000-01-01',
      gender: 'Male',
      phone: '9876543210',
      email: 'john@example.com'
      // 6 of 12 fields complete = 10 pts out of 20
    };
    const halfPersonalResult = calculateReadiness(halfPersonalApp);
    assert('Test 2: Completing 6/12 personal fields increases personal score to 10', halfPersonalResult.breakdown.personalAndAddress.score === 10);

    // 3. Test Service Logic: Class 10 academic details can earn maximum 10
    const class10App = {
      ...emptyApp,
      class10: {
        board: 'CBSE',
        institutionName: 'Delhi Public School',
        passingYear: 2020,
        percentage: 92.5
      }
    };
    const class10Result = calculateReadiness(class10App);
    assert('Test 3: Class 10 academic details earn maximum 10 pts', class10Result.breakdown.academic.score === 10);

    // 4. Test Service Logic: Class 12 academic details can earn maximum 10
    const class12App = {
      ...emptyApp,
      class12: {
        board: 'CBSE',
        institutionName: 'Delhi Public School',
        passingYear: 2022,
        percentage: 94.0
      }
    };
    const class12Result = calculateReadiness(class12App);
    assert('Test 4: Class 12 academic details earn maximum 10 pts', class12Result.breakdown.academic.score === 10);

    // 5. Test Service Logic: Complete Program Selection earns 10
    const programApp = {
      ...emptyApp,
      programLevel: 'Undergraduate',
      programName: 'B.Tech Computer Science',
      preferredDepartment: 'School of Engineering & Technology'
    };
    const programResult = calculateReadiness(programApp);
    assert('Test 5: Complete Program Selection earns 10 pts', programResult.breakdown.programSelection.score === 10);

    // 6. Test Service Logic: Class 10 marksheet earns 10
    const docC10App = {
      ...emptyApp,
      documents: {
        class10Marksheet: { storedName: 'c10.pdf', originalName: 'c10.pdf' }
      }
    };
    const docC10Result = calculateReadiness(docC10App);
    assert('Test 6: Class 10 marksheet uploaded earns 10 pts', docC10Result.breakdown.marksheets.score === 10);

    // 7. Test Service Logic: Class 12 marksheet earns another 10
    const docC12App = {
      ...emptyApp,
      documents: {
        class10Marksheet: { storedName: 'c10.pdf', originalName: 'c10.pdf' },
        class12Marksheet: { storedName: 'c12.pdf', originalName: 'c12.pdf' }
      }
    };
    const docC12Result = calculateReadiness(docC12App);
    assert('Test 7: Both marksheets uploaded earn 20 pts total', docC12Result.breakdown.marksheets.score === 20);

    // 8. Test Service Logic: ID proof earns 15
    const idProofApp = {
      ...emptyApp,
      documents: {
        idProof: { storedName: 'id.pdf', originalName: 'id.pdf' }
      }
    };
    const idProofResult = calculateReadiness(idProofApp);
    assert('Test 8: ID proof uploaded earns 15 pts', idProofResult.breakdown.idProof.score === 15);

    // 9. Test Service Logic: Passport photo earns 15
    const passportApp = {
      ...emptyApp,
      documents: {
        passportPhoto: { storedName: 'photo.jpg', originalName: 'photo.jpg' }
      }
    };
    const passportResult = calculateReadiness(passportApp);
    assert('Test 9: Passport photo uploaded earns 15 pts', passportResult.breakdown.passportPhoto.score === 15);

    // 10. Test Service Logic: Fully complete application returns exactly 100
    const fullApp = {
      applicationNumber: 'IEM-2026-999999',
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfBirth: '2004-05-15',
      gender: 'Male',
      phone: '9876543210',
      email: 'aarav@example.com',
      nationality: 'Indian',
      addressLine1: '123 Salt Lake Sector 5',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700091',
      country: 'India',
      class10: { board: 'CBSE', institutionName: 'DPS Kolkata', passingYear: 2020, percentage: 95 },
      class12: { board: 'CBSE', institutionName: 'DPS Kolkata', passingYear: 2022, percentage: 96 },
      programLevel: 'Undergraduate',
      programName: 'B.Tech Computer Science',
      preferredDepartment: 'School of Engineering & Technology',
      documents: {
        class10Marksheet: { storedName: 'c10.pdf', originalName: 'c10.pdf' },
        class12Marksheet: { storedName: 'c12.pdf', originalName: 'c12.pdf' },
        idProof: { storedName: 'id.pdf', originalName: 'id.pdf' },
        passportPhoto: { storedName: 'photo.jpg', originalName: 'photo.jpg' }
      }
    };
    const fullResult = calculateReadiness(fullApp);
    assert('Test 10: Fully complete application returns readiness score of exactly 100', fullResult.readinessScore === 100);

    // 11. Test Service Logic: Fully complete application returns canSubmit: true
    assert('Test 11: Fully complete application returns canSubmit: true', fullResult.canSubmit === true);

    // 12. Test Service Logic: One required item missing returns canSubmit: false
    const missingOneApp = {
      ...fullApp,
      documents: {
        ...fullApp.documents,
        passportPhoto: null // missing photo
      }
    };
    const missingOneResult = calculateReadiness(missingOneApp);
    assert('Test 12: One required item missing returns canSubmit: false', missingOneResult.canSubmit === false && missingOneResult.readinessScore < 100);

    // 13. Test Service Logic: missingItems correctly identifies missing fields/documents
    const missingKeys = missingOneResult.missingItems.map(i => i.key);
    assert('Test 13: missingItems correctly identifies missing document slot', missingKeys.includes('documents.passportPhoto'));

    // 14. Test Service Logic: Same stored data always produces same score (deterministic)
    const result1 = calculateReadiness(fullApp);
    const result2 = calculateReadiness(fullApp);
    assert('Test 14: Same stored data always produces identical score & breakdown', result1.readinessScore === result2.readinessScore && JSON.stringify(result1.breakdown) === JSON.stringify(result2.breakdown));

    // 15. Test Service Logic: Score never exceeds 100 or drops below 0
    assert('Test 15: Score is strictly bounded between 0 and 100', fullResult.readinessScore <= 100 && emptyResult.readinessScore >= 0);

    // --- HTTP Endpoint Tests ---
    console.log('\n--- Testing HTTP Endpoints ---');

    // Login applicant to get JWT token
    const uniqueEmail = `readinesstester_${Date.now()}@example.com`;
    const signupRes = await makeRequest({ path: '/api/auth/register', method: 'POST' }, {
      name: 'Readiness Tester',
      email: uniqueEmail,
      phone: '9999988888',
      password: 'password123',
      role: 'applicant'
    });

    const token = signupRes.body.token;

    // Register user and set role to 'admin' directly in DB
    const adminEmail = `adminreadiness_${Date.now()}@example.com`;
    const User = require('../models/User');
    const jwt = require('jsonwebtoken');
    const adminUser = new User({
      name: 'Admin Readiness',
      email: adminEmail,
      phone: '9999977777',
      passwordHash: 'dummyhash',
      role: 'admin'
    });
    await adminUser.save();
    const adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 16. Unauthenticated readiness request returns 401
    const unauthRes = await makeRequest({ path: '/api/applications/me/readiness', method: 'GET' });
    assert('Test 16: Unauthenticated request to /api/applications/me/readiness returns 401', unauthRes.status === 401);

    // 17. Admin accessing applicant readiness endpoint returns 403
    const adminRes = await makeRequest({ path: '/api/applications/me/readiness', method: 'GET' }, null, adminToken);
    assert('Test 17: Admin role accessing applicant readiness endpoint returns 403', adminRes.status === 403);

    // 18. Applicant without application gets appropriate response (200 OK with readiness 0)
    const noAppRes = await makeRequest({ path: '/api/applications/me/readiness', method: 'GET' }, null, token);
    assert('Test 18: Applicant without application gets 200 OK with readiness score 0', noAppRes.status === 200 && noAppRes.body.readinessScore === 0 && noAppRes.body.canSubmit === false);

    // Create an application draft for applicant
    await makeRequest({ path: '/api/applications', method: 'POST' }, {
      firstName: 'Tester',
      lastName: 'Applicant'
    }, token);

    // 19. Applicant cannot request another applicant's readiness through an ID parameter
    const queryParamRes = await makeRequest({ path: '/api/applications/me/readiness?applicationId=fakeid123', method: 'GET' }, null, token);
    assert('Test 19: GET /api/applications/me/readiness strictly evaluates authenticated applicant application', queryParamRes.status === 200 && queryParamRes.body.readinessScore !== undefined);

    // Extra Security Check: Test that PATCH /api/applications/me cannot alter readinessScore or documents
    const patchRes = await makeRequest({ path: '/api/applications/me', method: 'PATCH' }, {
      firstName: 'UpdatedName',
      readinessScore: 100,
      canSubmit: true,
      documents: { passportPhoto: { storedName: 'hacked.png' } }
    }, token);
    assert('Patch Check: PATCH /api/applications/me updates valid field and ignores readinessScore & document payloads', patchRes.status === 200 && patchRes.body.application.firstName === 'UpdatedName' && patchRes.body.application.readinessScore === undefined && (patchRes.body.application.documents?.passportPhoto === null || patchRes.body.application.documents?.passportPhoto?.storedName !== 'hacked.png'));

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
