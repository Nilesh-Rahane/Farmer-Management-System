const mongoose = require('mongoose');

const cropExpenseSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
    },
    cropName: {
      type: String,
      required: [true, 'Crop or Field name is required'],
      trim: true,
      default: 'General Farm',
    },
    category: {
      type: String,
      enum: {
        values: [
          'seeds',
          'fertilizers',
          'pesticides',
          'irrigation',
          'fuel',
          'machinery',
          'labor_misc',
          'transport',
          'other',
        ],
        message: '{VALUE} is not a valid expense category',
      },
      required: [true, 'Expense category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },
    vendor: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'credit', 'cheque'],
      default: 'cash',
    },
  },
  {
    timestamps: true,
  }
);

cropExpenseSchema.index({ farmer: 1, date: -1 });
cropExpenseSchema.index({ farmer: 1, category: 1 });
cropExpenseSchema.index({ farmer: 1, cropName: 1 });

module.exports = mongoose.model('CropExpense', cropExpenseSchema);
