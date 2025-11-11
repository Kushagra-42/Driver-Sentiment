const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driver_id: String,
  name: String,
  phone: String,
  vehicle_number: String,
  status: String,
  avg_score: Number,
  total_feedback: Number
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
  _id: String,
  entity_type: String,
  entity_id: String,
  user_id: mongoose.Schema.Types.ObjectId,
  rating: Number,
  text: String,
  predicted_score: Number,
  sentiment: String,
  timestamp: Date
}, { timestamps: true });

const configSchema = new mongoose.Schema({
  _id: String,
  features: Object,
  alert_threshold: Number,
  ema_alpha: Number,
  batch_size: Number,
  batch_timeout_s: Number,
  alert_cooldown_s: Number
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  driver_id: String,
  avg_score: Number,
  threshold: Number,
  last_alert_at: Date
}, { timestamps: true });

const Driver = mongoose.model('Driver', driverSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Config = mongoose.model('Config', configSchema);
const Alert = mongoose.model('Alert', alertSchema);

module.exports = { Driver, Feedback, Config, Alert };
