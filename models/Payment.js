const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Payment amount must be greater than zero'],
    },
    date: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: {
        values: ['cash', 'upi', 'bank_transfer', 'cheque'],
        message: '{VALUE} is not a valid payment mode',
      },
      default: 'cash',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
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

paymentSchema.index({ farmer: 1, date: -1 });
paymentSchema.index({ worker: 1, date: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
