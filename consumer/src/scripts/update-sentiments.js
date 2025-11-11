require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('../database');
const { Feedback, Config } = require('../models');

const getSentimentLabel = (score, threshold = 2.5) => {
  const positiveThreshold = threshold + 1.0;
  if (score >= positiveThreshold) return 'positive';
  if (score >= threshold) return 'neutral';
  return 'negative';
};

const updateSentiments = async () => {
  try {
    console.log('Starting sentiment update...\n');
    
    await connectDB();
    
    const config = await Config.findById('feedback_config');
    if (!config) {
      console.error('Configuration not found');
      process.exit(1);
    }
    
    const threshold = config.alert_threshold || 2.5;
    console.log(`Using alert threshold: ${threshold}`);
    console.log(`Sentiment ranges:`);
    console.log(`  Negative: < ${threshold}`);
    console.log(`  Neutral: ${threshold} to < ${threshold + 1}`);
    console.log(`  Positive: >= ${threshold + 1}\n`);
    
    const feedbacks = await Feedback.find({ 
      combined_score: { $exists: true, $ne: null },
      entity_type: 'driver'
    });
    
    console.log(`Found ${feedbacks.length} feedbacks to update\n`);
    
    let updated = 0;
    for (const feedback of feedbacks) {
      const newSentiment = getSentimentLabel(feedback.combined_score, threshold);
      
      if (feedback.sentiment !== newSentiment) {
        feedback.sentiment = newSentiment;
        await feedback.save();
        updated++;
        
        if (updated <= 5) {
          console.log(`Updated: ${feedback._id} - Score: ${feedback.combined_score}, Old: ${feedback.sentiment} -> New: ${newSentiment}`);
        }
      }
    }
    
    console.log(`\nUpdate complete!`);
    console.log(`Total feedbacks processed: ${feedbacks.length}`);
    console.log(`Feedbacks updated: ${updated}`);
    console.log(`Feedbacks unchanged: ${feedbacks.length - updated}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
};

updateSentiments();
