const http = require('http');

const request = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: 'localhost',
        port: 3000,
        path,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runApplicationTests = async () => {
  console.log('--- STARTING ADMISSION APPLICATION API VERIFICATION TESTS ---');

  // Register a fresh applicant for testing applications
  const testEmail = `applicant_${Date.now()}@example.com`;
  const regRes = await request('POST', '/api/auth/register', {
    name: 'Alice Applicant',
    email: testEmail,
    phone: '9876543210',
    password: 'Password@123'
  });

  const applicantToken = regRes.body.token;
  console.log('Registered Test Applicant:', applicantToken ? 'PASS' : 'FAIL');

  // Login admin to get adminToken
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@iem.edu',
    password: 'AdminPass@123'
  });
  const adminToken = adminLogin.body.token;

  // Test 1: Create draft application
  const createRes = await request('POST', '/api/applications', {
    firstName: 'Alice',
    lastName: 'Applicant',
    email: testEmail,
    programLevel: 'Undergraduate',
    programName: 'B.Tech Computer Science'
  }, applicantToken);

  const initialAppNum = createRes.body.application?.applicationNumber;
  console.log('1. Create Draft Application:', createRes.status === 201 && initialAppNum?.startsWith('IEM-2026-') ? 'PASS' : 'FAIL', createRes.body.application?.applicationNumber);

  // Test 2: Retrieve same draft
  const getRes = await request('GET', '/api/applications/me', null, applicantToken);
  console.log('2. Retrieve Same Draft:', getRes.status === 200 && getRes.body.application?.applicationNumber === initialAppNum ? 'PASS' : 'FAIL', getRes.body.application?.applicationNumber);

  // Test 3: Update draft
  const updateRes = await request('PATCH', '/api/applications/me', {
    city: 'Kolkata',
    state: 'West Bengal',
    class10: { board: 'CBSE', institutionName: 'IEM Public School', passingYear: 2022, percentage: 92.5 }
  }, applicantToken);
  console.log('3. Update Draft:', updateRes.status === 200 && updateRes.body.application?.city === 'Kolkata' && updateRes.body.application?.class10?.percentage === 92.5 ? 'PASS' : 'FAIL', updateRes.body.application?.city);

  // Test 4: Attempt second application -> rejected
  const secondCreate = await request('POST', '/api/applications', {
    firstName: 'Alice Duplicate'
  }, applicantToken);
  console.log('4. Attempt Second Application Rejected:', secondCreate.status === 400 ? 'PASS' : 'FAIL', secondCreate.body.message);

  // Test 5: Missing JWT -> 401
  const noTokenRes = await request('GET', '/api/applications/me');
  console.log('5. Missing JWT Returns 401:', noTokenRes.status === 401 ? 'PASS' : 'FAIL', noTokenRes.body.message);

  // Test 6: Admin tries applicant create route -> 403
  const adminCreateRes = await request('POST', '/api/applications', { firstName: 'Admin Test' }, adminToken);
  console.log('6. Admin Accessing Applicant Endpoint 403:', adminCreateRes.status === 403 ? 'PASS' : 'FAIL', adminCreateRes.body.message);

  // Test 7: Attempt to change applicationNumber -> protected/ignored
  const tamperNumRes = await request('PATCH', '/api/applications/me', {
    applicationNumber: 'HACKED-APP-999'
  }, applicantToken);
  console.log('7. Attempt to Change applicationNumber Ignored:', tamperNumRes.status === 200 && tamperNumRes.body.application?.applicationNumber === initialAppNum ? 'PASS' : 'FAIL', tamperNumRes.body.application?.applicationNumber);

  // Test 8: Attempt to change status -> protected/ignored
  const tamperStatusRes = await request('PATCH', '/api/applications/me', {
    status: 'SUBMITTED'
  }, applicantToken);
  console.log('8. Attempt to Change status Ignored:', tamperStatusRes.status === 200 && tamperStatusRes.body.application?.status === 'DRAFT' ? 'PASS' : 'FAIL', tamperStatusRes.body.application?.status);

  // Test 9: Invalid percentage -> rejected
  const invalidPctRes = await request('PATCH', '/api/applications/me', {
    class10: { percentage: 150 }
  }, applicantToken);
  console.log('9. Invalid Percentage (>100) Rejected:', invalidPctRes.status === 400 ? 'PASS' : 'FAIL', invalidPctRes.body.message);

  console.log('--- ALL ADMISSION APPLICATION API VERIFICATION TESTS COMPLETE ---');
};

runApplicationTests().catch(console.error);
