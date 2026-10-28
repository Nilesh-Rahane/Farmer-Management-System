const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker ID is required'],
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'half_day', 'absent', 'overtime'],
        message: '{VALUE} is not a valid attendance status',
      },
      default: 'present',
      required: true,
    },
    hoursWorked: {
      type: Number,
      default: 8,
      min: [0, 'Hours worked cannot be negative'],
    },
    wageRate: {
      type: Number,
      required: [true, 'Wage rate is required'],
      min: [0, 'Wage rate cannot be negative'],
    },
    dailyWage: {
      type: Number,
      required: true,
      min: [0, 'Calculated daily wage cannot be negative'],
    },
    cropField: {
      type: String,
      trim: true,
      default: 'General Farm',
    },
    activity: {
      type: String,
      trim: true,
      default: 'Farm Work',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find attendance by farmer, worker, date
attendanceSchema.index({ farmer: 1, date: -1 });
attendanceSchema.index({ worker: 1, date: -1 });
attendanceSchema.index({ worker: 1, date: 1, farmer: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
