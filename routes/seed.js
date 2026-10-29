const express = require('express');
const router = express.Router();
const seedData = require('../utils/seeder');
const seedNileshData = require('../utils/seedNilesh');

// POST or GET /api/seed/nilesh - Seed data specifically for nileshrahane8@gmail.com in MongoDB Atlas
router.all('/nilesh', async (req, res) => {
  try {
    const result = await seedNileshData();
    res.json({
      success: true,
      message: 'MongoDB Atlas cloud database populated successfully for Nilesh Rahane!',
      database: 'MongoDB Atlas (cluster0.odkvojr.mongodb.net / farm_ledger)',
      details: {
        farmerEmail: result.farmer.email,
        workerCount: result.workers.length,
        cropsCount: result.cropsCount,
        attendanceCount: result.attendanceCount,
        paymentCount: result.paymentCount,
        expenseCount: result.expenseCount,
        saleCount: result.saleCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error executing seed process for Nilesh Rahane',
    });
  }
});

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

