/**
 * Comprehensive Test Suite for Correction Requests, Role Security, and System Features
 */
const http = require('http');

const request = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('--- STARTING VERIFICATION SUITE ---');

  // 1. Farmer Login
  console.log('\n[1] Testing Farmer Authentication...');
  const farmerLogin = await request('/api/auth/login', 'POST', {
    email: 'farmer@farmledger.com',
    password: 'password123',
  });
  if (farmerLogin.status !== 200 || !farmerLogin.data.token) {
    throw new Error(`Farmer login failed: ${JSON.stringify(farmerLogin)}`);
  }
  const farmerToken = farmerLogin.data.token;
  console.log('✓ Farmer Login Succeeded');

  // 2. Worker Login
  console.log('\n[2] Testing Worker Authentication...');
  const workerLogin = await request('/api/auth/login', 'POST', {
    email: 'ramesh@farmledger.com',
    password: 'password123',
  });
  if (workerLogin.status !== 200 || !workerLogin.data.token) {
    throw new Error(`Worker login failed: ${JSON.stringify(workerLogin)}`);
  }
  const workerToken = workerLogin.data.token;
  console.log('✓ Worker Login Succeeded');

  // 3. Role-Based Security Tests
  console.log('\n[3] Testing Role-Based Security Enforcement...');
  const workerTamperFarmer = await request('/api/farmer/corrections', 'GET', null, workerToken);
  console.log(`Worker calling Farmer Corrections: HTTP ${workerTamperFarmer.status}`);
  if (workerTamperFarmer.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Worker accessing Farmer API, got ${workerTamperFarmer.status}`);
  }
  console.log('✓ Worker blocked from Farmer API (403 Forbidden)');

  const farmerTamperWorker = await request('/api/worker/corrections', 'GET', null, farmerToken);
  console.log(`Farmer calling Worker Corrections: HTTP ${farmerTamperWorker.status}`);
  if (farmerTamperWorker.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Farmer accessing Worker API, got ${farmerTamperWorker.status}`);
  }
  console.log('✓ Farmer blocked from Worker API (403 Forbidden)');

  // 4. Worker Correction Request Creation
  console.log('\n[4] Testing Worker Correction Request Submission...');
  const todayStr = new Date().toISOString().split('T')[0];
  const newCorr = await request(
    '/api/worker/corrections',
    'POST',
    {
      requestType: 'attendance',
      targetDate: todayStr,
      requestedStatus: 'present',
      requestedHours: 8,
      reason: 'Shift was logged as absent but worked 8 hours on drip irrigation repair',
    },
    workerToken
  );
  if (newCorr.status !== 201 || !newCorr.data.correction) {
    throw new Error(`Failed to submit attendance correction: ${JSON.stringify(newCorr)}`);
  }
  const createdCorrectionId = newCorr.data.correction._id;
  console.log(`✓ Worker successfully submitted correction #${createdCorrectionId}`);

  // Test submitting salary correction
  const salaryCorr = await request(
    '/api/worker/corrections',
    'POST',
    {
      requestType: 'salary',
      targetDate: todayStr,
      currentAmount: 600,
      requestedAmount: 900,
      reason: 'Overtime 3 hours evening pesticide spraying',
    },
    workerToken
  );
  if (salaryCorr.status !== 201) {
    throw new Error(`Failed to submit salary correction: ${JSON.stringify(salaryCorr)}`);
  }
  console.log('✓ Worker successfully submitted salary correction');

  // 5. Worker List Corrections
  console.log('\n[5] Testing Worker Listing Own Corrections...');
  const workerList = await request('/api/worker/corrections', 'GET', null, workerToken);
  if (workerList.status !== 200 || !Array.isArray(workerList.data.corrections)) {
    throw new Error(`Failed to get worker corrections: ${JSON.stringify(workerList)}`);
  }
  console.log(`✓ Worker retrieved ${workerList.data.corrections.length} correction requests`);

  // 6. Farmer List and Summary
  console.log('\n[6] Testing Farmer Corrections API and Counts...');
  const farmerList = await request('/api/farmer/corrections', 'GET', null, farmerToken);
  if (farmerList.status !== 200 || !farmerList.data.counts) {
    throw new Error(`Farmer corrections list failed: ${JSON.stringify(farmerList)}`);
  }
  console.log(`✓ Farmer retrieved ${farmerList.data.corrections.length} total corrections`);
  console.log(`  Counts: Pending=${farmerList.data.counts.pending}, Approved=${farmerList.data.counts.approved}, Total=${farmerList.data.counts.total}`);

  // Verify dashboard summary includes pendingCorrectionsCount
  const farmerSummary = await request('/api/farmer/dashboard-summary', 'GET', null, farmerToken);
  if (farmerSummary.status !== 200 || typeof farmerSummary.data.summary.pendingCorrectionsCount !== 'number') {
    throw new Error(`pendingCorrectionsCount missing in farmer dashboard summary`);
  }
  console.log(`✓ Farmer dashboard summary includes pendingCorrectionsCount: ${farmerSummary.data.summary.pendingCorrectionsCount}`);

  // 7. Farmer Review: Approve
  console.log(`\n[7] Testing Farmer Approving Correction #${createdCorrectionId}...`);
  const approveRes = await request(
    `/api/farmer/corrections/${createdCorrectionId}`,
    'PUT',
    {
      status: 'approved',
      farmerRemarks: 'Approved after inspecting drip lines; wage adjusted.',
    },
    farmerToken
  );
  if (approveRes.status !== 200 || approveRes.data.correction.status !== 'approved') {
    throw new Error(`Failed to approve correction: ${JSON.stringify(approveRes)}`);
  }
  console.log(`✓ Farmer successfully approved correction. Updated status: ${approveRes.data.correction.status}`);

  // 8. Farmer Review: Reject
  const salaryCorrId = salaryCorr.data.correction._id;
  console.log(`\n[8] Testing Farmer Rejecting Correction #${salaryCorrId}...`);
  const rejectRes = await request(
    `/api/farmer/corrections/${salaryCorrId}`,
    'PUT',
    {
      status: 'rejected',
      farmerRemarks: 'Spraying was already factored into previous wage slip.',
    },
    farmerToken
  );
  if (rejectRes.status !== 200 || rejectRes.data.correction.status !== 'rejected') {
    throw new Error(`Failed to reject correction: ${JSON.stringify(rejectRes)}`);
  }
  console.log(`✓ Farmer successfully rejected correction with remarks: "${rejectRes.data.correction.farmerRemarks}"`);

  // 9. Existing Features Regression Check
  console.log('\n[9] Testing Existing Features (Crops, Sales Filters, Worker Totals)...');
  // Crop with dates
  const cropsRes = await request('/api/farmer/crops', 'GET', null, farmerToken);
  if (cropsRes.status !== 200 || cropsRes.data.crops.length === 0) {
    throw new Error(`Crops retrieval failed: ${JSON.stringify(cropsRes)}`);
  }
  console.log(`✓ Crops endpoint working (${cropsRes.data.crops.length} crops found, dates preserved)`);

  // Sales filtering
  const salesRes = await request('/api/farmer/sales?cropName=Wheat', 'GET', null, farmerToken);
  if (salesRes.status !== 200 || !Array.isArray(salesRes.data.sales)) {
    throw new Error(`Sales filter failed: ${JSON.stringify(salesRes)}`);
  }
  console.log(`✓ Sales filter endpoint working (${salesRes.data.sales.length} Wheat sales found)`);

  // Worker wage totals
  const workerSummaryRes = await request('/api/worker/dashboard-summary', 'GET', null, workerToken);
  if (workerSummaryRes.status !== 200 || typeof workerSummaryRes.data.metrics.totalEarned !== 'number') {
    throw new Error(`Worker summary failed: ${JSON.stringify(workerSummaryRes)}`);
  }
  console.log(`✓ Worker salary metrics intact: Earned=Rs ${workerSummaryRes.data.metrics.totalEarned}, Paid=Rs ${workerSummaryRes.data.metrics.totalReceived}, Pending=Rs ${workerSummaryRes.data.metrics.pendingWages}`);

  console.log('\n=============================================');
  console.log(' ALL VERIFICATION SUITE TESTS PASSED (100%)');
  console.log('=============================================');
};

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failure:', err);
  process.exit(1);
});
