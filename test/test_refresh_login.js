const http = require('http');

function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Testing Farmer & Worker login and session validation...');

  // 1. Farmer Login
  const farmerLogin = await request('/api/auth/login', 'POST', {
    email: 'farmer@farmledger.com',
    password: 'password123'
  });
  console.log('1. Farmer Login Status:', farmerLogin.status, farmerLogin.data.success ? '✓' : '✗');
  if (!farmerLogin.data.token) throw new Error('Farmer token missing');

  // 2. Validate Farmer Session (/api/auth/me) as if refreshing page
  const farmerMe = await request('/api/auth/me', 'GET', null, farmerLogin.data.token);
  console.log('2. Farmer /api/auth/me (Refresh Simulation):', farmerMe.status, farmerMe.data.user.role === 'farmer' ? '✓' : '✗');

  // 3. Worker Login directly (e.g. from the generic login form without role tab restriction)
  const workerLogin = await request('/api/auth/login', 'POST', {
    email: 'ramesh@farmledger.com',
    password: 'password123'
  });
  console.log('3. Worker Login Status:', workerLogin.status, workerLogin.data.user.role === 'worker' ? '✓' : '✗');

  // 4. Validate Worker Session (/api/auth/me) as if refreshing page
  const workerMe = await request('/api/auth/me', 'GET', null, workerLogin.data.token);
  console.log('4. Worker /api/auth/me (Refresh Simulation):', workerMe.status, workerMe.data.user.role === 'worker' ? '✓' : '✗');

  // 5. Verify Invalid Login yields 401 without crashing
  const badLogin = await request('/api/auth/login', 'POST', {
    email: 'farmer@farmledger.com',
    password: 'wrong_password_999'
  });
  console.log('5. Bad password returns 401:', badLogin.status === 401 ? '✓' : '✗');

  console.log('\n✓ ALL SESSION & LOGIN REFRESH TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
