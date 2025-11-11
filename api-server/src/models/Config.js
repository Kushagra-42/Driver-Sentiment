const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'feedback_config'
  },
  features: {
    driver_feedback: {
      enabled: { type: Boolean, default: true },
      requires_sentiment: { type: Boolean, default: true }
    },
    trip_feedback: {
      enabled: { type: Boolean, default: true },
      requires_sentiment: { type: Boolean, default: false }
    },
    app_feedback: {
      enabled: { type: Boolean, default: false },
      requires_sentiment: { type: Boolean, default: false }
    },
    marshal_feedback: {
      enabled: { type: Boolean, default: true },
      requires_sentiment: { type: Boolean, default: false }
    }
  },
  alert_threshold: {
    type: Number,
    default: 2.5
  },
  ema_alpha: {
    type: Number,
    default: 0.25
  },
  batch_size: {
    type: Number,
    default: 200
  },
  batch_timeout_s: {
    type: Number,
    default: 10
  },
  alert_cooldown_s: {
    type: Number,
    default: 3600
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Config', configSchema);
