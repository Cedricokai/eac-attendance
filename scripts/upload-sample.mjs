import fs from 'fs';
import path from 'path';

async function main() {
  const loginRes = await fetch('http://localhost:8080/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'admin', password: 'admin123' })
  });
  console.log('Login status:', loginRes.status);
  const loginText = await loginRes.text();
  console.log('Login response text:', loginText);
  let token = '';
  try {
    const loginData = JSON.parse(loginText);
    token = loginData.token;
  } catch (e) {}
  console.log('Got JWT token:', token ? (token.substring(0, 15) + '...') : 'NONE');

  // 1. Upload EAC_Comprehensive_Audit_Sample.pdf
  const pdfPath = path.resolve('EAC_Comprehensive_Audit_Sample.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', pdfBlob, 'EAC_Comprehensive_Audit_Sample.pdf');
  form.append('description', 'Comprehensive EAC Attendance and ERP Sample Audit Document');

  const uploadRes = await fetch('http://localhost:8080/api/file-manager/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  if (uploadRes.ok) {
    const uploaded = await uploadRes.json();
    console.log('Successfully uploaded PDF:', uploaded.id, uploaded.fileName, uploaded.formattedSize);

    // 2. Test Preview with ?token= query param
    const previewUrl = `http://localhost:8080/api/file-manager/files/${uploaded.id}/preview?token=${token}`;
    const previewRes = await fetch(previewUrl);
    console.log('Preview with ?token status:', previewRes.status, 'Content-Type:', previewRes.headers.get('content-type'), 'Length:', previewRes.headers.get('content-length'));

    // 3. Test Download with Bearer token
    const downloadUrl = `http://localhost:8080/api/file-manager/files/${uploaded.id}/download`;
    const downloadRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
    const downloadBuf = await downloadRes.arrayBuffer();
    console.log('Download with Bearer token status:', downloadRes.status, 'Downloaded Bytes:', downloadBuf.byteLength);

    // Verify first 4 bytes are %PDF
    const header = Buffer.from(downloadBuf.slice(0, 4)).toString();
    console.log('File Header check (should be %PDF):', header);
  } else {
    console.error('Upload failed:', await uploadRes.text());
  }
}

main().catch(console.error);
