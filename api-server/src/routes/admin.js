const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Driver = require('../models/Driver');
const Feedback = require('../models/Feedback');
const Alert = require('../models/Alert');
const Config = require('../models/Config');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const config = await Config.findById('feedback_config');
    const threshold = config?.alert_threshold || 2.5;
    
    const total_drivers = await Driver.countDocuments();
    
    const total_feedback = await Feedback.countDocuments();
    
    const alert_count = await Driver.countDocuments({ avg_score: { $lt: threshold, $gt: 0 } });
    
    const sentimentBreakdown = await Feedback.aggregate([
      { $match: { entity_type: 'driver', sentiment: { $ne: null } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } }
    ]);
    
    const sentiment_breakdown = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    sentimentBreakdown.forEach(item => {
      if (item._id) {
        sentiment_breakdown[item._id] = item.count;
      }
    });
    
    const scoreStats = await Driver.aggregate([
      { $match: { total_feedback: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$avg_score' },
          min: { $min: '$avg_score' },
          max: { $max: '$avg_score' }
        }
      }
    ]);
    
    const avg_score_stats = scoreStats.length > 0 
      ? {
          avg: parseFloat(scoreStats[0].avg.toFixed(2)),
          min: parseFloat(scoreStats[0].min.toFixed(2)),
          max: parseFloat(scoreStats[0].max.toFixed(2))
        }
      : { avg: 0, min: 0, max: 0 };
    
    res.json({
      success: true,
      data: {
        total_drivers,
        total_feedback,
        alert_count,
        sentiment_breakdown,
        avg_score_stats
      }
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// GET /admin/drivers - List all drivers
router.get('/drivers', async (req, res) => {
  try {
    const { sort = 'avg_score', order = 'asc', search = '' } = req.query;
    
    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { driver_id: new RegExp(search, 'i') }
      ];
    }
    
    // Build sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sort] = sortOrder;
    
    const drivers = await Driver.find(query).sort(sortObj);
    
    res.json({
      success: true,
      data: {
        drivers,
        total: drivers.length
      }
    });
    
  } catch (error) {
    console.error('List drivers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch drivers' 
    });
  }
});

// GET /admin/drivers/:id - Get driver details with recent feedback
router.get('/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find driver by driver_id or MongoDB _id
    const driver = await Driver.findOne({
      $or: [{ driver_id: id }, { _id: id }]
    });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    // Get recent feedback for this driver
    const recentFeedback = await Feedback.find({ 
      entity_type: 'driver',
      entity_id: driver.driver_id 
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('user_id', 'name email');
    
    res.json({
      success: true,
      data: {
        driver,
        recent_feedback: recentFeedback
      }
    });
    
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch driver details' 
    });
  }
});

// GET /admin/alerts - Get drivers with low scores
router.get('/alerts', async (req, res) => {
  try {
    const config = await Config.findById('feedback_config');
    const threshold = config?.alert_threshold || 2.5;
    
    // Find drivers below threshold with at least some feedback
    const lowScoreDrivers = await Driver.find({
      avg_score: { $lt: threshold, $gt: 0 },
      total_feedback: { $gt: 0 }
    }).sort({ avg_score: 1 });
    
    // Get recent alerts
    const recentAlerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: {
        drivers: lowScoreDrivers,
        threshold,
        recent_alerts: recentAlerts
      }
    });
    
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alerts' 
    });
  }
});

// GET /admin/feedback - Get all feedback with filters
router.get('/feedback', async (req, res) => {
  try {
    const { 
      entity_type, 
      sentiment, 
      entity_id,
      limit = 50,
      offset = 0 
    } = req.query;
    
    // Build query
    const query = {};
    if (entity_type) {
      query.entity_type = entity_type;
    }
    if (sentiment) {
      query.sentiment = sentiment;
    }
    if (entity_id) {
      query.entity_id = entity_id;
    }
    
    const feedbacks = await Feedback.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('user_id', 'name email');
    
    const total = await Feedback.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        feedbacks,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch feedback' 
    });
  }
});

module.exports = router;
