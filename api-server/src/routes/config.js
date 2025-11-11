const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Config = require('../models/Config');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let config = await Config.findById('feedback_config');
    
    if (!config) {
      config = new Config({ _id: 'feedback_config' });
      await config.save();
    }
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch configuration' 
    });
  }
});

router.patch('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updateData = {};
    
    if (req.body.features) {
      updateData.features = req.body.features;
    }
    if (req.body.alert_threshold !== undefined) {
      updateData.alert_threshold = req.body.alert_threshold;
    }
    if (req.body.ema_alpha !== undefined) {
      updateData.ema_alpha = req.body.ema_alpha;
    }
    if (req.body.batch_size !== undefined) {
      updateData.batch_size = req.body.batch_size;
    }
    if (req.body.batch_timeout_s !== undefined) {
      updateData.batch_timeout_s = req.body.batch_timeout_s;
    }
    if (req.body.alert_cooldown_s !== undefined) {
      updateData.alert_cooldown_s = req.body.alert_cooldown_s;
    }
    
    const config = await Config.findByIdAndUpdate(
      'feedback_config',
      { $set: updateData },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });
    
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update configuration' 
    });
  }
});

module.exports = router;
