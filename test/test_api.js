/**
 * Automated End-to-End API Test Suite for Farm Ledger
 */

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE FARM LEDGER TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    try {
      await fn();
      console.log(`  ${desc}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${desc}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  // 1. Health Check
  await assert('1. Health check endpoint returns status online', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'online') {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  });

  // 2. Database Seeder
  await assert('2. Seed demo data endpoint populates MongoDB collections', async () => {
    const res = await fetch(`${BASE_URL}/api/seed`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Seeding failed: ${JSON.stringify(data)}`);
    }
    if (data.details.workerCount < 4) {
      throw new Error(`Expected at least 4 workers, got ${data.details.workerCount}`);
    }
  });

  // 3. Farmer Login
  let farmerToken = '';
  let farmerUser = null;
  await assert('3. Farmer authentication succeeds and returns JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farmer@farmledger.com',
        password: 'password123',
        expectedRole: 'farmer',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.token || data.user.role !== 'farmer') {
      throw new Error(`Farmer login failed: ${JSON.stringify(data)}`);
    }
    farmerToken = data.token;
    farmerUser = data.user;
  });

  // 4. Worker Login
  let workerToken = '';
  let workerUser = null;
  await assert('4. Worker authentication succeeds and returns JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ramesh@farmledger.com',
        password: 'password123',
        expectedRole: 'worker',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.token || data.user.role !== 'worker') {
      throw new Error(`Worker login failed: ${JSON.stringify(data)}`);
    }
    workerToken = data.token;
    workerUser = data.user;
  });

  // 5. Farmer Dashboard Summary
  await assert('5. Farmer dashboard summary returns calculated KPIs, trends, and charts', async () => {
    const res = await fetch(`${BASE_URL}/api/farmer/dashboard-summary`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Failed to fetch summary: ${JSON.stringify(data)}`);
    }
    if (data.summary.totalRevenue <= 0 || data.summary.totalCropExpenses <= 0) {
      throw new Error(`Invalid revenue or expense calculations: ${JSON.stringify(data.summary)}`);
    }
    if (!data.charts.monthlyTrends || data.charts.monthlyTrends.length === 0) {
      throw new Error('Monthly trends chart data missing');
    }
  });

  // 6. Security Check: Worker cannot access Farmer endpoint
  await assert('6. Security RBAC prevents Worker from accessing Farmer endpoint (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/farmer/dashboard-summary`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    }
  });

  // 7. Security Check: Farmer cannot access Worker endpoint
  await assert('7. Security RBAC prevents Farmer from accessing Worker endpoint (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/worker/dashboard-summary`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    }
  });

  // 8. Farmer creates new Worker
  let createdWorkerId = '';
  await assert('8. Farmer creates a new worker with credentials and daily wage', async () => {
    const testWorkerEmail = `testworker_${Date.now()}@farmledger.com`;
    const res = await fetch(`${BASE_URL}/api/farmer/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Karan Sharma',
        email: testWorkerEmail,
        password: 'password123',
        phone: '+91 99999 88888',
        dailyWageRate: 650,
        specialization: 'Greenhouse Climate Specialist',
        status: 'active',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Failed to create worker: ${JSON.stringify(data)}`);
    }
    createdWorkerId = data.worker._id;
  });

  // 9. Instant Reflection Test:
  // Farmer logs attendance for Ramesh -> Ramesh's dashboard immediately reflects the new earned wage!
  await assert('9. Farmer marks attendance -> Worker dashboard instantly updates earned wages', async () => {
    // 1. Check Ramesh's balance before
    const beforeRes = await fetch(`${BASE_URL}/api/worker/dashboard-summary`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const beforeData = await beforeRes.json();
    const initialEarned = beforeData.metrics.totalEarned;
    const initialPending = beforeData.metrics.pendingWages;

    // 2. Farmer marks an overtime attendance for Ramesh (Wage Rate 600 -> Overtime: 600 + 2*(75)*1.5 = 825)
    const attRes = await fetch(`${BASE_URL}/api/farmer/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        workerId: workerUser.id,
        date: new Date().toISOString(),
        status: 'overtime',
        hoursWorked: 10,
        customWageRate: 600,
        cropField: 'Wheat Block A',
        activity: 'Night Threshing Run',
        notes: 'Urgent harvest shift',
      }),
    });
    const attData = await attRes.json();
    if (!attRes.ok) throw new Error(`Mark attendance failed: ${JSON.stringify(attData)}`);

    const addedWage = attData.attendance.dailyWage;

    // 3. Check Ramesh's balance after
    const afterRes = await fetch(`${BASE_URL}/api/worker/dashboard-summary`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const afterData = await afterRes.json();
    const finalEarned = afterData.metrics.totalEarned;
    const finalPending = afterData.metrics.pendingWages;

    if (finalEarned !== initialEarned + addedWage) {
      throw new Error(`Expected earned ${initialEarned + addedWage}, got ${finalEarned}`);
    }
    if (finalPending !== initialPending + addedWage) {
      throw new Error(`Expected pending ${initialPending + addedWage}, got ${finalPending}`);
    }
  });

  // 10. Instant Reflection Test:
  // Farmer disburses payment to Ramesh -> Ramesh's dashboard immediately reflects the payment and reduced pending dues!
  await assert('10. Farmer records wage payout -> Worker dashboard instantly reflects payment received', async () => {
    // 1. Check Ramesh's balance before payment
    const beforeRes = await fetch(`${BASE_URL}/api/worker/dashboard-summary`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const beforeData = await beforeRes.json();
    const initialReceived = beforeData.metrics.totalReceived;
    const initialPending = beforeData.metrics.pendingWages;

    // 2. Farmer pays 1500 to Ramesh
    const payRes = await fetch(`${BASE_URL}/api/farmer/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        workerId: workerUser.id,
        amount: 1500,
        date: new Date().toISOString(),
        paymentMode: 'upi',
        referenceNumber: 'UPI/TEST990011',
        notes: 'Instant wage disbursement test',
      }),
    });
    const payData = await payRes.json();
    if (!payRes.ok) throw new Error(`Record payment failed: ${JSON.stringify(payData)}`);

    // 3. Check Ramesh's balance after payment
    const afterRes = await fetch(`${BASE_URL}/api/worker/dashboard-summary`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const afterData = await afterRes.json();
    const finalReceived = afterData.metrics.totalReceived;
    const finalPending = afterData.metrics.pendingWages;

    if (finalReceived !== initialReceived + 1500) {
      throw new Error(`Expected received ${initialReceived + 1500}, got ${finalReceived}`);
    }
    if (finalPending !== initialPending - 1500) {
      throw new Error(`Expected pending ${initialPending - 1500}, got ${finalPending}`);
    }
  });

  // 11. Farmer Crop Expense Logging
  await assert('11. Farmer logs crop expense and verifies in expenses list', async () => {
    const res = await fetch(`${BASE_URL}/api/farmer/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        cropName: 'Sugarcane Plot',
        category: 'fertilizers',
        amount: 8500,
        date: new Date().toISOString(),
        vendor: 'Agro Supply Co',
        description: 'Potash and micronutrients',
        paymentMode: 'bank_transfer',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Failed to log expense: ${JSON.stringify(data)}`);
    }
  });

  // 12. Farmer Crop Sale Logging
  await assert('12. Farmer logs crop sale and verifies revenue calculation', async () => {
    const res = await fetch(`${BASE_URL}/api/farmer/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        cropName: 'Organic Mustard',
        variety: 'High Oil Content',
        quantity: 20,
        unit: 'quintal',
        unitPrice: 5200,
        buyerName: 'Karnal Oil Extraction Mill',
        buyerContact: '+91 98989 77777',
        paymentStatus: 'received',
        amountReceived: 104000,
        notes: 'Full payment received',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success || data.sale.totalRevenue !== 104000) {
      throw new Error(`Failed to log crop sale: ${JSON.stringify(data)}`);
    }
  });

  // 13. Unified Ledger Audit
  await assert('13. Unified ledger aggregates sales, expenses, and wage payouts chronologically', async () => {
    const res = await fetch(`${BASE_URL}/api/farmer/transactions`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success || data.transactions.length === 0) {
      throw new Error(`Failed to fetch ledger transactions: ${JSON.stringify(data)}`);
    }
    const hasRevenue = data.transactions.some((t) => t.isCredit);
    const hasExpense = data.transactions.some((t) => !t.isCredit);
    if (!hasRevenue || !hasExpense) {
      throw new Error('Ledger should contain both credits and debits');
    }
  });

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
