const mongoose = require('mongoose');

const cropSaleSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
    },
    cropName: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
    },
    variety: {
      type: String,
      trim: true,
      default: '',
    },
    harvestDate: {
      type: Date,
      default: null,
    },
    saleDate: {
      type: Date,
      required: [true, 'Sale date is required'],
      default: Date.now,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be positive'],
    },
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton', 'crates', 'bags'],
      default: 'quintal',
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0.01, 'Unit price must be positive'],
    },
    totalRevenue: {
      type: Number,
      required: true,
      min: [0, 'Total revenue cannot be negative'],
    },
    buyerName: {
      type: String,
      trim: true,
      default: 'Local APMC Mandi',
    },
    buyerContact: {
      type: String,
      trim: true,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['received', 'pending', 'partial'],
      default: 'received',
    },
    amountReceived: {
      type: Number,
      default: 0,
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

// Pre-save calculate totalRevenue and amountReceived if received
cropSaleSchema.pre('save', function () {
  this.totalRevenue = Math.round(this.quantity * this.unitPrice * 100) / 100;
  if (this.paymentStatus === 'received' && (!this.amountReceived || this.amountReceived === 0)) {
    this.amountReceived = this.totalRevenue;
  }
});

cropSaleSchema.index({ farmer: 1, saleDate: -1 });
cropSaleSchema.index({ farmer: 1, cropName: 1 });

module.exports = mongoose.model('CropSale', cropSaleSchema);
