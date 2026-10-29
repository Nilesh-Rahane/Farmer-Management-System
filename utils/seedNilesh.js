require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const CropExpense = require('../models/CropExpense');
const CropSale = require('../models/CropSale');
const Crop = require('../models/Crop');
const CorrectionRequest = require('../models/CorrectionRequest');

async function seedNileshData() {
  try {
    // Connect directly to your MongoDB Atlas Cloud database
    await connectDB();
    console.log(`✅ Connected directly to MongoDB Cloud: ${mongoose.connection.host} (DB: ${mongoose.connection.name})`);

    // 1. Find or update Farmer account: nileshrahane8@gmail.com
    let farmer = await User.findOne({ email: 'nileshrahane8@gmail.com' });
    if (!farmer) {
      console.log('Creating farmer account nileshrahane8@gmail.com...');
      farmer = await User.create({
        name: 'Nilesh Rahane',
        email: 'nileshrahane8@gmail.com',
        password: 'Nilesh@2006',
        role: 'farmer',
        phone: '+91 82088 87664',
        farmName: 'Rahane Farm-House',
        farmLocation: 'Vaijapur, Chhatrapati Sambhajinagar',
        farmSizeAcres: 50,
        status: 'active',
      });
      console.log(`✅ Created farmer account: ${farmer.email}`);
    } else {
      // Ensure password is set to Nilesh@2006
      farmer.password = 'Nilesh@2006';
      farmer.name = 'Nilesh Rahane';
      farmer.farmName = farmer.farmName || 'Rahane Farm-House';
      farmer.farmLocation = farmer.farmLocation || 'Vaijapur, Chhatrapati Sambhajinagar';
      farmer.farmSizeAcres = farmer.farmSizeAcres || 50;
      farmer.phone = farmer.phone || '+91 82088 87664';
      farmer.role = 'farmer';
      farmer.status = 'active';
      await farmer.save();
      console.log(`✅ Farmer account verified & updated: ${farmer.email} (Password: Nilesh@2006)`);
    }

    const farmerId = farmer._id;

    // 2. Define the 5 Workers for Nilesh Rahane
    const workersDefinitions = [
      {
        name: 'Pranav Mudgul',
        email: 'pranav@gmail.com',
        phone: '+91 98220 11223',
        dailyWageRate: 600,
        specialization: 'Tractor & Machinery Operator',
        password: 'password123',
      },
      {
        name: 'Aditya Bare',
        email: 'aditya@gmail.com',
        phone: '+91 98220 22334',
        dailyWageRate: 550,
        specialization: 'Drip Irrigation & Fertigation Setup',
        password: 'password123',
      },
      {
        name: 'Sambhaji Shinde',
        email: 'sambhaji.rahane@gmail.com',
        phone: '+91 98220 33445',
        dailyWageRate: 520,
        specialization: 'Sugarcane & Field Cultivation',
        password: 'password123',
      },
      {
        name: 'Ganesh Pawar',
        email: 'ganesh.rahane@gmail.com',
        phone: '+91 98220 44556',
        dailyWageRate: 500,
        specialization: 'Pest Management & Crop Spraying',
        password: 'password123',
      },
      {
        name: 'Sunita Gaikwad',
        email: 'sunita.rahane@gmail.com',
        phone: '+91 98220 55667',
        dailyWageRate: 480,
        specialization: 'Harvesting, Grading & Storage',
        password: 'password123',
      },
    ];

    const workers = [];
    for (const wDef of workersDefinitions) {
      let worker = await User.findOne({ email: wDef.email });
      if (!worker) {
        worker = await User.create({
          name: wDef.name,
          email: wDef.email,
          password: wDef.password,
          role: 'worker',
          farmerId: farmerId,
          phone: wDef.phone,
          dailyWageRate: wDef.dailyWageRate,
          specialization: wDef.specialization,
          status: 'active',
        });
        console.log(`  ➕ Created worker: ${worker.name} (${worker.email})`);
      } else {
        worker.name = wDef.name;
        worker.role = 'worker';
        worker.farmerId = farmerId;
        worker.phone = wDef.phone;
        worker.dailyWageRate = wDef.dailyWageRate;
        worker.specialization = wDef.specialization;
        worker.status = 'active';
        await worker.save();
        console.log(`  🔄 Updated worker: ${worker.name} (${worker.email})`);
      }
      workers.push(worker);
    }
    console.log(`✅ Configured ${workers.length} workers for Nilesh Rahane`);

    // Clean previous history for this farmer in cloud database
    await Attendance.deleteMany({ farmer: farmerId });
    await Payment.deleteMany({ farmer: farmerId });
    await Crop.deleteMany({ farmer: farmerId });
    await CropExpense.deleteMany({ farmer: farmerId });
    await CropSale.deleteMany({ farmer: farmerId });
    await CorrectionRequest.deleteMany({ farmer: farmerId });
    console.log('🧹 Cleaned previous transactional records for Nilesh Rahane in cloud database');

    // 3. Create Crops for Nilesh Rahane (Vaijapur 50-Acre Farm)
    const cropRecords = [
      {
        farmer: farmerId,
        cropName: 'Sugarcane',
        variety: 'Co 86032 (Nira)',
        season: 'perennial',
        areaAcres: 18,
        date: new Date(Date.now() - 110 * 86400000),
        sowingDate: new Date(Date.now() - 110 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 160 * 86400000),
        status: 'growing',
        estimatedYieldQuintals: 950,
        fieldLocation: 'North River Block A',
        notes: 'Drip fertigation operational; excellent tillering and cane height.',
      },
      {
        farmer: farmerId,
        cropName: 'Onion',
        variety: 'Gavran Red / Fursungi',
        season: 'rabi',
        areaAcres: 10,
        date: new Date(Date.now() - 40 * 86400000),
        sowingDate: new Date(Date.now() - 40 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 50 * 86400000),
        status: 'growing',
        estimatedYieldQuintals: 160,
        fieldLocation: 'East Canal Plot 2',
        notes: 'Bulb formation stage; micro-nutrient foliar spray completed.',
      },
      {
        farmer: farmerId,
        cropName: 'Soybean',
        variety: 'JS 335',
        season: 'kharif',
        areaAcres: 10,
        date: new Date(Date.now() - 115 * 86400000),
        sowingDate: new Date(Date.now() - 115 * 86400000),
        expectedHarvestDate: new Date(Date.now() - 10 * 86400000),
        actualHarvestDate: new Date(Date.now() - 8 * 86400000),
        status: 'harvested',
        estimatedYieldQuintals: 120,
        fieldLocation: 'South Plain Sector 1',
        notes: 'Combine harvesting completed; pod filling quality exceptional.',
      },
      {
        farmer: farmerId,
        cropName: 'Pomegranate',
        variety: 'Bhagawa Super Red',
        season: 'perennial',
        areaAcres: 7,
        date: new Date(Date.now() - 280 * 86400000),
        sowingDate: new Date(Date.now() - 280 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 70 * 86400000),
        status: 'growing',
        estimatedYieldQuintals: 140,
        fieldLocation: 'West Hillside Orchard',
        notes: 'Fruit development stage; organic bio-pesticide applied.',
      },
      {
        farmer: farmerId,
        cropName: 'Wheat',
        variety: 'Sharbati 1544',
        season: 'rabi',
        areaAcres: 5,
        date: new Date(Date.now() - 15 * 86400000),
        sowingDate: new Date(Date.now() - 15 * 86400000),
        expectedHarvestDate: new Date(Date.now() + 85 * 86400000),
        status: 'sown',
        estimatedYieldQuintals: 75,
        fieldLocation: 'Central Well Sector',
        notes: 'First crown root irrigation scheduled for coming weekend.',
      },
    ];

    const insertedCrops = await Crop.create(cropRecords);
    console.log(`✅ Created ${insertedCrops.length} Crops for Nilesh Rahane in cloud DB`);

    // 4. Generate Attendance History across the last 18 days for all 5 workers
    const activities = [
      { field: 'North River Block A (Sugarcane)', task: 'Drip Lateral Flush & Weed Control' },
      { field: 'East Canal Plot 2 (Onion)', task: 'Soil Tilling & Organic Compost Dressing' },
      { field: 'South Plain Sector 1 (Soybean)', task: 'Threshing, Grain Bagging & Loading' },
      { field: 'West Hillside Orchard (Pomegranate)', task: 'Canopy Pruning & Fruit Care' },
      { field: 'Central Well Sector (Wheat)', task: 'Channel Maintenance & Seed Bed Levelling' },
      { field: 'Farm Workshop & Shed', task: 'Tractor Service & Spray Equipment Calibration' },
    ];

    const attendanceRecords = [];
    const today = new Date();

    for (let dayOffset = 18; dayOffset >= 0; dayOffset--) {
      const recordDate = new Date(today);
      recordDate.setDate(recordDate.getDate() - dayOffset);
      recordDate.setHours(9, 0, 0, 0);

      // Skip Sundays
      if (recordDate.getDay() === 0) continue;

      workers.forEach((worker, wIndex) => {
        let status = 'present';
        let hoursWorked = 8;
        let wageMultiplier = 1;

        // Realistic variation across workers & days
        const pattern = (dayOffset * 3 + wIndex * 2) % 11;
        if (pattern === 0) {
          status = 'absent';
          hoursWorked = 0;
          wageMultiplier = 0;
        } else if (pattern === 1) {
          status = 'half_day';
          hoursWorked = 4;
          wageMultiplier = 0.5;
        } else if (pattern === 2) {
          status = 'overtime';
          hoursWorked = 10;
          wageMultiplier = 1.375; // 8 hrs + 2 hrs overtime @ 1.5x
        }

        const dailyWage = Math.round(worker.dailyWageRate * wageMultiplier);
        const act = activities[(dayOffset + wIndex) % activities.length];

        attendanceRecords.push({
          worker: worker._id,
          farmer: farmerId,
          date: recordDate,
          status,
          hoursWorked,
          wageRate: worker.dailyWageRate,
          dailyWage,
          cropField: act.field,
          activity: act.task,
          notes:
            status === 'overtime'
              ? 'Overtime 2 hours - canal water shift & tractor tilling'
              : status === 'half_day'
                ? 'Half day - afternoon rain break'
                : '',
        });
      });
    }

    const insertedAttendance = await Attendance.create(attendanceRecords);
    console.log(`✅ Created ${insertedAttendance.length} Attendance records in cloud DB`);

    // 5. Create Payment Disbursement Records
    const paymentRecords = [
      // Worker 1: Pranav Mudgul
      {
        worker: workers[0]._id,
        farmer: farmerId,
        amount: 4800,
        date: new Date(Date.now() - 14 * 86400000),
        paymentMode: 'bank_transfer',
        referenceNumber: 'NEFT/MAHB8291039',
        notes: 'Bi-weekly wage disbursement for tractor operations',
      },
      {
        worker: workers[0]._id,
        farmer: farmerId,
        amount: 3200,
        date: new Date(Date.now() - 3 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/9822011223@sbi',
        notes: 'Mid-month settlement and overtime payout',
      },

      // Worker 2: Aditya Bare
      {
        worker: workers[1]._id,
        farmer: farmerId,
        amount: 4400,
        date: new Date(Date.now() - 13 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/9822022334@axis',
        notes: 'Drip fertigation wage settlement',
      },
      {
        worker: workers[1]._id,
        farmer: farmerId,
        amount: 2500,
        date: new Date(Date.now() - 2 * 86400000),
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-VR-101',
        notes: 'Cash wage advance',
      },

      // Worker 3: Sambhaji Shinde
      {
        worker: workers[2]._id,
        farmer: farmerId,
        amount: 4100,
        date: new Date(Date.now() - 12 * 86400000),
        paymentMode: 'bank_transfer',
        referenceNumber: 'IMPS/9812401823',
        notes: 'Sugarcane cultivation wages transfer',
      },
      {
        worker: workers[2]._id,
        farmer: farmerId,
        amount: 2200,
        date: new Date(Date.now() - 4 * 86400000),
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-VR-102',
        notes: 'Field weed control work payout',
      },

      // Worker 4: Ganesh Pawar
      {
        worker: workers[3]._id,
        farmer: farmerId,
        amount: 3900,
        date: new Date(Date.now() - 11 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/4491028301@paytm',
        notes: 'Orchard spray work wages',
      },
      {
        worker: workers[3]._id,
        farmer: farmerId,
        amount: 2000,
        date: new Date(Date.now() - 1 * 86400000),
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-VR-103',
        notes: 'Weekly cash wage settlement',
      },

      // Worker 5: Sunita Gaikwad
      {
        worker: workers[4]._id,
        farmer: farmerId,
        amount: 3800,
        date: new Date(Date.now() - 10 * 86400000),
        paymentMode: 'upi',
        referenceNumber: 'UPI/7721092834@ybl',
        notes: 'Soybean grading and harvest sorting wages',
      },
      {
        worker: workers[4]._id,
        farmer: farmerId,
        amount: 1800,
        date: new Date(Date.now() - 2 * 86400000),
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-VR-104',
        notes: 'Harvest season wage handout',
      },
    ];

    const insertedPayments = await Payment.create(paymentRecords);
    console.log(`✅ Created ${insertedPayments.length} Payment records in cloud DB`);

    // 6. Create Correction Requests
    const sampleAtt = attendanceRecords.find(
      (a) => a.worker.toString() === workers[2]._id.toString() && a.status === 'half_day'
    );
    const correctionRecords = [
      {
        worker: workers[2]._id, // Sambhaji Shinde
        farmer: farmerId,
        requestType: 'attendance',
        attendanceId: sampleAtt ? sampleAtt._id : null,
        targetDate: sampleAtt ? sampleAtt.date : new Date(Date.now() - 5 * 86400000),
        currentStatus: 'half_day',
        requestedStatus: 'present',
        currentHours: 4,
        requestedHours: 8,
        reason: 'Completed evening canal irrigation shift along with morning tilling; requested full day attendance.',
        status: 'approved',
        farmerRemarks: 'Verified with tractor meter reading. Full day attendance approved.',
        reviewedAt: new Date(Date.now() - 86400000),
      },
      {
        worker: workers[4]._id, // Sunita Gaikwad
        farmer: farmerId,
        requestType: 'salary',
        targetDate: new Date(Date.now() - 4 * 86400000),
        currentAmount: 480,
        requestedAmount: 600,
        reason: 'Overtime 2 hours worked during soybean threshing bag loading.',
        status: 'pending',
      },
    ];

    await CorrectionRequest.create(correctionRecords);
    console.log(`✅ Created sample Correction Requests in cloud DB`);

    // 7. Create Crop Expenses
    const expenseRecords = [
      {
        farmer: farmerId,
        cropName: 'Sugarcane',
        category: 'fertilizers',
        amount: 28500,
        date: new Date(Date.now() - 35 * 86400000),
        vendor: 'Kisan Krishi Seva Kendra, Vaijapur',
        description: 'IFFCO 10:26:26 (15 Bags), Urea (20 Bags), Soluble Potash',
        paymentMode: 'bank_transfer',
      },
      {
        farmer: farmerId,
        cropName: 'Sugarcane',
        category: 'irrigation',
        amount: 14200,
        date: new Date(Date.now() - 60 * 86400000),
        vendor: 'Jain Irrigation Systems Dealership',
        description: 'Inline drip tubes, screen filters & flush valves',
        paymentMode: 'upi',
      },
      {
        farmer: farmerId,
        cropName: 'Onion',
        category: 'seeds',
        amount: 16500,
        date: new Date(Date.now() - 42 * 86400000),
        vendor: 'Panchganga Seeds Agency',
        description: 'Certified Gavran Fursungi Onion Seeds (12 kg)',
        paymentMode: 'cash',
      },
      {
        farmer: farmerId,
        cropName: 'Onion',
        category: 'fertilizers',
        amount: 12800,
        date: new Date(Date.now() - 22 * 86400000),
        vendor: 'Maha Agro Center',
        description: 'Sulphur 90% WDG, Micronutrient mix & 12:61:00',
        paymentMode: 'upi',
      },
      {
        farmer: farmerId,
        cropName: 'Pomegranate',
        category: 'pesticides',
        amount: 11400,
        date: new Date(Date.now() - 28 * 86400000),
        vendor: 'Bio-Shield Organic Care',
        description: 'Organic Neem oil concentrate & Streptocycline bacterial protection',
        paymentMode: 'bank_transfer',
      },
      {
        farmer: farmerId,
        cropName: 'Soybean',
        category: 'machinery',
        amount: 18000,
        date: new Date(Date.now() - 8 * 86400000),
        vendor: 'Shinde Agro Machinery Works',
        description: 'Combine Harvester Rental for 10 Acres Soybean Crop',
        paymentMode: 'cash',
      },
      {
        farmer: farmerId,
        cropName: 'Wheat',
        category: 'seeds',
        amount: 8500,
        date: new Date(Date.now() - 16 * 86400000),
        vendor: 'Mahabeej Certified Seed Outlet',
        description: 'Sharbati 1544 Certified Foundation Seed (4 Bags)',
        paymentMode: 'upi',
      },
      {
        farmer: farmerId,
        cropName: 'General Farm',
        category: 'fuel',
        amount: 15600,
        date: new Date(Date.now() - 12 * 86400000),
        vendor: 'Indian Oil Petrol Pump, Vaijapur Bypass',
        description: '160 Liters Diesel for Mahindra 575 Tractor and Generator',
        paymentMode: 'upi',
      },
      {
        farmer: farmerId,
        cropName: 'Soybean',
        category: 'transport',
        amount: 6800,
        date: new Date(Date.now() - 6 * 86400000),
        vendor: 'Marathwada Goods Freight Services',
        description: 'Tractor trolley transport of 95 Quintal Soybean to Mandi',
        paymentMode: 'cash',
      },
    ];

    const insertedExpenses = await CropExpense.create(expenseRecords);
    console.log(`✅ Created ${insertedExpenses.length} Crop Expense records in cloud DB`);

    // 8. Create Crop Sales (Revenue)
    const saleRecords = [
      {
        farmer: farmerId,
        cropName: 'Soybean',
        variety: 'JS 335 A-Grade',
        harvestDate: new Date(Date.now() - 8 * 86400000),
        saleDate: new Date(Date.now() - 5 * 86400000),
        quantity: 95,
        unit: 'quintal',
        unitPrice: 4650,
        totalRevenue: 441750,
        buyerName: 'Kailash Agro Traders, APMC Lasalgaon',
        buyerContact: '+91 94222 34567',
        paymentStatus: 'received',
        amountReceived: 441750,
        notes: 'Bumper harvest sale, clean seed quality with 11% moisture. Payment cleared via RTGS.',
      },
      {
        farmer: farmerId,
        cropName: 'Pomegranate',
        variety: 'Bhagawa Premium Export',
        harvestDate: new Date(Date.now() - 25 * 86400000),
        saleDate: new Date(Date.now() - 18 * 86400000),
        quantity: 32,
        unit: 'quintal',
        unitPrice: 8400,
        totalRevenue: 268800,
        buyerName: 'Fresh Fruits Export Syndicate, Navi Mumbai',
        buyerContact: '+91 98230 88990',
        paymentStatus: 'received',
        amountReceived: 268800,
        notes: 'Early picking export grade crate batch, 250g+ fruit average.',
      },
      {
        farmer: farmerId,
        cropName: 'Onion',
        variety: 'Gavran Early Harvest',
        harvestDate: new Date(Date.now() - 12 * 86400000),
        saleDate: new Date(Date.now() - 3 * 86400000),
        quantity: 55,
        unit: 'quintal',
        unitPrice: 2250,
        totalRevenue: 123750,
        buyerName: 'APMC Vaijapur Vegetable Yard',
        buyerContact: '+91 94210 66778',
        paymentStatus: 'partial',
        amountReceived: 85000,
        notes: 'Advance received ₹85,000; balance ₹38,750 scheduled on next auction day.',
      },
    ];

    const insertedSales = await CropSale.create(saleRecords);
    console.log(`✅ Created ${insertedSales.length} Crop Sale records in cloud DB`);

    console.log('\n======================================================');
    console.log('🎉 SEEDING NILESH RAHANE CLOUD DATABASE COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`Database Host: ${mongoose.connection.host}`);
    console.log('Farmer Credentials:');
    console.log('  Email:    nileshrahane8@gmail.com');
    console.log('  Password: Nilesh@2006');
    console.log('\n5 Workers Created / Linked:');
    workers.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.name} | ${w.email} | Pass: password123 | Rate: ₹${w.dailyWageRate}/day | ${w.specialization}`);
    });
    console.log('\nCrops Added:');
    insertedCrops.forEach((c) => {
      console.log(`  🌱 ${c.cropName} (${c.variety}) - ${c.areaAcres} Acres [${c.status}]`);
    });
    console.log(`\nStats:`);
    console.log(`  Attendance Records: ${insertedAttendance.length}`);
    console.log(`  Payments Disbursed: ${insertedPayments.length}`);
    console.log(`  Crop Expenses:      ${insertedExpenses.length}`);
    console.log(`  Crop Sales:         ${insertedSales.length}`);
    console.log('======================================================\n');

    return {
      farmer,
      workers,
      cropsCount: insertedCrops.length,
      attendanceCount: insertedAttendance.length,
      paymentCount: insertedPayments.length,
      expenseCount: insertedExpenses.length,
      saleCount: insertedSales.length,
    };
  } catch (error) {
    console.error('❌ Error seeding Nilesh data:', error);
    throw error;
  }
}

if (require.main === module) {
  seedNileshData()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedNileshData;
