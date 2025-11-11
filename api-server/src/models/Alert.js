const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  driver_id: {
    type: String,
    required: true,
    index: true
  },
  avg_score: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  last_alert_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
