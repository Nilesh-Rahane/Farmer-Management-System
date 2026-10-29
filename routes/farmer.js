const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const CropExpense = require('../models/CropExpense');
const CropSale = require('../models/CropSale');
const Crop = require('../models/Crop');
const CorrectionRequest = require('../models/CorrectionRequest');
const { protect } = require('../middleware/auth');
const { requireFarmer } = require('../middleware/roles');

// Apply protection & Farmer role check to all routes in this router
router.use(protect, requireFarmer);

// ==========================================
// 1. DASHBOARD SUMMARY & ANALYTICS
// ==========================================
router.get('/dashboard-summary', async (req, res) => {
  try {
    const farmerId = req.user._id;

    // 1. Crop Sales Revenue
    const salesAgg = await CropSale.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRevenue' },
          totalReceived: { $sum: '$amountReceived' },
          count: { $sum: 1 },
        },
      },
    ]);
    const totalRevenue = salesAgg[0]?.totalRevenue || 0;
    const totalRevenueReceived = salesAgg[0]?.totalReceived || 0;

    // 2. Crop Expenses (Inputs, fuel, etc.)
    const expensesAgg = await CropExpense.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
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

    // 4. Worker Wages Actually Paid
    const paymentsAgg = await Payment.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    const totalWagesPaid = paymentsAgg[0]?.totalPaid || 0;

    // 5. Worker Pending Balance
    const pendingWorkerDues = Math.max(0, totalWagesIncurred - totalWagesPaid);

    // 6. Net Profit/Loss (Total Revenue - (Crop Expenses + Wages Incurred))
    const totalOperationalExpenses = totalCropExpenses + totalWagesIncurred;
    const netProfitLoss = totalRevenue - totalOperationalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfitLoss / totalRevenue) * 100).toFixed(1) : 0;

    // 7. Active Worker Count
    const activeWorkersCount = await User.countDocuments({
      farmerId,
      role: 'worker',
      status: 'active',
    });

    // 8. Expense Breakdown by Category
    const categoryBreakdown = await CropExpense.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Add Wages as an expense category for comprehensive picture
    const fullExpenseCategories = [
      ...categoryBreakdown.map((item) => ({
        category: item._id,
        total: item.total,
        count: item.count,
      })),
      {
        category: 'worker_wages',
        total: totalWagesIncurred,
        count: attendanceAgg[0]?.totalDaysWorked || 0,
      },
    ];

    // 9. Crop Sales Breakdown by Crop Name
    const cropSalesBreakdown = await CropSale.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: '$cropName',
          totalRevenue: { $sum: '$totalRevenue' },
          totalQuantity: { $sum: '$quantity' },
          unit: { $first: '$unit' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // 10. Monthly Financial Trend (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await CropSale.aggregate([
      { $match: { farmer: farmerId, saleDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          revenue: { $sum: '$totalRevenue' },
        },
      },
    ]);

    const monthlyExpenses = await CropExpense.aggregate([
      { $match: { farmer: farmerId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          expense: { $sum: '$amount' },
        },
      },
    ]);

    const monthlyWages = await Attendance.aggregate([
      { $match: { farmer: farmerId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          wages: { $sum: '$dailyWage' },
        },
      },
    ]);

    // Generate month keys
    const monthsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthsMap[key] = { key, label, revenue: 0, expenses: 0, profit: 0 };
    }

    monthlySales.forEach((item) => {
      if (monthsMap[item._id]) monthsMap[item._id].revenue = item.revenue;
    });

    monthlyExpenses.forEach((item) => {
      if (monthsMap[item._id]) monthsMap[item._id].expenses += item.expense;
    });

    monthlyWages.forEach((item) => {
      if (monthsMap[item._id]) monthsMap[item._id].expenses += item.wages;
    });

    const monthlyTrends = Object.values(monthsMap).map((m) => ({
      ...m,
      profit: m.revenue - m.expenses,
    }));

    // 11. Recent Activity Feed (Latest 6 items across sales, expenses, payments)
    const recentSales = await CropSale.find({ farmer: farmerId })
      .sort({ saleDate: -1 })
      .limit(4)
      .lean();
    const recentExpenses = await CropExpense.find({ farmer: farmerId })
      .sort({ date: -1 })
      .limit(4)
      .lean();
    const recentPayments = await Payment.find({ farmer: farmerId })
      .populate('worker', 'name')
      .sort({ date: -1 })
      .limit(4)
      .lean();

    const recentActivity = [
      ...recentSales.map((s) => ({
        type: 'sale',
        title: `Crop Sale: ${s.cropName}`,
        amount: s.totalRevenue,
        date: s.saleDate,
        details: `${s.quantity} ${s.unit} to ${s.buyerName || 'Buyer'}`,
        isPositive: true,
      })),
      ...recentExpenses.map((e) => ({
        type: 'expense',
        title: `Expense: ${e.category.toUpperCase()}`,
        amount: e.amount,
        date: e.date,
        details: `${e.cropName} - ${e.description || e.vendor || 'Farm input'}`,
        isPositive: false,
      })),
      ...recentPayments.map((p) => ({
        type: 'payment',
        title: `Wage Payout: ${p.worker ? p.worker.name : 'Worker'}`,
        amount: p.amount,
        date: p.date,
        details: `Paid via ${p.paymentMode.toUpperCase()}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`,
        isPositive: false,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    // Pending worker attendance/salary correction requests
    const pendingCorrectionsCount = await CorrectionRequest.countDocuments({
      farmer: farmerId,
      status: 'pending',
    });

    res.json({
      success: true,
      summary: {
        totalRevenue,
        totalRevenueReceived,
        totalCropExpenses,
        totalWagesIncurred,
        totalWagesPaid,
        totalOperationalExpenses,
        netProfitLoss,
        profitMargin,
        pendingWorkerDues,
        activeWorkersCount,
        pendingCorrectionsCount,
      },
      charts: {
        monthlyTrends,
        categoryBreakdown: fullExpenseCategories,
        cropSalesBreakdown,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Farmer dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating dashboard summary',
    });
  }
});

// ==========================================
// 2. WORKER MANAGEMENT
// ==========================================

// GET /api/farmer/workers - List all workers for this farmer with financial balance
router.get('/workers', async (req, res) => {
  try {
    const farmerId = req.user._id;

    const workers = await User.find({ farmerId, role: 'worker' })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate balances for each worker
    const workerStats = await Promise.all(
      workers.map(async (worker) => {
        // Total attendance days & earned wages
        const attendanceData = await Attendance.aggregate([
          { $match: { worker: worker._id } },
          {
            $group: {
              _id: null,
              totalEarned: { $sum: '$dailyWage' },
              totalDaysWorked: {
                $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] },
              },
              overtimeCount: {
                $sum: { $cond: [{ $eq: ['$status', 'overtime'] }, 1, 0] },
              },
            },
          },
        ]);

        // Total payments received
        const paymentData = await Payment.aggregate([
          { $match: { worker: worker._id } },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: '$amount' },
              lastPaymentDate: { $max: '$date' },
            },
          },
        ]);

        const totalEarned = attendanceData[0]?.totalEarned || 0;
        const totalPaid = paymentData[0]?.totalPaid || 0;
        const pendingWages = totalEarned - totalPaid;

        return {
          ...worker,
          totalEarned,
          totalPaid,
          pendingWages,
          daysWorked: attendanceData[0]?.totalDaysWorked || 0,
          overtimeDays: attendanceData[0]?.overtimeCount || 0,
          lastPaymentDate: paymentData[0]?.lastPaymentDate || null,
        };
      })
    );

    const workforceSummary = workerStats.reduce(
      (acc, w) => {
        acc.totalAttendance += w.daysWorked || 0;
        acc.totalSalaryEarned += w.totalEarned || 0;
        acc.totalAmountPaid += w.totalPaid || 0;
        acc.totalPendingSalary += w.pendingWages || 0;
        return acc;
      },
      {
        totalAttendance: 0,
        totalSalaryEarned: 0,
        totalAmountPaid: 0,
        totalPendingSalary: 0,
      }
    );

    res.json({
      success: true,
      count: workerStats.length,
      workforceSummary,
      workers: workerStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching workers',
    });
  }
});

// POST /api/farmer/workers - Add new worker
router.post('/workers', async (req, res) => {
  try {
    const { name, email, password, phone, dailyWageRate, specialization, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const worker = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'worker',
      farmerId: req.user._id,
      phone: phone ? phone.trim() : '',
      dailyWageRate: dailyWageRate ? Number(dailyWageRate) : 500,
      specialization: specialization ? specialization.trim() : 'General Labor',
      status: status || 'active',
    });

    res.status(201).json({
      success: true,
      message: `Worker "${worker.name}" added successfully`,
      worker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating worker',
    });
  }
});

// PUT /api/farmer/workers/:id - Update worker
router.put('/workers/:id', async (req, res) => {
  try {
    const worker = await User.findOne({
      _id: req.params.id,
      farmerId: req.user._id,
      role: 'worker',
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found or does not belong to your farm',
      });
    }

    const { name, phone, dailyWageRate, specialization, status, password } = req.body;

    if (name) worker.name = name.trim();
    if (phone !== undefined) worker.phone = phone.trim();
    if (dailyWageRate !== undefined) worker.dailyWageRate = Number(dailyWageRate);
    if (specialization) worker.specialization = specialization.trim();
    if (status) worker.status = status;
    if (password && password.trim().length >= 6) {
      worker.password = password.trim();
    }

    await worker.save();

    res.json({
      success: true,
      message: 'Worker details updated successfully',
      worker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating worker',
    });
  }
});

// DELETE /api/farmer/workers/:id - Remove or deactivate worker
router.delete('/workers/:id', async (req, res) => {
  try {
    const worker = await User.findOne({
      _id: req.params.id,
      farmerId: req.user._id,
      role: 'worker',
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found',
      });
    }

    // Check if worker has existing attendance or payment records
    const attendanceCount = await Attendance.countDocuments({ worker: worker._id });
    const paymentCount = await Payment.countDocuments({ worker: worker._id });

    if (attendanceCount > 0 || paymentCount > 0) {
      // Deactivate instead of hard delete to preserve financial history integrity
      worker.status = 'inactive';
      await worker.save();
      return res.json({
        success: true,
        message: 'Worker marked as inactive to preserve financial and attendance ledger history',
        deactivated: true,
      });
    }

    await User.findByIdAndDelete(worker._id);

    res.json({
      success: true,
      message: 'Worker deleted successfully',
      deleted: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting worker',
    });
  }
});

// ==========================================
// 2.5 CROP MANAGEMENT (Crop Records with Date)
// ==========================================

// GET /api/farmer/crops - List all crop records with date filtering & summaries
router.get('/crops', async (req, res) => {
  try {
    const { status, season, search, startDate, endDate } = req.query;
    const query = { farmer: req.user._id };

    if (status) {
      query.status = status;
    }
    if (season) {
      query.season = season;
    }
    if (search) {
      query.$or = [
        { cropName: new RegExp(search, 'i') },
        { variety: new RegExp(search, 'i') },
        { fieldLocation: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') },
      ];
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const crops = await Crop.find(query).sort({ date: -1, createdAt: -1 });

    const totalArea = crops.reduce((sum, c) => sum + (c.areaAcres || 0), 0);
    const activeCrops = crops.filter((c) =>
      ['planned', 'sown', 'growing', 'harvesting'].includes(c.status)
    ).length;

    res.json({
      success: true,
      count: crops.length,
      summary: {
        totalCrops: crops.length,
        activeCrops,
        totalAreaAcres: Math.round(totalArea * 10) / 10,
      },
      crops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching crop records',
    });
  }
});

// POST /api/farmer/crops - Create crop record with date field saved in MongoDB
router.post('/crops', async (req, res) => {
  try {
    const {
      cropName,
      variety,
      season,
      areaAcres,
      date,
      sowingDate,
      expectedHarvestDate,
      actualHarvestDate,
      status,
      estimatedYieldQuintals,
      fieldLocation,
      notes,
    } = req.body;

    if (!cropName || !cropName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Crop name is required (e.g. Wheat, Sugarcane, Cotton)',
      });
    }

    const cropRecordDate = date ? new Date(date) : (sowingDate ? new Date(sowingDate) : new Date());

    const crop = await Crop.create({
      farmer: req.user._id,
      cropName: cropName.trim(),
      variety: variety ? variety.trim() : '',
      season: season || 'kharif',
      areaAcres: Number(areaAcres) >= 0 ? Number(areaAcres) : 1,
      date: cropRecordDate,
      sowingDate: cropRecordDate,
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
      actualHarvestDate: actualHarvestDate ? new Date(actualHarvestDate) : null,
      status: status || 'growing',
      estimatedYieldQuintals: Number(estimatedYieldQuintals) || 0,
      fieldLocation: fieldLocation ? fieldLocation.trim() : 'Main Field',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Crop record added successfully to MongoDB with date field',
      crop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating crop record',
    });
  }
});

// PUT /api/farmer/crops/:id - Update crop record
router.put('/crops/:id', async (req, res) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, farmer: req.user._id });
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found or does not belong to your farm',
      });
    }

    const {
      cropName,
      variety,
      season,
      areaAcres,
      date,
      sowingDate,
      expectedHarvestDate,
      actualHarvestDate,
      status,
      estimatedYieldQuintals,
      fieldLocation,
      notes,
    } = req.body;

    if (cropName) crop.cropName = cropName.trim();
    if (variety !== undefined) crop.variety = variety.trim();
    if (season) crop.season = season;
    if (areaAcres !== undefined) crop.areaAcres = Number(areaAcres);
    if (date) {
      crop.date = new Date(date);
      crop.sowingDate = new Date(date);
    } else if (sowingDate) {
      crop.date = new Date(sowingDate);
      crop.sowingDate = new Date(sowingDate);
    }
    if (expectedHarvestDate !== undefined) {
      crop.expectedHarvestDate = expectedHarvestDate ? new Date(expectedHarvestDate) : null;
    }
    if (actualHarvestDate !== undefined) {
      crop.actualHarvestDate = actualHarvestDate ? new Date(actualHarvestDate) : null;
    }
    if (status) crop.status = status;
    if (estimatedYieldQuintals !== undefined) crop.estimatedYieldQuintals = Number(estimatedYieldQuintals);
    if (fieldLocation !== undefined) crop.fieldLocation = fieldLocation.trim();
    if (notes !== undefined) crop.notes = notes.trim();

    await crop.save();

    res.json({
      success: true,
      message: 'Crop record updated successfully',
      crop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating crop record',
    });
  }
});

// DELETE /api/farmer/crops/:id - Remove crop record
router.delete('/crops/:id', async (req, res) => {
  try {
    const crop = await Crop.findOneAndDelete({ _id: req.params.id, farmer: req.user._id });
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    res.json({
      success: true,
      message: 'Crop record deleted successfully',
      crop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting crop record',
    });
  }
});

// ==========================================
// 3. ATTENDANCE & WORKDAYS
// ==========================================

// GET /api/farmer/attendance - List attendance records with filters
router.get('/attendance', async (req, res) => {
  try {
    const { workerId, startDate, endDate, status } = req.query;
    const query = { farmer: req.user._id };

    if (workerId && mongoose.Types.ObjectId.isValid(workerId)) {
      query.worker = workerId;
    }

    if (status && ['present', 'half_day', 'absent', 'overtime'].includes(status)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('worker', 'name email phone dailyWageRate specialization')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: attendanceRecords.length,
      attendance: attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching attendance',
    });
  }
});

// POST /api/farmer/attendance - Mark attendance (Single or Batch)
router.post('/attendance', async (req, res) => {
  try {
    const { workerId, date, status, hoursWorked, customWageRate, cropField, activity, notes } = req.body;

    if (!workerId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Worker, date, and attendance status are required',
      });
    }

    // Verify worker belongs to this farmer
    const worker = await User.findOne({
      _id: workerId,
      farmerId: req.user._id,
      role: 'worker',
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found or not assigned to your farm',
      });
    }

    const wageRate = customWageRate !== undefined && customWageRate !== ''
      ? Number(customWageRate)
      : worker.dailyWageRate || 500;

    // Calculate dailyWage based on status
    let calculatedWage = 0;
    let actualHours = hoursWorked !== undefined ? Number(hoursWorked) : 8;

    if (status === 'present') {
      calculatedWage = wageRate;
      actualHours = actualHours || 8;
    } else if (status === 'half_day') {
      calculatedWage = Math.round((wageRate * 0.5) * 100) / 100;
      actualHours = 4;
    } else if (status === 'overtime') {
      // Overtime: default 1.5x wage or wageRate + extra hours
      const overtimeHours = actualHours > 8 ? actualHours - 8 : 2;
      const hourlyRate = wageRate / 8;
      calculatedWage = Math.round((wageRate + overtimeHours * hourlyRate * 1.5) * 100) / 100;
      actualHours = actualHours || 10;
    } else if (status === 'absent') {
      calculatedWage = 0;
      actualHours = 0;
    }

    // Format date to normalize time
    const attendanceDate = new Date(date);

    // Create record
    const attendance = await Attendance.create({
      worker: worker._id,
      farmer: req.user._id,
      date: attendanceDate,
      status,
      hoursWorked: actualHours,
      wageRate,
      dailyWage: calculatedWage,
      cropField: cropField ? cropField.trim() : 'General Farm',
      activity: activity ? activity.trim() : 'Farm Labor',
      notes: notes ? notes.trim() : '',
    });

    const populated = await Attendance.findById(attendance._id).populate(
      'worker',
      'name email phone specialization dailyWageRate'
    );

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${worker.name}`,
      attendance: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording attendance',
    });
  }
});

// PUT /api/farmer/attendance/:id - Update attendance record
router.put('/attendance/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    const { status, hoursWorked, wageRate, cropField, activity, notes, date } = req.body;

    if (date) attendance.date = new Date(date);
    if (status) attendance.status = status;
    if (cropField !== undefined) attendance.cropField = cropField.trim();
    if (activity !== undefined) attendance.activity = activity.trim();
    if (notes !== undefined) attendance.notes = notes.trim();

    const rate = wageRate !== undefined ? Number(wageRate) : attendance.wageRate;
    attendance.wageRate = rate;

    const actualStatus = status || attendance.status;
    let hours = hoursWorked !== undefined ? Number(hoursWorked) : attendance.hoursWorked;

    if (actualStatus === 'present') {
      attendance.dailyWage = rate;
      attendance.hoursWorked = hours || 8;
    } else if (actualStatus === 'half_day') {
      attendance.dailyWage = Math.round(rate * 0.5 * 100) / 100;
      attendance.hoursWorked = 4;
    } else if (actualStatus === 'overtime') {
      const extra = hours > 8 ? hours - 8 : 2;
      attendance.dailyWage = Math.round((rate + extra * (rate / 8) * 1.5) * 100) / 100;
      attendance.hoursWorked = hours || 10;
    } else if (actualStatus === 'absent') {
      attendance.dailyWage = 0;
      attendance.hoursWorked = 0;
    }

    await attendance.save();

    const updated = await Attendance.findById(attendance._id).populate(
      'worker',
      'name email phone specialization'
    );

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      attendance: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating attendance record',
    });
  }
});

// DELETE /api/farmer/attendance/:id
router.delete('/attendance/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting attendance record',
    });
  }
});

// ==========================================
// 4. WAGE PAYMENTS & DISBURSEMENTS
// ==========================================

// GET /api/farmer/payments - List payments
router.get('/payments', async (req, res) => {
  try {
    const { workerId, startDate, endDate, paymentMode } = req.query;
    const query = { farmer: req.user._id };

    if (workerId && mongoose.Types.ObjectId.isValid(workerId)) {
      query.worker = workerId;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const payments = await Payment.find(query)
      .populate('worker', 'name email phone dailyWageRate specialization')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payment records',
    });
  }
});

// POST /api/farmer/payments - Record new payment disbursement
router.post('/payments', async (req, res) => {
  try {
    const { workerId, amount, date, paymentMode, referenceNumber, notes } = req.body;

    if (!workerId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Worker and amount are required',
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero',
      });
    }

    const worker = await User.findOne({
      _id: workerId,
      farmerId: req.user._id,
      role: 'worker',
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found or not assigned to your farm',
      });
    }

    const payment = await Payment.create({
      worker: worker._id,
      farmer: req.user._id,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      paymentMode: paymentMode || 'cash',
      referenceNumber: referenceNumber ? referenceNumber.trim() : '',
      notes: notes ? notes.trim() : '',
    });

    const populated = await Payment.findById(payment._id).populate(
      'worker',
      'name email phone specialization'
    );

    res.status(201).json({
      success: true,
      message: `Payment of ₹${amount} recorded for ${worker.name}`,
      payment: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording payment',
    });
  }
});

// DELETE /api/farmer/payments/:id
router.delete('/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    res.json({
      success: true,
      message: 'Payment record deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting payment record',
    });
  }
});

// ==========================================
// 5. CROP EXPENSES
// ==========================================

// GET /api/farmer/expenses - List crop expenses
router.get('/expenses', async (req, res) => {
  try {
    const { category, cropName, startDate, endDate, search } = req.query;
    const query = { farmer: req.user._id };

    if (category) {
      query.category = category;
    }

    if (cropName) {
      query.cropName = new RegExp(cropName, 'i');
    }

    if (search) {
      query.$or = [
        { cropName: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await CropExpense.find(query).sort({ date: -1, createdAt: -1 });

    const totalAgg = await CropExpense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      count: expenses.length,
      totalAmount: totalAgg[0]?.total || 0,
      expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expenses',
    });
  }
});

// POST /api/farmer/expenses - Create crop expense
router.post('/expenses', async (req, res) => {
  try {
    const { cropName, category, amount, date, vendor, description, paymentMode } = req.body;

    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Category and amount are required',
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount must be greater than zero',
      });
    }

    const expense = await CropExpense.create({
      farmer: req.user._id,
      cropName: cropName ? cropName.trim() : 'General Farm',
      category,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      vendor: vendor ? vendor.trim() : '',
      description: description ? description.trim() : '',
      paymentMode: paymentMode || 'cash',
    });

    res.status(201).json({
      success: true,
      message: `Expense of ₹${amount} recorded for ${expense.category}`,
      expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating expense record',
    });
  }
});

// PUT /api/farmer/expenses/:id
router.put('/expenses/:id', async (req, res) => {
  try {
    const expense = await CropExpense.findOne({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found',
      });
    }

    const { cropName, category, amount, date, vendor, description, paymentMode } = req.body;

    if (cropName !== undefined) expense.cropName = cropName.trim();
    if (category) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount);
    if (date) expense.date = new Date(date);
    if (vendor !== undefined) expense.vendor = vendor.trim();
    if (description !== undefined) expense.description = description.trim();
    if (paymentMode) expense.paymentMode = paymentMode;

    await expense.save();

    res.json({
      success: true,
      message: 'Expense record updated successfully',
      expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating expense record',
    });
  }
});

// DELETE /api/farmer/expenses/:id
router.delete('/expenses/:id', async (req, res) => {
  try {
    const expense = await CropExpense.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found',
      });
    }

    res.json({
      success: true,
      message: 'Expense record deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting expense record',
    });
  }
});

// ==========================================
// 6. CROP SALES & REVENUE
// ==========================================

// GET /api/farmer/sales - List crop sales with date range, crop, buyer, search & status filters
router.get('/sales', async (req, res) => {
  try {
    const { cropName, buyerName, paymentStatus, startDate, endDate, search } = req.query;
    const query = { farmer: req.user._id };

    if (cropName && cropName.trim()) {
      query.cropName = new RegExp(cropName.trim(), 'i');
    }

    if (buyerName && buyerName.trim()) {
      query.buyerName = new RegExp(buyerName.trim(), 'i');
    }

    if (paymentStatus && paymentStatus.trim()) {
      query.paymentStatus = paymentStatus.trim();
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { cropName: new RegExp(s, 'i') },
        { variety: new RegExp(s, 'i') },
        { buyerName: new RegExp(s, 'i') },
        { notes: new RegExp(s, 'i') },
      ];
    }

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    const sales = await CropSale.find(query).sort({ saleDate: -1, createdAt: -1 });

    const revenueAgg = await CropSale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRevenue' },
          totalReceived: { $sum: '$amountReceived' },
        },
      },
    ]);

    // Retrieve unique crops and buyers for populating filter dropdowns
    const allFarmerSales = await CropSale.find({ farmer: req.user._id })
      .select('cropName buyerName')
      .lean();
    const uniqueCrops = [
      ...new Set(allFarmerSales.map((s) => s.cropName).filter(Boolean)),
    ].sort();
    const uniqueBuyers = [
      ...new Set(allFarmerSales.map((s) => s.buyerName).filter(Boolean)),
    ].sort();

    res.json({
      success: true,
      count: sales.length,
      totalRevenue: revenueAgg[0]?.totalRevenue || 0,
      totalReceived: revenueAgg[0]?.totalReceived || 0,
      uniqueCrops,
      uniqueBuyers,
      sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching crop sales',
    });
  }
});

// POST /api/farmer/sales - Record crop sale
router.post('/sales', async (req, res) => {
  try {
    const {
      cropName,
      variety,
      harvestDate,
      saleDate,
      quantity,
      unit,
      unitPrice,
      buyerName,
      buyerContact,
      paymentStatus,
      amountReceived,
      notes,
    } = req.body;

    if (!cropName || !quantity || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Crop name, quantity, and unit price are required',
      });
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const calculatedRevenue = Math.round(qty * price * 100) / 100;

    let received = amountReceived !== undefined ? Number(amountReceived) : 0;
    if (paymentStatus === 'received' && received === 0) {
      received = calculatedRevenue;
    }

    const sale = await CropSale.create({
      farmer: req.user._id,
      cropName: cropName.trim(),
      variety: variety ? variety.trim() : '',
      harvestDate: harvestDate ? new Date(harvestDate) : null,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      quantity: qty,
      unit: unit || 'quintal',
      unitPrice: price,
      totalRevenue: calculatedRevenue,
      buyerName: buyerName ? buyerName.trim() : 'Local APMC Mandi',
      buyerContact: buyerContact ? buyerContact.trim() : '',
      paymentStatus: paymentStatus || 'received',
      amountReceived: received,
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: `Sale of ${cropName} recorded (Revenue: ₹${sale.totalRevenue})`,
      sale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording crop sale',
    });
  }
});

// PUT /api/farmer/sales/:id
router.put('/sales/:id', async (req, res) => {
  try {
    const sale = await CropSale.findOne({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found',
      });
    }

    const {
      cropName,
      variety,
      harvestDate,
      saleDate,
      quantity,
      unit,
      unitPrice,
      buyerName,
      buyerContact,
      paymentStatus,
      amountReceived,
      notes,
    } = req.body;

    if (cropName) sale.cropName = cropName.trim();
    if (variety !== undefined) sale.variety = variety.trim();
    if (harvestDate !== undefined) sale.harvestDate = harvestDate ? new Date(harvestDate) : null;
    if (saleDate) sale.saleDate = new Date(saleDate);
    if (quantity !== undefined) sale.quantity = Number(quantity);
    if (unit) sale.unit = unit;
    if (unitPrice !== undefined) sale.unitPrice = Number(unitPrice);
    if (buyerName !== undefined) sale.buyerName = buyerName.trim();
    if (buyerContact !== undefined) sale.buyerContact = buyerContact.trim();
    if (paymentStatus) sale.paymentStatus = paymentStatus;
    if (notes !== undefined) sale.notes = notes.trim();

    sale.totalRevenue = Math.round(sale.quantity * sale.unitPrice * 100) / 100;
    if (amountReceived !== undefined) {
      sale.amountReceived = Number(amountReceived);
    } else if (sale.paymentStatus === 'received') {
      sale.amountReceived = sale.totalRevenue;
    }

    await sale.save();

    res.json({
      success: true,
      message: 'Sale record updated successfully',
      sale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating crop sale',
    });
  }
});

// DELETE /api/farmer/sales/:id
router.delete('/sales/:id', async (req, res) => {
  try {
    const sale = await CropSale.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found',
      });
    }

    res.json({
      success: true,
      message: 'Sale record deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting sale record',
    });
  }
});

// ==========================================
// 7. UNIFIED TRANSACTION HISTORY / LEDGER
// ==========================================
router.get('/transactions', async (req, res) => {
  try {
    const { type, startDate, endDate, search } = req.query;
    const farmerId = req.user._id;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    let allTransactions = [];

    // 1. Sales (Credit / Revenue)
    if (!type || type === 'all' || type === 'revenue' || type === 'sale') {
      const salesQuery = { farmer: farmerId };
      if (startDate || endDate) salesQuery.saleDate = dateFilter;

      const sales = await CropSale.find(salesQuery).lean();
      sales.forEach((s) => {
        allTransactions.push({
          id: s._id,
          date: s.saleDate,
          type: 'revenue',
          category: 'Crop Sale',
          title: `${s.cropName} Sale`,
          party: s.buyerName || 'Buyer',
          description: `${s.quantity} ${s.unit} @ ₹${s.unitPrice}/${s.unit}`,
          amount: s.totalRevenue,
          status: s.paymentStatus,
          isCredit: true,
          badgeColor: 'success',
        });
      });
    }

    // 2. Crop Expenses (Debit)
    if (!type || type === 'all' || type === 'expense') {
      const expenseQuery = { farmer: farmerId };
      if (startDate || endDate) expenseQuery.date = dateFilter;

      const expenses = await CropExpense.find(expenseQuery).lean();
      expenses.forEach((e) => {
        allTransactions.push({
          id: e._id,
          date: e.date,
          type: 'expense',
          category: e.category.charAt(0).toUpperCase() + e.category.slice(1),
          title: `Crop Expense: ${e.category}`,
          party: e.vendor || e.cropName,
          description: `${e.cropName}${e.description ? ` - ${e.description}` : ''}`,
          amount: e.amount,
          status: 'paid',
          isCredit: false,
          badgeColor: 'danger',
        });
      });
    }

    // 3. Wage Disbursements (Debit)
    if (!type || type === 'all' || type === 'wage' || type === 'payment') {
      const paymentQuery = { farmer: farmerId };
      if (startDate || endDate) paymentQuery.date = dateFilter;

      const payments = await Payment.find(paymentQuery)
        .populate('worker', 'name')
        .lean();
      payments.forEach((p) => {
        allTransactions.push({
          id: p._id,
          date: p.date,
          type: 'wage_payout',
          category: 'Worker Wage',
          title: `Wage Payout`,
          party: p.worker ? p.worker.name : 'Worker',
          description: `Disbursed via ${p.paymentMode.toUpperCase()}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}`,
          amount: p.amount,
          status: 'completed',
          isCredit: false,
          badgeColor: 'warning',
        });
      });
    }

    // Filter by text search if present
    if (search) {
      const sLower = search.toLowerCase();
      allTransactions = allTransactions.filter(
        (t) =>
          t.title.toLowerCase().includes(sLower) ||
          t.party.toLowerCase().includes(sLower) ||
          t.category.toLowerCase().includes(sLower) ||
          t.description.toLowerCase().includes(sLower)
      );
    }

    // Sort chronologically descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate totals for the filtered set
    let totalCredits = 0;
    let totalDebits = 0;
    allTransactions.forEach((t) => {
      if (t.isCredit) totalCredits += t.amount;
      else totalDebits += t.amount;
    });

    res.json({
      success: true,
      count: allTransactions.length,
      totalCredits,
      totalDebits,
      netCashFlow: totalCredits - totalDebits,
      transactions: allTransactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching transactions',
    });
  }
});

// ==========================================
// 8. FINANCIAL & PRODUCTION REPORTS
// ==========================================
router.get('/reports', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const farmerId = req.user._id;

    let rangeStart = new Date(2020, 0, 1);
    let rangeEnd = new Date(2099, 11, 31);

    if (startDate || endDate) {
      if (startDate) rangeStart = new Date(startDate);
      if (endDate) {
        rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);
      }
    } else if (period === '7days') {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 7);
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (period === '30days') {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 30);
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (period === 'season' || period === 'quarter') {
      rangeStart = new Date();
      rangeStart.setMonth(rangeStart.getMonth() - 4);
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
      rangeStart = new Date();
      rangeStart.setFullYear(rangeStart.getFullYear() - 1);
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      // Default: All time including future projected/advance records
      rangeStart = new Date(2020, 0, 1);
      rangeEnd = new Date(2099, 11, 31);
    }

    const dateQuery = { $gte: rangeStart, $lte: rangeEnd };

    // 1. Sales in period
    const sales = await CropSale.find({ farmer: farmerId, saleDate: dateQuery }).sort({
      saleDate: 1,
    });
    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0);

    // 2. Crop Expenses in period
    const expenses = await CropExpense.find({ farmer: farmerId, date: dateQuery }).sort({
      date: 1,
    });
    const totalCropExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Worker Attendance in period (Wages earned)
    const attendance = await Attendance.find({ farmer: farmerId, date: dateQuery }).populate(
      'worker',
      'name specialization'
    );
    const totalWagesIncurred = attendance.reduce((sum, a) => sum + a.dailyWage, 0);

    // 4. Payments disbursed in period
    const payments = await Payment.find({ farmer: farmerId, date: dateQuery }).populate(
      'worker',
      'name'
    );
    const totalWagesPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // 5. Net Profit
    const netProfit = totalSalesRevenue - (totalCropExpenses + totalWagesIncurred);

    // 6. Summary breakdown by crops
    const cropSummary = {};
    sales.forEach((s) => {
      if (!cropSummary[s.cropName]) {
        cropSummary[s.cropName] = { cropName: s.cropName, revenue: 0, quantity: 0, unit: s.unit };
      }
      cropSummary[s.cropName].revenue += s.totalRevenue;
      cropSummary[s.cropName].quantity += s.quantity;
    });

    // 7. Expense breakdown by category
    const expenseSummary = {};
    expenses.forEach((e) => {
      if (!expenseSummary[e.category]) expenseSummary[e.category] = 0;
      expenseSummary[e.category] += e.amount;
    });

    res.json({
      success: true,
      period: period || 'custom',
      dateRange: { start: rangeStart, end: rangeEnd },
      metrics: {
        totalSalesRevenue,
        totalCropExpenses,
        totalWagesIncurred,
        totalWagesPaid,
        totalCost: totalCropExpenses + totalWagesIncurred,
        netProfit,
        profitMargin: totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100).toFixed(1) : 0,
        salesCount: sales.length,
        expenseCount: expenses.length,
        workdaysCount: attendance.length,
      },
      cropSummary: Object.values(cropSummary),
      expenseSummary,
      sales,
      expenses,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating reports',
    });
  }
});

// ==========================================
// 8. WORKER CORRECTION REQUESTS MANAGEMENT
// ==========================================

// GET /api/farmer/corrections - List all worker correction requests
router.get('/corrections', async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { status, workerId, requestType } = req.query;

    const query = { farmer: farmerId };

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    if (workerId) {
      query.worker = workerId;
    }

    if (requestType && ['attendance', 'salary'].includes(requestType)) {
      query.requestType = requestType;
    }

    const corrections = await CorrectionRequest.find(query)
      .populate('worker', 'name email phone specialization dailyWageRate')
      .populate('attendanceId', 'date status hoursWorked dailyWage cropField activity')
      .sort({ createdAt: -1 });

    const [total, pending, approved, rejected] = await Promise.all([
      CorrectionRequest.countDocuments({ farmer: farmerId }),
      CorrectionRequest.countDocuments({ farmer: farmerId, status: 'pending' }),
      CorrectionRequest.countDocuments({ farmer: farmerId, status: 'approved' }),
      CorrectionRequest.countDocuments({ farmer: farmerId, status: 'rejected' }),
    ]);

    res.json({
      success: true,
      counts: { total, pending, approved, rejected },
      corrections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching worker correction requests',
    });
  }
});

// PUT /api/farmer/corrections/:id - Approve or Reject correction request
router.put('/corrections/:id', async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { status, farmerRemarks } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"',
      });
    }

    const correction = await CorrectionRequest.findOne({
      _id: req.params.id,
      farmer: farmerId,
    });

    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction request not found',
      });
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This correction request has already been ${correction.status}`,
      });
    }

    // Process approval logic
    if (status === 'approved') {
      const worker = await User.findById(correction.worker);
      const wageRate = worker?.dailyWageRate || 500;

      if (correction.requestType === 'attendance') {
        const reqStatus = correction.requestedStatus || 'present';
        const reqHours = Number(correction.requestedHours) || 8;

        let calculatedWage = wageRate;
        let actualHours = reqHours;

        if (reqStatus === 'present') {
          calculatedWage = wageRate;
          actualHours = reqHours || 8;
        } else if (reqStatus === 'half_day') {
          calculatedWage = Math.round(wageRate * 0.5 * 100) / 100;
          actualHours = 4;
        } else if (reqStatus === 'overtime') {
          const overtimeHours = reqHours > 8 ? reqHours - 8 : 2;
          const hourlyRate = wageRate / 8;
          calculatedWage = Math.round((wageRate + overtimeHours * hourlyRate * 1.5) * 100) / 100;
          actualHours = reqHours || 10;
        } else if (reqStatus === 'absent') {
          calculatedWage = 0;
          actualHours = 0;
        }

        if (correction.attendanceId) {
          await Attendance.findByIdAndUpdate(correction.attendanceId, {
            status: reqStatus,
            hoursWorked: actualHours,
            dailyWage: calculatedWage,
            notes: `Updated via approved correction request: ${correction.reason}`,
          });
        } else {
          // Check if an attendance record already exists for that date
          const startOfDay = new Date(correction.targetDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(correction.targetDate);
          endOfDay.setHours(23, 59, 59, 999);

          const existingAtt = await Attendance.findOne({
            worker: correction.worker,
            farmer: farmerId,
            date: { $gte: startOfDay, $lte: endOfDay },
          });

          if (existingAtt) {
            existingAtt.status = reqStatus;
            existingAtt.hoursWorked = actualHours;
            existingAtt.dailyWage = calculatedWage;
            existingAtt.notes = `Updated via approved correction: ${correction.reason}`;
            await existingAtt.save();
            correction.attendanceId = existingAtt._id;
          } else {
            const newAtt = await Attendance.create({
              worker: correction.worker,
              farmer: farmerId,
              date: correction.targetDate,
              status: reqStatus,
              hoursWorked: actualHours,
              wageRate,
              dailyWage: calculatedWage,
              cropField: 'General Farm',
              activity: 'Field Labor (Correction Approved)',
              notes: `Created via approved correction: ${correction.reason}`,
            });
            correction.attendanceId = newAtt._id;
          }
        }
      } else if (correction.requestType === 'salary') {
        // Discrepancy resolution: if requested amount exceeds recorded, create a payment record
        const diff = Number(correction.requestedAmount) - Number(correction.currentAmount);
        if (diff > 0) {
          await Payment.create({
            worker: correction.worker,
            farmer: farmerId,
            amount: diff,
            date: new Date(),
            paymentMode: 'cash',
            notes: `Correction settlement: ${correction.reason}`,
          });
        }
      }
    }

    correction.status = status;
    correction.farmerRemarks = farmerRemarks ? farmerRemarks.trim() : '';
    correction.reviewedAt = new Date();
    await correction.save();

    const populated = await CorrectionRequest.findById(correction._id)
      .populate('worker', 'name email phone specialization dailyWageRate')
      .populate('attendanceId');

    res.json({
      success: true,
      message: `Correction request has been ${status} successfully`,
      correction: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error reviewing correction request',
    });
  }
});

// ==========================================
// 10. MARATHI AI FARMER ASSISTANT (LLM with Tool Calling & Rule-based Fallback)
// ==========================================
const { processAssistantQuery } = require('../utils/llmAssistant');
const { getFarmerDatabaseContext } = require('../utils/marathiAssistant');

// POST /api/farmer/assistant/query - Process natural language Marathi voice/text question
router.post('/assistant/query', async (req, res) => {
  try {
    const { query } = req.body;
    const farmerId = req.user._id;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'कृपया आपला प्रश्न विचारणे आवश्यक आहे.',
      });
    }

    const result = await processAssistantQuery(farmerId, query, req.user);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Marathi AI Assistant query error:', error);
    res.status(500).json({
      success: false,
      message: 'मदतनीस प्रक्रियेमध्ये त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
      error: error.message,
    });
  }
});

// GET /api/farmer/assistant/context - Retrieve fresh financial database context
router.get('/assistant/context', async (req, res) => {
  try {
    const farmerId = req.user._id;
    const context = await getFarmerDatabaseContext(farmerId);
    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error('Marathi AI Assistant context error:', error);
    res.status(500).json({
      success: false,
      message: 'डेटाबेस माहिती लोड करता आली नाही.',
      error: error.message,
    });
  }
});

module.exports = router;
