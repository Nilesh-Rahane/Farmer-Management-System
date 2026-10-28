const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
    },
    cropName: {
      type: String,
      required: [true, 'Crop name is required (e.g. Wheat, Sugarcane, Cotton)'],
      trim: true,
    },
    variety: {
      type: String,
      trim: true,
      default: '',
    },
    season: {
      type: String,
      enum: {
        values: ['kharif', 'rabi', 'zaid', 'perennial', 'other'],
        message: '{VALUE} is not a valid agricultural season',
      },
      default: 'kharif',
    },
    areaAcres: {
      type: Number,
      min: [0, 'Area in acres cannot be negative'],
      default: 1,
    },
    date: {
      type: Date,
      required: [true, 'Crop sowing / plantation date is required'],
      default: Date.now,
    },
    sowingDate: {
      type: Date,
      default: Date.now,
    },
    expectedHarvestDate: {
      type: Date,
      default: null,
    },
    actualHarvestDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['planned', 'sown', 'growing', 'harvesting', 'harvested', 'completed'],
        message: '{VALUE} is not a valid crop status',
      },
      default: 'growing',
    },
    estimatedYieldQuintals: {
      type: Number,
      min: [0, 'Estimated yield cannot be negative'],
      default: 0,
    },
    fieldLocation: {
      type: String,
      trim: true,
      default: 'Main Field',
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

// Synchronize date and sowingDate
cropSchema.pre('save', function (next) {
  if (this.date && !this.sowingDate) {
    this.sowingDate = this.date;
  } else if (this.sowingDate && !this.date) {
    this.date = this.sowingDate;
  }
  if (typeof next === 'function') next();
});

cropSchema.index({ farmer: 1, date: -1 });
cropSchema.index({ farmer: 1, status: 1 });

module.exports = mongoose.model('Crop', cropSchema);
