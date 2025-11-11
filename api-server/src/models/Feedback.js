const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  entity_type: {
    type: String,
    enum: ['driver', 'trip', 'app', 'marshal'],
    required: true,
    index: true
  },
  entity_id: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  predicted_score: {
    type: Number,
    default: null,
    min: 1,
    max: 5
  },
  combined_score: {
    type: Number,
    default: null,
    min: 1,
    max: 5,
    index: true
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', null],
    default: null,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

feedbackSchema.index({ entity_type: 1, entity_id: 1 });
feedbackSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
