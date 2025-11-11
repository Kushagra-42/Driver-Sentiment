const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driver_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  vehicle_number: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  avg_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
  },
  total_feedback: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);
