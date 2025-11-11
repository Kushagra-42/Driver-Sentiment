const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { sendMessage } = require('../config/kafka');
const Config = require('../models/Config');

const router = express.Router();

router.get('/drivers', authMiddleware, async (req, res) => {
  try {
    const Driver = require('../models/Driver');
    const { search } = req.query;
    
    let query = {};
    if (search) {
      query.driver_id = { $regex: search, $options: 'i' };
    }
    
    const drivers = await Driver.find(query)
      .select('driver_id name avg_score')
      .sort({ driver_id: 1 })
      .limit(50);
    
    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Driver search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers'
    });
  }
});

router.post('/', authMiddleware, [
  body('entity_type').isIn(['driver', 'trip', 'app', 'marshal']),
  body('entity_id').trim().notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('text').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { entity_type, entity_id, rating, text } = req.body;
    
    const config = await Config.findById('feedback_config');
    if (!config) {
      return res.status(500).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    const featureKey = `${entity_type}_feedback`;
    if (!config.features[featureKey] || !config.features[featureKey].enabled) {
      return res.status(403).json({
        success: false,
        message: `${entity_type} feedback is currently disabled`
      });
    }
    
    const message_id = uuidv4();
    
    const message = {
      message_id,
      entity_type,
      entity_id,
      user_id: req.user._id.toString(),
      rating,
      text,
      timestamp: new Date().toISOString(),
      source: 'web-ui'
    };
    
    await sendMessage(
      process.env.KAFKA_TOPIC || 'feedback',
      entity_id,
      message
    );
    
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        message_id,
        entity_type,
        entity_id
      }
    });
    
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit feedback' 
    });
  }
});

module.exports = router;
