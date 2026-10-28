require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const CropExpense = require('../models/CropExpense');
const CropSale = require('../models/CropSale');
const Crop = require('../models/Crop');

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farm_ledger';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
      console.log(' Connected to MongoDB for seeding');
    }

    // Clear existing records
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Payment.deleteMany({});
    await CropExpense.deleteMany({});
    await CropSale.deleteMany({});
    await Crop.deleteMany({});

    console.log(' Cleaned previous database collections');

    // 1. Create Farmer
    const farmer = await User.create({
      name: 'Rajesh Verma (Farmer)',
      email: 'farmer@farmledger.com',
      password: 'password123',
      role: 'farmer',
      phone: '+91 98765 43210',
      farmName: 'Green Acres Agri Estate',
      farmLocation: 'Karnal, Haryana',
      farmSizeAcres: 45,
      status: 'active',
    });

    console.log(` Created Farmer: ${farmer.email}`);

    // 2. Create Workers assigned to this farmer
    const workersData = [
      {
        name: 'Ramesh Kumar',
        email: 'ramesh@farmledger.com',
        password: 'password123',
        role: 'worker',
        farmerId: farmer._id,
        phone: '+91 98123 00001',
        dailyWageRate: 600,
        specialization: 'Tractor & Machinery Operator',
        status: 'active',
      },
      {
        name: 'Suresh Patel',
        email: 'suresh@farmledger.com',
        password: 'password123',
        role: 'worker',
        farmerId: farmer._id,
        phone: '+91 98123 00002',
        dailyWageRate: 500,
        specialization: 'Crop Harvesting & Sowing',
        status: 'active',
      },
      {
        name: 'Anita Devi',
        email: 'anita@farmledger.com',
        password: 'password123',
        role: 'worker',
        farmerId: farmer._id,
        phone: '+91 98123 00003',
        dailyWageRate: 550,
        specialization: 'Polyhouse & Horticulture',
        status: 'active',
      },
      {
        name: 'Manoj Singh',
        email: 'manoj@farmledger.com',
        password: 'password123',
        role: 'worker',
        farmerId: farmer._id,
        phone: '+91 98123 00004',
        dailyWageRate: 480,
        specialization: 'Drip Irrigation & Soil Care',
        status: 'active',
      },
    ];

    const workers = await User.create(workersData);
    console.log(` Created ${workers.length} Workers`);

    // 3. Generate Attendance Records over the past 20 days
    const attendanceRecords = [];
    const activities = [
      { field: 'Wheat Block A', task: 'Soil Tilling & Seed Drilling' },
      { field: 'Basmati Paddy Field', task: 'Transplanting & Canal Watering' },
      { field: 'Tomato Polyhouse', task: 'Pruning & Organic Spraying' },
      { field: 'Cotton Section 3', task: 'Fertilizer Top Dressing' },
      { field: 'Storage & Silo', task: 'Harvest Loading & Packing' },
    ];

    const today = new Date();
    for (let dayOffset = 18; dayOffset >= 0; dayOffset--) {
      const recordDate = new Date(today);
      recordDate.setDate(recordDate.getDate() - dayOffset);
      recordDate.setHours(9, 0, 0, 0);

      // Skip Sundays (day === 0)
      if (recordDate.getDay() === 0) continue;

      workers.forEach((worker, wIndex) => {
        // Vary statuses realistically
        let status = 'present';
        let hoursWorked = 8;
        let wageMultiplier = 1;

        const rand = (dayOffset + wIndex * 3) % 10;
        if (rand === 0) {
          status = 'absent';
          hoursWorked = 0;
          wageMultiplier = 0;
        } else if (rand === 1) {
          status = 'half_day';
          hoursWorked = 4;
          wageMultiplier = 0.5;
        } else if (rand === 2) {
          status = 'overtime';
          hoursWorked = 10;
          wageMultiplier = 1.375; // 8 hrs + 2 hrs @ 1.5x
        }

        const dailyWage = Math.round(worker.dailyWageRate * wageMultiplier);
        const act = activities[(dayOffset + wIndex) % activities.length];

        attendanceRecords.push({
          worker: worker._id,
          farmer: farmer._id,
          date: recordDate,
          status,
          hoursWorked,
          wageRate: worker.dailyWageRate,
          dailyWage,
          cropField: act.field,
          activity: act.task,
          notes: status === 'overtime' ? 'Night harvesting shift extra 2 hours' : '',
        });
      });
    }

    await Attendance.create(attendanceRecords);
    console.log(` Created ${attendanceRecords.length} Attendance records`);

    // 4. Create Payments disbursed to workers
    const paymentRecords = [
      {
        worker: workers[0]._id, // Ramesh
        farmer: farmer._id,
        amount: 4500,
        date: new Date(Date.now() - 14 * 86400000),
        paymentMode: 'bank_transfer',
        referenceNumber: 'NEFT9823419082',
        notes: 'Bi-weekly wage disbursement',
      },
      {
        worker: workers[0]._id,
        farmer: farmer._id,
        amount: 3000,
        date: new Date(Date.now() - 4 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/3829104821',
        notes: 'Mid-month advance & overtime payout',
      },
      {
        worker: workers[1]._id, // Suresh
        farmer: farmer._id,
        amount: 4000,
        date: new Date(Date.now() - 12 * 86400000),
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-042',
        notes: 'Cash wage handout',
      },
      {
        worker: workers[1]._id,
        farmer: farmer._id,
        amount: 2500,
        date: new Date(Date.now() - 2 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/4409182390',
        notes: 'Wages payment',
      },
      {
        worker: workers[2]._id, // Anita
        farmer: farmer._id,
        amount: 4800,
        date: new Date(Date.now() - 13 * 86400000),
        paymentMode: 'bank_transfer',
        referenceNumber: 'IMPS/88219038',
        notes: 'Bank transfer wage disbursement',
      },
      {
        worker: workers[2]._id,
        farmer: farmer._id,
        amount: 2800,
        date: new Date(Date.now() - 3 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/7762104921',
        notes: 'Polyhouse maintenance wages',
      },
      {
        worker: workers[3]._id, // Manoj
        farmer: farmer._id,
        amount: 3800,
        date: new Date(Date.now() - 10 * 86400000),
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-051',
        notes: 'Cash payout for irrigation work',
      },
      {
        worker: workers[3]._id,
        farmer: farmer._id,
        amount: 2000,
        date: new Date(Date.now() - 1 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/9910245812',
        notes: 'Recent wage settlement',
      },
    ];

    await Payment.create(paymentRecords);
    console.log(` Created ${paymentRecords.length} Payment records`);

    // 5. Create Crop Expenses
    const expenseRecords = [
      {
        farmer: farmer._id,
        cropName: 'Wheat - Sharbati',
        category: 'seeds',
        amount: 14500,
        date: new Date(Date.now() - 40 * 86400000),
        vendor: 'Kisan Certified Seeds Agency',
        description: 'Certified DBW-187 High-Yield Wheat Seeds (12 Bags)',
        paymentMode: 'bank_transfer',
      },
      {
        farmer: farmer._id,
        cropName: 'Basmati Paddy 1121',
        category: 'fertilizers',
        amount: 18200,
        date: new Date(Date.now() - 30 * 86400000),
        vendor: 'IFFCO Agro Center',
        description: 'DAP (10 Bags), Urea (15 Bags) & Potash mix',
        paymentMode: 'upi',
      },
      {
        farmer: farmer._id,
        cropName: 'Tomato Polyhouse',
        category: 'pesticides',
        amount: 6800,
        date: new Date(Date.now() - 22 * 86400000),
        vendor: 'Bio-Shield Organic Care',
        description: 'Neem-based organic insecticide & bio-fungicide',
        paymentMode: 'cash',
      },
      {
        farmer: farmer._id,
        cropName: 'General Farm',
        category: 'fuel',
        amount: 9400,
        date: new Date(Date.now() - 15 * 86400000),
        vendor: 'Bharat Petroleum Outlet',
        description: '100 Liters Diesel for Tractor & Water Pump',
        paymentMode: 'upi',
      },
      {
        farmer: farmer._id,
        cropName: 'Wheat - Sharbati',
        category: 'machinery',
        amount: 16000,
        date: new Date(Date.now() - 8 * 86400000),
        vendor: 'Gill Agro Equipments',
        description: 'Combine Harvester Rental (10 Hours)',
        paymentMode: 'bank_transfer',
      },
      {
        farmer: farmer._id,
        cropName: 'Tomato Polyhouse',
        category: 'irrigation',
        amount: 7500,
        date: new Date(Date.now() - 25 * 86400000),
        vendor: 'Jain Drip Irrigation Ltd',
        description: 'Micro-drippers, lateral pipes, and filter mesh',
        paymentMode: 'upi',
      },
      {
        farmer: farmer._id,
        cropName: 'Cotton Section 3',
        category: 'fertilizers',
        amount: 11500,
        date: new Date(Date.now() - 18 * 86400000),
        vendor: 'IFFCO Agro Center',
        description: 'Zinc Sulfate, Boron micronutrients & Magnesium',
        paymentMode: 'cash',
      },
      {
        farmer: farmer._id,
        cropName: 'Wheat - Sharbati',
        category: 'transport',
        amount: 5200,
        date: new Date(Date.now() - 5 * 86400000),
        vendor: 'Karnal Freight Transport',
        description: 'Trolley transport to APMC Mandi Grain Market',
        paymentMode: 'cash',
      },
    ];

    await CropExpense.create(expenseRecords);
    console.log(` Created ${expenseRecords.length} Crop Expense records`);

    // 6. Create Crop Sales & Revenue
    const saleRecords = [
      {
        farmer: farmer._id,
        cropName: 'Wheat - Sharbati',
        variety: 'DBW-187 A-Grade',
        harvestDate: new Date(Date.now() - 15 * 86400000),
        saleDate: new Date(Date.now() - 6 * 86400000),
        quantity: 110,
        unit: 'quintal',
        unitPrice: 2450,
        totalRevenue: 269500,
        buyerName: 'Haryana Grain Corporation (APMC Mandi)',
        buyerContact: '+91 94160 11223',
        paymentStatus: 'received',
        amountReceived: 269500,
        notes: 'Direct MSP procurement, payment cleared into farm account',
      },
      {
        farmer: farmer._id,
        cropName: 'Basmati Paddy 1121',
        variety: 'Export Super Fine',
        harvestDate: new Date(Date.now() - 45 * 86400000),
        saleDate: new Date(Date.now() - 28 * 86400000),
        quantity: 80,
        unit: 'quintal',
        unitPrice: 3800,
        totalRevenue: 304000,
        buyerName: 'Heritage Basmati Millers Ltd',
        buyerContact: '+91 98120 44556',
        paymentStatus: 'received',
        amountReceived: 304000,
        notes: 'Bulk sale, high aroma export quality batch',
      },
      {
        farmer: farmer._id,
        cropName: 'Organic Polyhouse Tomatoes',
        variety: 'Abhinav Hybrid F1',
        harvestDate: new Date(Date.now() - 5 * 86400000),
        saleDate: new Date(Date.now() - 2 * 86400000),
        quantity: 220,
        unit: 'crates',
        unitPrice: 720,
        totalRevenue: 158400,
        buyerName: 'Metro Agri Mart & Fresh Organics',
        buyerContact: '+91 99911 88776',
        paymentStatus: 'received',
        amountReceived: 158400,
        notes: 'Clean graded organic produce crates',
      },
      {
        farmer: farmer._id,
        cropName: 'Cotton Raw Bales',
        variety: 'Bt Cotton Long Staple',
        harvestDate: new Date(Date.now() - 60 * 86400000),
        saleDate: new Date(Date.now() - 42 * 86400000),
        quantity: 35,
        unit: 'quintal',
        unitPrice: 7100,
        totalRevenue: 248500,
        buyerName: 'Vardhman Spinning Mills Depot',
        buyerContact: '+91 98722 33441',
        paymentStatus: 'received',
        amountReceived: 248500,
        notes: 'First quality ginning grade bales',
      },
      {
        farmer: farmer._id,
        cropName: 'Mustard Seeds',
        variety: 'Pusa Bold',
        harvestDate: new Date(Date.now() - 10 * 86400000),
        saleDate: new Date(Date.now() - 1 * 86400000),
        quantity: 25,
        unit: 'quintal',
        unitPrice: 5400,
        totalRevenue: 135000,
        buyerName: 'Shri Ram Oil Mills Mandi',
        buyerContact: '+91 94165 99887',
        paymentStatus: 'partial',
        amountReceived: 100000,
        notes: 'Balance ₹35,000 promised in next clearing cycle',
      },
    ];

    await CropSale.create(saleRecords);
    console.log(` Created ${saleRecords.length} Crop Sale records`);

    // 6. Create Crop Records with date and future harvest date
    const cropRecords = [
      {
        farmer: farmer._id,
        cropName: 'Wheat',
        variety: 'Sharbati Gold',
        season: 'rabi',
        areaAcres: 20,
        date: new Date(Date.now() - 45 * 86400000),
        sowingDate: new Date(Date.now() - 45 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 60 * 86400000), // Valid future date
        status: 'growing',
        estimatedYieldQuintals: 380,
        fieldLocation: 'North Canal Sector A',
        notes: 'High germination rate, first fertilizer cycle complete',
      },
      {
        farmer: farmer._id,
        cropName: 'Sugarcane',
        variety: 'Co 86032',
        season: 'perennial',
        areaAcres: 12,
        date: new Date(Date.now() - 120 * 86400000),
        sowingDate: new Date(Date.now() - 120 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 180 * 86400000), // Valid future date
        status: 'growing',
        estimatedYieldQuintals: 480,
        fieldLocation: 'East Tubewell Block',
        notes: 'Drip fertigation operational',
      },
      {
        farmer: farmer._id,
        cropName: 'Cotton',
        variety: 'BT Cotton Hybrid',
        season: 'kharif',
        areaAcres: 8,
        date: new Date(Date.now() - 15 * 86400000),
        sowingDate: new Date(Date.now() - 15 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 90 * 86400000), // Valid future date
        status: 'sown',
        estimatedYieldQuintals: 65,
        fieldLocation: 'South Plateau Field',
        notes: 'Pre-emergence herbicide sprayed',
      },
      {
        farmer: farmer._id,
        cropName: 'Mustard',
        variety: 'Pusa Bold',
        season: 'rabi',
        areaAcres: 5,
        date: new Date(Date.now() - 60 * 86400000),
        sowingDate: new Date(Date.now() - 60 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 30 * 86400000), // Valid future date
        status: 'growing',
        estimatedYieldQuintals: 40,
        fieldLocation: 'West Border Strip',
        notes: 'Flowering stage reached',
      },
    ];

    await Crop.create(cropRecords);
    console.log(` Created ${cropRecords.length} Crop records with dates in MongoDB`);

    console.log('\n=========================================');
    console.log(' SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=========================================');
    console.log('Farmer Login:');
    console.log('  Email:    farmer@farmledger.com');
    console.log('  Password: password123');
    console.log('Worker Login (Sample 1):');
    console.log('  Email:    ramesh@farmledger.com');
    console.log('  Password: password123');
    console.log('Worker Login (Sample 2):');
    console.log('  Email:    suresh@farmledger.com');
    console.log('  Password: password123');
    console.log('=========================================\n');

    return {
      farmer,
      workers,
      attendanceCount: attendanceRecords.length,
      paymentCount: paymentRecords.length,
      expenseCount: expenseRecords.length,
      saleCount: saleRecords.length,
    };
  } catch (error) {
    console.error(' Seeding Error:', error);
    throw error;
  }
};

// If run directly from CLI
if (require.main === module) {
  seedData()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedData;
