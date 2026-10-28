const express = require('express');
const router = express.Router();
const seedData = require('../utils/seeder');

// POST /api/seed - Trigger database re-seed
router.post('/', async (req, res) => {
  try {
    const result = await seedData();
    res.json({
      success: true,
      message: 'Database seeded successfully with realistic demo data!',
      details: {
        farmerEmail: result.farmer.email,
        workerCount: result.workers.length,
        attendanceCount: result.attendanceCount,
        paymentCount: result.paymentCount,
        expenseCount: result.expenseCount,
        saleCount: result.saleCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error executing seed process',
    });
  }
});

module.exports = router;
