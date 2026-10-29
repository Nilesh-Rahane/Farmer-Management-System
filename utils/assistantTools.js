const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const CropExpense = require('../models/CropExpense');
const CropSale = require('../models/CropSale');
const Crop = require('../models/Crop');

/**
 * =========================================================================
 * 1. MCP-COMPLIANT TOOL DEFINITIONS (Model Context Protocol JSONSchema)
 * =========================================================================
 * Standard MCP Tool Specification:
 * - name: unique tool identifier
 * - description: clear description for LLM reasoning
 * - inputSchema: JSON Schema for parameters
 */
const MCP_TOOL_DEFINITIONS = [
  {
    name: 'get_financial_budget_summary',
    description: 'Fetch the complete financial budget, revenue, total expenses, net profit/loss, profit margin, and cash flow balance for the authenticated farmer.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_crop_expenses',
    description: 'Fetch crop input expenses (seeds, fertilizers, pesticides, fuel, machinery, transport, irrigation, etc.) for the authenticated farmer. Can filter by crop name or category.',
    inputSchema: {
      type: 'object',
      properties: {
        cropName: {
          type: 'string',
          description: 'Optional crop name to filter by (e.g. कापूस, सोयाबीन, कांदा, ऊस, गहू, cotton, soybean, sugarcane)',
        },
        category: {
          type: 'string',
          description: 'Optional category (seeds, fertilizers, pesticides, irrigation, fuel, machinery, transport, other)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_worker_wages_and_dues',
    description: 'Fetch worker attendance, earned wages, paid wages, and pending unpaid dues. Can search for a specific worker by name or return workforce summary.',
    inputSchema: {
      type: 'object',
      properties: {
        workerName: {
          type: 'string',
          description: 'Optional worker name to check specific worker dues (e.g. प्रणव, आदित्य, संभाजी, Pranav, Aditya)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_crop_sales_and_income',
    description: 'Fetch harvest sales revenue, quantities sold, cash received, and pending payments from buyers/traders for the authenticated farmer.',
    inputSchema: {
      type: 'object',
      properties: {
        cropName: {
          type: 'string',
          description: 'Optional crop name to filter sales (e.g. कापूस, सोयाबीन, कांदा, ऊस, गहू)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_registered_crops',
    description: 'Fetch all crops currently cultivated or recorded in the farm with acreage, variety, season, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional status filter: active, harvested, planned',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_workers_directory',
    description: 'Fetch list of all farm workers registered under this farmer with contact details, daily wage rates, and specialization.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_recent_transactions',
    description: 'Fetch latest financial transactions across sales, expenses, and worker wage payments.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of recent transactions to return (default 6)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_farmer_profile',
    description: 'Fetch farmer details including farmer name, farm name, location, and total acreage.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * =========================================================================
 * 2. SECURE BACKEND TOOL IMPLEMENTATIONS (Strict Farmer-Wise Isolation)
 * =========================================================================
 */

async function getFinancialBudgetSummary(farmerId) {
  // 1. Sales revenue
  const salesAgg = await CropSale.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalRevenue' },
        totalReceived: { $sum: '$amountReceived' },
        salesCount: { $sum: 1 },
      },
    },
  ]);
  const totalRevenue = salesAgg[0]?.totalRevenue || 0;
  const totalReceived = salesAgg[0]?.totalReceived || 0;
  const pendingFromBuyers = Math.max(0, totalRevenue - totalReceived);

  // 2. Crop Expenses
  const expensesAgg = await CropExpense.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        expensesCount: { $sum: 1 },
      },
    },
  ]);
  const totalCropExpenses = expensesAgg[0]?.totalAmount || 0;

  // 3. Worker Wages Incurred (Earned via Attendance)
  const attendanceAgg = await Attendance.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalWagesEarned: { $sum: '$dailyWage' },
        totalDaysWorked: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] } },
      },
    },
  ]);
  const totalWagesIncurred = attendanceAgg[0]?.totalWagesEarned || 0;
  const totalDaysWorked = attendanceAgg[0]?.totalDaysWorked || 0;

  // 4. Worker Payments Actually Paid
  const paymentsAgg = await Payment.aggregate([
    { $match: { farmer: farmerId } },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$amount' },
        paymentsCount: { $sum: 1 },
      },
    },
  ]);
  const totalWagesPaid = paymentsAgg[0]?.totalPaid || 0;
  const pendingWorkerDues = Math.max(0, totalWagesIncurred - totalWagesPaid);

  // 5. Total Operating Expenses & Net Balance
  const totalOperationalExpenses = totalCropExpenses + totalWagesIncurred;
  const netProfitLoss = totalRevenue - totalOperationalExpenses;
  const profitMargin = totalRevenue > 0 ? Number(((netProfitLoss / totalRevenue) * 100).toFixed(1)) : 0;

  return {
    totalRevenue,
    totalReceived,
    pendingFromBuyers,
    totalCropExpenses,
    totalWagesIncurred,
    totalWagesPaid,
    pendingWorkerDues,
    totalDaysWorked,
    totalOperationalExpenses,
    netProfitLoss,
    profitMarginPercent: profitMargin,
    financialStatus: netProfitLoss >= 0 ? 'नफ्यात (Profitable)' : 'तोट्यात (In Loss)',
    currency: 'INR (₹)',
  };
}

async function getCropExpenses(farmerId, args = {}) {
  const match = { farmer: farmerId };

  if (args.cropName && args.cropName.trim()) {
    match.cropName = new RegExp(args.cropName.trim(), 'i');
  }

  if (args.category && args.category.trim()) {
    match.category = args.category.trim().toLowerCase();
  }

  const expenses = await CropExpense.find(match)
    .sort({ date: -1 })
    .limit(args.limit || 20)
    .lean();

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Category breakdown for this filter
  const categoryBreakdown = await CropExpense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Crop-wise breakdown
  const cropBreakdown = await CropExpense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$cropName',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return {
    totalExpenseAmount: totalAmount,
    recordsCount: expenses.length,
    categoryBreakdown: categoryBreakdown.map((c) => ({ category: c._id, amount: c.total, count: c.count })),
    cropBreakdown: cropBreakdown.map((c) => ({ cropName: c._id, amount: c.total, count: c.count })),
    recentExpenses: expenses.map((e) => ({
      cropName: e.cropName,
      category: e.category,
      amount: e.amount,
      date: e.date,
      description: e.description,
      vendor: e.vendor,
      paymentMode: e.paymentMode,
    })),
  };
}

async function getWorkerWagesAndDues(farmerId, args = {}) {
  const workerFilter = { farmerId, role: 'worker' };

  if (args.workerName && args.workerName.trim()) {
    workerFilter.name = new RegExp(args.workerName.trim(), 'i');
  }

  const workers = await User.find(workerFilter).lean();

  const workerDetails = await Promise.all(
    workers.map(async (worker) => {
      const attData = await Attendance.aggregate([
        { $match: { worker: worker._id, farmer: farmerId } },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: '$dailyWage' },
            daysWorked: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] } },
            overtimeCount: { $sum: { $cond: [{ $eq: ['$status', 'overtime'] }, 1, 0] } },
          },
        },
      ]);

      const payData = await Payment.aggregate([
        { $match: { worker: worker._id, farmer: farmerId } },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
            lastPaymentDate: { $max: '$date' },
          },
        },
      ]);

      const totalEarned = attData[0]?.totalEarned || 0;
      const totalPaid = payData[0]?.totalPaid || 0;
      const pendingWages = totalEarned - totalPaid;

      return {
        workerId: worker._id,
        name: worker.name,
        phone: worker.phone,
        dailyWageRate: worker.dailyWageRate,
        specialization: worker.specialization,
        status: worker.status,
        daysWorked: attData[0]?.daysWorked || 0,
        totalEarnedWages: totalEarned,
        totalPaidWages: totalPaid,
        pendingDues: pendingWages,
        lastPaymentDate: payData[0]?.lastPaymentDate || null,
      };
    })
  );

  const totalWorkforcePending = workerDetails.reduce((sum, w) => sum + Math.max(0, w.pendingDues), 0);
  const totalWorkforceEarned = workerDetails.reduce((sum, w) => sum + w.totalEarnedWages, 0);
  const totalWorkforcePaid = workerDetails.reduce((sum, w) => sum + w.totalPaidWages, 0);

  return {
    workersCount: workerDetails.length,
    totalWorkforceEarned,
    totalWorkforcePaid,
    totalWorkforcePending,
    workers: workerDetails,
  };
}

async function getCropSalesAndIncome(farmerId, args = {}) {
  const match = { farmer: farmerId };

  if (args.cropName && args.cropName.trim()) {
    match.cropName = new RegExp(args.cropName.trim(), 'i');
  }

  const sales = await CropSale.find(match).sort({ saleDate: -1 }).limit(20).lean();

  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
  const totalReceived = sales.reduce((sum, s) => sum + (s.amountReceived || 0), 0);
  const pendingFromBuyers = Math.max(0, totalRevenue - totalReceived);

  const cropSummary = await CropSale.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$cropName',
        totalRevenue: { $sum: '$totalRevenue' },
        totalReceived: { $sum: '$amountReceived' },
        totalQuantity: { $sum: '$quantity' },
        unit: { $first: '$unit' },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return {
    totalSalesRevenue: totalRevenue,
    totalCashReceived: totalReceived,
    pendingFromBuyers,
    salesCount: sales.length,
    cropSummary: cropSummary.map((c) => ({
      cropName: c._id,
      revenue: c.totalRevenue,
      received: c.totalReceived,
      quantity: c.totalQuantity,
      unit: c.unit,
    })),
    recentSales: sales.map((s) => ({
      cropName: s.cropName,
      variety: s.variety,
      quantity: s.quantity,
      unit: s.unit,
      unitPrice: s.unitPrice,
      totalRevenue: s.totalRevenue,
      amountReceived: s.amountReceived,
      buyerName: s.buyerName,
      saleDate: s.saleDate,
      paymentStatus: s.paymentStatus,
    })),
  };
}

async function getRegisteredCrops(farmerId, args = {}) {
  const match = { farmer: farmerId };
  if (args.status) match.status = args.status;

  const crops = await Crop.find(match).sort({ acreage: -1 }).lean();

  return {
    cropsCount: crops.length,
    crops: crops.map((c) => ({
      cropName: c.cropName,
      variety: c.variety,
      season: c.season,
      acreage: c.acreage,
      sowingDate: c.sowingDate,
      expectedHarvestDate: c.expectedHarvestDate,
      expectedYield: c.expectedYield,
      yieldUnit: c.yieldUnit,
      status: c.status,
    })),
  };
}

async function getWorkersDirectory(farmerId) {
  const workers = await User.find({ farmerId, role: 'worker' }).select('-password').lean();

  return {
    count: workers.length,
    workers: workers.map((w) => ({
      id: w._id,
      name: w.name,
      phone: w.phone,
      dailyWageRate: w.dailyWageRate,
      specialization: w.specialization,
      status: w.status,
    })),
  };
}

async function getRecentTransactions(farmerId, args = {}) {
  const limit = args.limit || 6;

  const [sales, expenses, payments] = await Promise.all([
    CropSale.find({ farmer: farmerId }).sort({ saleDate: -1 }).limit(limit).lean(),
    CropExpense.find({ farmer: farmerId }).sort({ date: -1 }).limit(limit).lean(),
    Payment.find({ farmer: farmerId }).populate('worker', 'name').sort({ date: -1 }).limit(limit).lean(),
  ]);

  const transactions = [
    ...sales.map((s) => ({
      type: 'sale',
      title: `शेतमाल विक्री: ${s.cropName}`,
      amount: s.totalRevenue,
      date: s.saleDate,
      details: `${s.quantity} ${s.unit} - ${s.buyerName || 'Mandi'}`,
    })),
    ...expenses.map((e) => ({
      type: 'expense',
      title: `खर्च: ${e.category}`,
      amount: e.amount,
      date: e.date,
      details: `${e.cropName} - ${e.description || e.vendor || ''}`,
    })),
    ...payments.map((p) => ({
      type: 'payment',
      title: `मजुरी भरणा: ${p.worker?.name || 'कामगार'}`,
      amount: p.amount,
      date: p.date,
      details: `Paid via ${p.paymentMode}`,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  return {
    transactions,
  };
}

async function getFarmerProfile(farmerId) {
  const farmer = await User.findById(farmerId).select('-password').lean();
  if (!farmer) return { error: 'Farmer profile not found' };

  return {
    name: farmer.name,
    email: farmer.email,
    phone: farmer.phone,
    farmName: farmer.farmName || 'My Farm',
    farmLocation: farmer.farmLocation || 'Maharashtra, India',
    farmSizeAcres: farmer.farmSizeAcres || 0,
    role: farmer.role,
  };
}

/**
 * Dispatch tool execution by name with farmer-wise isolation
 */
async function executeTool(toolName, args, farmerId) {
  switch (toolName) {
    case 'get_financial_budget_summary':
      return await getFinancialBudgetSummary(farmerId);

    case 'get_crop_expenses':
      return await getCropExpenses(farmerId, args);

    case 'get_worker_wages_and_dues':
      return await getWorkerWagesAndDues(farmerId, args);

    case 'get_crop_sales_and_income':
      return await getCropSalesAndIncome(farmerId, args);

    case 'get_registered_crops':
      return await getRegisteredCrops(farmerId, args);

    case 'get_workers_directory':
      return await getWorkersDirectory(farmerId);

    case 'get_recent_transactions':
      return await getRecentTransactions(farmerId, args);

    case 'get_farmer_profile':
      return await getFarmerProfile(farmerId);

    default:
      return { error: `Unknown tool name: ${toolName}` };
  }
}

module.exports = {
  MCP_TOOL_DEFINITIONS,
  executeTool,
  getFinancialBudgetSummary,
  getCropExpenses,
  getWorkerWagesAndDues,
  getCropSalesAndIncome,
  getRegisteredCrops,
  getWorkersDirectory,
  getRecentTransactions,
  getFarmerProfile,
};
