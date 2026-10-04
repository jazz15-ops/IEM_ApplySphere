const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper to construct multipart form-data requests natively in Node
const uploadFileRequest = (documentType, filePath, fileName, mimeType, token) => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileData = fs.readFileSync(filePath);

    let headerPayload = `--${boundary}\r\n`;
    headerPayload += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    headerPayload += `Content-Type: ${mimeType}\r\n\r\n`;

    const footerPayload = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(headerPayload),
      fileData,
      Buffer.from(footerPayload)
    ]);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: 'localhost',
        port: 3000,
        path: `/api/applications/me/documents/${documentType}`,
        method: 'POST',
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
    req.write(bodyBuffer);
    req.end();
  });
};

const jsonRequest = (method, path, data = null, token = null) => {
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
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runDocumentTests = async () => {
  console.log('--- STARTING DOCUMENT UPLOAD & SECURITY VERIFICATION TESTS ---');

  // Create temporary test files
  const tmpDir = path.join(__dirname, 'tmp_test_files');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const dummyPdf = path.join(tmpDir, 'test_marksheet.pdf');
  fs.writeFileSync(dummyPdf, '%PDF-1.4 Dummy PDF Content for Class 10');

  const dummyPng = path.join(tmpDir, 'test_marksheet.png');
  fs.writeFileSync(dummyPng, 'DUMMY_PNG_BINARY_CONTENT');

  const dummyJpg = path.join(tmpDir, 'test_photo.jpg');
  fs.writeFileSync(dummyJpg, 'DUMMY_JPG_BINARY_CONTENT');

  // Create 6 MB dummy file for size limit test
  const dummyLargeFile = path.join(tmpDir, 'large_file.pdf');
  const largeBuf = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
  fs.writeFileSync(dummyLargeFile, largeBuf);

  // 1. Register fresh applicant & admin
  const testEmail = `doc_applicant_${Date.now()}@example.com`;
  const regRes = await jsonRequest('POST', '/api/auth/register', {
    name: 'Doc Tester',
    email: testEmail,
    phone: '9876543210',
    password: 'Password@123'
  });
  const applicantToken = regRes.body.token;

  const adminLogin = await jsonRequest('POST', '/api/auth/login', {
    email: 'admin@iem.edu',
    password: 'AdminPass@123'
  });
  const adminToken = adminLogin.body.token;

  // Register fresh applicant WITHOUT application for Test 11
  const noAppEmail = `noapp_applicant_${Date.now()}@example.com`;
  const noAppReg = await jsonRequest('POST', '/api/auth/register', {
    name: 'No App Applicant',
    email: noAppEmail,
    phone: '9876543210',
    password: 'Password@123'
  });
  const noAppToken = noAppReg.body.token;

  // Test 11: Applicant without application -> 404
  const noAppUpload = await uploadFileRequest('class10Marksheet', dummyPdf, 'marksheet.pdf', 'application/pdf', noAppToken);
  console.log('11. Applicant Without Application Upload 404:', noAppUpload.status === 404 ? 'PASS' : 'FAIL', noAppUpload.body.message);

  // Create application for test applicant
  await jsonRequest('POST', '/api/applications', { firstName: 'Doc' }, applicantToken);

  // Test 1: Valid Class 10 Marksheet PDF upload
  const t1 = await uploadFileRequest('class10Marksheet', dummyPdf, 'c10.pdf', 'application/pdf', applicantToken);
  console.log('1. Valid Class 10 Marksheet PDF Upload:', t1.status === 200 && t1.body.metadata.originalName === 'c10.pdf' ? 'PASS' : 'FAIL', t1.body.metadata?.storedName);

  // Test 2: Valid Class 12 Marksheet PNG upload
  const t2 = await uploadFileRequest('class12Marksheet', dummyPng, 'c12.png', 'image/png', applicantToken);
  console.log('2. Valid Class 12 Marksheet PNG Upload:', t2.status === 200 && t2.body.metadata.originalName === 'c12.png' ? 'PASS' : 'FAIL', t2.body.metadata?.storedName);

  // Test 3: Valid ID Proof JPG upload
  const t3 = await uploadFileRequest('idProof', dummyJpg, 'id.jpg', 'image/jpeg', applicantToken);
  console.log('3. Valid ID Proof JPG Upload:', t3.status === 200 && t3.body.metadata.originalName === 'id.jpg' ? 'PASS' : 'FAIL', t3.body.metadata?.storedName);

  // Test 4: Valid Passport Photo JPEG upload
  const t4 = await uploadFileRequest('passportPhoto', dummyJpg, 'photo.jpg', 'image/jpeg', applicantToken);
  console.log('4. Valid Passport Photo JPEG Upload:', t4.status === 200 && t4.body.metadata.originalName === 'photo.jpg' ? 'PASS' : 'FAIL', t4.body.metadata?.storedName);

  // Test 5: Unsupported file type rejected (PDF for passportPhoto)
  const t5 = await uploadFileRequest('passportPhoto', dummyPdf, 'photo.pdf', 'application/pdf', applicantToken);
  console.log('5. Unsupported File Type (PDF for Passport Photo) Rejected:', t5.status === 400 ? 'PASS' : 'FAIL', t5.body.message);

  // Test 6: File larger than 5 MB rejected
  const t6 = await uploadFileRequest('class10Marksheet', dummyLargeFile, 'large.pdf', 'application/pdf', applicantToken);
  console.log('6. Oversized File (>5MB) Rejected:', t6.status === 400 ? 'PASS' : 'FAIL', t6.body.message);

  // Test 7: Invalid documentType rejected
  const t7 = await uploadFileRequest('hackedType', dummyPdf, 'test.pdf', 'application/pdf', applicantToken);
  console.log('7. Invalid documentType Rejected:', t7.status === 400 ? 'PASS' : 'FAIL', t7.body.message);

  // Test 8: Missing file rejected
  const t8 = await jsonRequest('POST', '/api/applications/me/documents/class10Marksheet', null, applicantToken);
  console.log('8. Missing File Rejected:', t8.status === 400 ? 'PASS' : 'FAIL', t8.body.message);

  // Test 9: Unauthenticated upload -> 401
  const t9 = await uploadFileRequest('class10Marksheet', dummyPdf, 'c10.pdf', 'application/pdf', null);
  console.log('9. Unauthenticated Upload 401:', t9.status === 401 ? 'PASS' : 'FAIL', t9.body.message);

  // Test 10: Admin upload -> 403
  const t10 = await uploadFileRequest('class10Marksheet', dummyPdf, 'c10.pdf', 'application/pdf', adminToken);
  console.log('10. Admin Upload 403 Forbidden:', t10.status === 403 ? 'PASS' : 'FAIL', t10.body.message);

  // Test 12: Replace existing document successfully
  const oldStoredName = t1.body.metadata.storedName;
  const t12 = await uploadFileRequest('class10Marksheet', dummyPng, 'c10_new.png', 'image/png', applicantToken);
  const newStoredName = t12.body.metadata.storedName;
  console.log('12. Replace Existing Document Successfully:', t12.status === 200 && newStoredName !== oldStoredName ? 'PASS' : 'FAIL', newStoredName);

  // Test 14: GET document metadata works
  const t14 = await jsonRequest('GET', '/api/applications/me/documents', null, applicantToken);
  console.log('14. GET Document Metadata Works:', t14.status === 200 && t14.body.documents.passportPhoto.originalName === 'photo.jpg' ? 'PASS' : 'FAIL', Object.keys(t14.body.documents));

  // Test 15: Protected file retrieval works
  const t15 = await jsonRequest('GET', '/api/applications/me/documents/passportPhoto/file', null, applicantToken);
  console.log('15. Protected File Retrieval Works:', t15.status === 200 && t15.headers['content-type'].includes('image/jpeg') ? 'PASS' : 'FAIL', t15.headers['content-type']);

  // Test 13: Delete document successfully
  const t13 = await jsonRequest('DELETE', '/api/applications/me/documents/class10Marksheet', null, applicantToken);
  console.log('13. Delete Document Successfully:', t13.status === 200 ? 'PASS' : 'FAIL', t13.body.message);

  // Cleanup temporary local files
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('--- ALL DOCUMENT UPLOAD & SECURITY VERIFICATION TESTS COMPLETE ---');
};

runDocumentTests().catch(console.error);
