const mongoose = require('mongoose');

const correctionRequestSchema = new mongoose.Schema(
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
    requestType: {
      type: String,
      enum: {
        values: ['attendance', 'salary'],
        message: '{VALUE} is not a valid correction type',
      },
      required: [true, 'Request type is required (attendance or salary)'],
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      default: null,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
      default: Date.now,
    },
    // Attendance-specific fields
    currentStatus: {
      type: String,
      default: '',
    },
    requestedStatus: {
      type: String,
      enum: ['present', 'half_day', 'overtime', 'absent', ''],
      default: '',
    },
    currentHours: {
      type: Number,
      default: 0,
    },
    requestedHours: {
      type: Number,
      default: 8,
    },
    // Salary/Wage-specific fields
    currentAmount: {
      type: Number,
      default: 0,
    },
    requestedAmount: {
      type: Number,
      default: 0,
    },
    // Explanation and Status
    reason: {
      type: String,
      required: [true, 'Reason for correction request is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid request status',
      },
      default: 'pending',
    },
    farmerRemarks: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Farmer remarks cannot exceed 500 characters'],
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

correctionRequestSchema.index({ farmer: 1, status: 1, createdAt: -1 });
correctionRequestSchema.index({ worker: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('CorrectionRequest', correctionRequestSchema);
