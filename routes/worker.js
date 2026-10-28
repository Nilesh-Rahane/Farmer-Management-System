const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const CorrectionRequest = require('../models/CorrectionRequest');
const { protect } = require('../middleware/auth');
const { requireWorker } = require('../middleware/roles');

// Apply protection & Worker role check to all routes in this router
router.use(protect, requireWorker);

// ==========================================
// 1. WORKER DASHBOARD SUMMARY
// ==========================================
router.get('/dashboard-summary', async (req, res) => {
  try {
    const workerId = req.user._id;

    // Get Farmer/Farm info
    let farmInfo = null;
    if (req.user.farmerId) {
      const farmer = await User.findById(req.user.farmerId).select(
        'name farmName farmLocation phone email'
      );
      if (farmer) {
        farmInfo = {
          farmerName: farmer.name,
          farmName: farmer.farmName || 'Farm Ledger',
          farmLocation: farmer.farmLocation || 'Farm Location',
          farmerPhone: farmer.phone || '',
          farmerEmail: farmer.email || '',
        };
      }
    }

    // 1. Worker's Attendance & Earnings Calculation
    const attendanceAgg = await Attendance.aggregate([
      { $match: { worker: workerId } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$dailyWage' },
          totalWorkdays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] },
          },
          presentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] },
          },
          overtimeDays: {
            $sum: { $cond: [{ $eq: ['$status', 'overtime'] }, 1, 0] },
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
          },
          totalHours: { $sum: '$hoursWorked' },
        },
      },
    ]);

    const totalEarned = attendanceAgg[0]?.totalEarned || 0;
    const totalWorkdays = attendanceAgg[0]?.totalWorkdays || 0;
    const presentDays = attendanceAgg[0]?.presentDays || 0;
    const halfDays = attendanceAgg[0]?.halfDays || 0;
    const overtimeDays = attendanceAgg[0]?.overtimeDays || 0;
    const absentDays = attendanceAgg[0]?.absentDays || 0;
    const totalHours = attendanceAgg[0]?.totalHours || 0;

    // 2. Worker's Payment Receipts Calculation
    const paymentsAgg = await Payment.aggregate([
      { $match: { worker: workerId } },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          lastPaymentDate: { $max: '$date' },
        },
      },
    ]);

    const totalReceived = paymentsAgg[0]?.totalReceived || 0;
    const paymentCount = paymentsAgg[0]?.paymentCount || 0;
    const lastPaymentDate = paymentsAgg[0]?.lastPaymentDate || null;

    // 3. Outstanding / Pending Balance
    // Farmer-side changes to attendance or payments instantly affect this number!
    const pendingWages = Math.max(0, totalEarned - totalReceived);

    // 4. Recent Attendance records (Last 7)
    const recentAttendance = await Attendance.find({ worker: workerId })
      .sort({ date: -1 })
      .limit(7)
      .lean();

    // 5. Recent Payments received (Last 5)
    const recentPayments = await Payment.find({ worker: workerId })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // 6. Monthly earnings trend for this worker (Past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyEarnings = await Attendance.aggregate([
      { $match: { worker: workerId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          earned: { $sum: '$dailyWage' },
          days: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 0, 1] } },
        },
      },
    ]);

    const monthlyPayments = await Payment.aggregate([
      { $match: { worker: workerId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          paid: { $sum: '$amount' },
        },
      },
    ]);

    const monthsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthsMap[key] = { key, label, earned: 0, received: 0, days: 0 };
    }

    monthlyEarnings.forEach((item) => {
      if (monthsMap[item._id]) {
        monthsMap[item._id].earned = item.earned;
        monthsMap[item._id].days = item.days;
      }
    });

    monthlyPayments.forEach((item) => {
      if (monthsMap[item._id]) {
        monthsMap[item._id].received = item.paid;
      }
    });

    res.json({
      success: true,
      worker: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        specialization: req.user.specialization,
        dailyWageRate: req.user.dailyWageRate,
      },
      farmInfo,
      metrics: {
        totalEarned,
        totalReceived,
        pendingWages,
        totalWorkdays,
        presentDays,
        halfDays,
        overtimeDays,
        absentDays,
        totalHours,
        paymentCount,
        lastPaymentDate,
      },
      recentAttendance,
      recentPayments,
      monthlyTrends: Object.values(monthsMap),
    });
  } catch (error) {
    console.error('Worker dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching worker dashboard summary',
    });
  }
});

// ==========================================
// 2. WORKER ATTENDANCE HISTORY
// ==========================================
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    // Strictly isolate to current worker
    const query = { worker: req.user._id };

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

    const attendanceRecords = await Attendance.find(query).sort({ date: -1, createdAt: -1 });

    const totalEarnedInFilter = attendanceRecords.reduce((sum, a) => sum + a.dailyWage, 0);
    const daysWorkedInFilter = attendanceRecords.filter((a) => a.status !== 'absent').length;

    res.json({
      success: true,
      count: attendanceRecords.length,
      daysWorked: daysWorkedInFilter,
      totalEarned: totalEarnedInFilter,
      attendance: attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching attendance records',
    });
  }
});

// ==========================================
// 3. WORKER PAYMENT RECEIPTS & HISTORY
// ==========================================
router.get('/payments', async (req, res) => {
  try {
    const { startDate, endDate, paymentMode } = req.query;
    // Strictly isolate to current worker
    const query = { worker: req.user._id };

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

    const payments = await Payment.find(query).sort({ date: -1, createdAt: -1 });

    const totalPaidInFilter = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      count: payments.length,
      totalPaid: totalPaidInFilter,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payment records',
    });
  }
});

// ==========================================
// 4. WORKER CORRECTION REQUESTS
// ==========================================

// GET /api/worker/corrections - List all correction requests submitted by worker
router.get('/corrections', async (req, res) => {
  try {
    const { status } = req.query;
    const query = { worker: req.user._id };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const corrections = await CorrectionRequest.find(query)
      .populate('attendanceId', 'date status hoursWorked dailyWage cropField activity')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: corrections.length,
      corrections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching correction requests',
    });
  }
});

// POST /api/worker/corrections - Submit a new correction request
router.post('/corrections', async (req, res) => {
  try {
    const {
      requestType,
      targetDate,
      attendanceId,
      currentStatus,
      requestedStatus,
      currentHours,
      requestedHours,
      currentAmount,
      requestedAmount,
      reason,
    } = req.body;

    if (!req.user.farmerId) {
      return res.status(400).json({
        success: false,
        message: 'You are not assigned to a farm owner yet. Cannot submit correction request.',
      });
    }

    if (!requestType || !['attendance', 'salary'].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid request type is required (attendance or salary)',
      });
    }

    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message: 'Target date is required',
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason explaining the correction request',
      });
    }

    if (requestType === 'attendance' && !requestedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Requested attendance status is required (present, half_day, overtime, absent)',
      });
    }

    const correction = await CorrectionRequest.create({
      worker: req.user._id,
      farmer: req.user.farmerId,
      requestType,
      targetDate: new Date(targetDate),
      attendanceId: attendanceId || null,
      currentStatus: currentStatus || '',
      requestedStatus: requestedStatus || '',
      currentHours: currentHours !== undefined ? Number(currentHours) : 0,
      requestedHours: requestedHours !== undefined ? Number(requestedHours) : 8,
      currentAmount: currentAmount !== undefined ? Number(currentAmount) : 0,
      requestedAmount: requestedAmount !== undefined ? Number(requestedAmount) : 0,
      reason: reason.trim(),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Correction request submitted successfully. Waiting for farmer review.',
      correction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting correction request',
    });
  }
});

module.exports = router;
