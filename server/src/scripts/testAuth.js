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

const runTests = async () => {
  console.log('--- STARTING AUTH & RBAC VERIFICATION TESTS ---');

  // Test 1: Valid applicant registration
  const reg1 = await request('POST', '/api/auth/register', {
    name: 'John Applicant',
    email: 'john@example.com',
    phone: '9876543210',
    password: 'Password@123'
  });
  console.log('1. Valid Applicant Registration:', reg1.status === 201 && reg1.body.user.role === 'applicant' && !reg1.body.user.passwordHash ? 'PASS' : 'FAIL', reg1.body);

  // Test 2: Duplicate email rejected
  const regDup = await request('POST', '/api/auth/register', {
    name: 'John Duplicate',
    email: 'john@example.com',
    phone: '9876543210',
    password: 'Password@123'
  });
  console.log('2. Duplicate Email Rejected:', regDup.status === 400 ? 'PASS' : 'FAIL', regDup.body);

  // Test 3: Attempted admin self-registration does not create admin
  const regSneaky = await request('POST', '/api/auth/register', {
    name: 'Sneaky User',
    email: 'sneaky@example.com',
    phone: '9876543210',
    password: 'Password@123',
    role: 'admin' // Should be ignored/overridden to 'applicant'
  });
  console.log('3. Self-Registration Admin Role Rejected:', regSneaky.status === 201 && regSneaky.body.user.role === 'applicant' ? 'PASS' : 'FAIL', regSneaky.body.user.role);

  // Test 4: Valid applicant login
  const loginApp = await request('POST', '/api/auth/login', {
    email: 'john@example.com',
    password: 'Password@123'
  });
  const applicantToken = loginApp.body.token;
  console.log('4. Valid Applicant Login:', loginApp.status === 200 && applicantToken ? 'PASS' : 'FAIL', loginApp.body.message);

  // Test 5: Wrong password rejected
  const loginWrong = await request('POST', '/api/auth/login', {
    email: 'john@example.com',
    password: 'WrongPassword'
  });
  console.log('5. Wrong Password Rejected:', loginWrong.status === 401 ? 'PASS' : 'FAIL', loginWrong.body.message);

  // Test 6: /api/auth/me without token returns 401
  const meNoToken = await request('GET', '/api/auth/me');
  console.log('6. /api/auth/me Without Token 401:', meNoToken.status === 401 ? 'PASS' : 'FAIL', meNoToken.body.message);

  // Test 7: Valid token returns safe user data
  const meWithToken = await request('GET', '/api/auth/me', null, applicantToken);
  console.log('7. Valid Token Returns Safe User:', meWithToken.status === 200 && meWithToken.body.user.email === 'john@example.com' && !meWithToken.body.user.passwordHash ? 'PASS' : 'FAIL', meWithToken.body.user);

  // Test 8: Applicant accessing admin-only test route returns 403
  const adminRouteApplicant = await request('GET', '/api/test/admin-only', null, applicantToken);
  console.log('8. Applicant Admin-Only Access 403 Forbidden:', adminRouteApplicant.status === 403 ? 'PASS' : 'FAIL', adminRouteApplicant.body.message);

  // Test 9: Seeded admin can access admin-only route
  const loginAdmin = await request('POST', '/api/auth/login', {
    email: 'admin@iem.edu',
    password: 'AdminPass@123'
  });
  const adminToken = loginAdmin.body.token;
  const adminRouteAdmin = await request('GET', '/api/test/admin-only', null, adminToken);
  console.log('9. Seeded Admin Access Admin-Only Route:', adminRouteAdmin.status === 200 && adminRouteAdmin.body.message === 'Welcome Admin!' ? 'PASS' : 'FAIL', adminRouteAdmin.body);

  console.log('--- ALL AUTH & RBAC VERIFICATION TESTS COMPLETE ---');
};

runTests().catch(console.error);
