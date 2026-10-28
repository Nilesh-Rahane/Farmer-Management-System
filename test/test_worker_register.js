/**
 * Test Worker Portal Self-Registration Flow
 */

const BASE_URL = 'http://localhost:5000';

async function testWorkerRegistration() {
  console.log('Testing Worker Portal Registration...');

  // 1. Fetch Farms List
  const farmsRes = await fetch(`${BASE_URL}/api/auth/farms`);
  const farmsData = await farmsRes.json();
  console.log('Farms Available:', farmsData.farms?.length || 0);

  const targetFarmerId = farmsData.farms?.[0]?._id || null;

  // 2. Register as Worker
  const workerEmail = `worker_test_${Date.now()}@farmledger.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pranav Shinde',
      email: workerEmail,
      password: 'password123',
      phone: '+91 98220 12345',
      role: 'worker',
      farmerId: targetFarmerId,
      specialization: 'Tractor Operator & Field Irrigation',
      dailyWageRate: 550,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Worker registration failed: ${JSON.stringify(regData)}`);
  }
  console.log(' Worker registered successfully:', regData.user.name, 'Role:', regData.user.role);

  // 3. Worker Dashboard Access with the issued token
  const dashRes = await fetch(`${BASE_URL}/api/worker/dashboard-summary`, {
    headers: { Authorization: `Bearer ${regData.token}` },
  });
  const dashData = await dashRes.json();
  if (!dashRes.ok || !dashData.success) {
    throw new Error(`Worker dashboard summary failed: ${JSON.stringify(dashData)}`);
  }
  console.log(' Worker Dashboard verified for:', dashData.worker.name);
  console.log(' Farm Assigned:', dashData.farmInfo?.farmName || 'Independent');

  // 4. Verify login using credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: workerEmail,
      password: 'password123',
      expectedRole: 'worker',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    throw new Error(`Worker login failed: ${JSON.stringify(loginData)}`);
  }
  console.log(' Worker Login verified successfully!');
  console.log('\n ALL WORKER REGISTRATION TESTS PASSED!\n');
}

testWorkerRegistration().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
