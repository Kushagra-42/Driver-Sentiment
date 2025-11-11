require('dotenv').config();
const { Kafka } = require('kafkajs');
const connectDB = require('./database');
const { Driver, Feedback, Config, Alert } = require('./models');
const { getPredictions, getSentimentLabel } = require('./sentimentService');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'consumer-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID || 'sentiment-workers',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxWaitTimeInMs: 1000,
  minBytes: 1,
  maxBytes: 10485760
});

let stats = {
  totalProcessed: 0,
  driverFeedback: 0,
  otherFeedback: 0,
  alertsGenerated: 0,
  errors: 0
};

const calculateEMA = (oldAvg, newRating, alpha) => {
  return alpha * newRating + (1 - alpha) * oldAvg;
};

const checkAndGenerateAlert = async (driverId, avgScore, threshold, cooldownSeconds) => {
  try {
    if (avgScore >= threshold) {
      return false;
    }
    
    const cooldownMs = cooldownSeconds * 1000;
    const cutoffTime = new Date(Date.now() - cooldownMs);
    
    const recentAlert = await Alert.findOne({
      driver_id: driverId,
      last_alert_at: { $gte: cutoffTime }
    });
    
    if (recentAlert) {
      return false;
    }
    
    await Alert.create({
      driver_id: driverId,
      avg_score: avgScore,
      threshold: threshold,
      last_alert_at: new Date()
    });
    
    console.log(`ALERT: Driver ${driverId} has low score: ${avgScore.toFixed(2)} (threshold: ${threshold})`);
    
    return true;
  } catch (error) {
    console.error('Alert generation error:', error);
    return false;
  }
};

const processBatch = async (messages) => {
  console.log(`\nProcessing batch of ${messages.length} messages...`);
  
  try {
    const config = await Config.findById('feedback_config');
    if (!config) {
      console.error('Configuration not found');
      return;
    }
    
    const { ema_alpha, alert_threshold, alert_cooldown_s } = config;
    
    const parsedMessages = messages.map(msg => JSON.parse(msg.value.toString()));
    
    const driverFeedback = parsedMessages.filter(m => 
      m.entity_type === 'driver' && 
      config.features.driver_feedback?.requires_sentiment
    );
    
    const otherFeedback = parsedMessages.filter(m => 
      m.entity_type !== 'driver' ||
      !config.features[`${m.entity_type}_feedback`]?.requires_sentiment
    );
    
    console.log(`- Driver feedback : ${driverFeedback.length}`);
    console.log(`- Other feedback : ${otherFeedback.length}`);
    
    if (driverFeedback.length > 0) {
      await processDriverFeedback(driverFeedback, ema_alpha, alert_threshold, alert_cooldown_s);
    }
    
    if (otherFeedback.length > 0) {
      await processOtherFeedback(otherFeedback);
    }
    
    stats.totalProcessed += messages.length;
    stats.driverFeedback += driverFeedback.length;
    stats.otherFeedback += otherFeedback.length;
    
    console.log(`Batch processed successfully`);
    
  } catch (error) {
    console.error('Batch processing error:', error);
    stats.errors++;
    throw error;
  }
};

const processDriverFeedback = async (feedbacks, alpha, threshold, cooldown) => {
  try {
    const texts = feedbacks.map(f => f.text);
    
    console.log(`   Calling model server for ${texts.length} texts...`);
    const predictions = await getPredictions(texts);
    
    const newFeedbackIds = [];
    
    for (let i = 0; i < feedbacks.length; i++) {
      const feedback = feedbacks[i];
      const predictedScore = predictions[i];
      
      const starRating = feedback.rating;
      const modelRating = predictedScore;
      const combinedScore = parseFloat(((starRating + modelRating) / 2).toFixed(2));
      
      const sentiment = getSentimentLabel(combinedScore);
      
      if (i < 3) {
        console.log(`   Feedback ${i+1}: star=${starRating}, model=${modelRating.toFixed(2)}, combined=${combinedScore}, sentiment=${sentiment}`);
      }
      
      try {
        await Feedback.create({
          _id: feedback.message_id,
          entity_type: feedback.entity_type,
          entity_id: feedback.entity_id,
          user_id: feedback.user_id,
          rating: feedback.rating,
          text: feedback.text,
          predicted_score: predictedScore,
          combined_score: combinedScore,
          sentiment: sentiment,
          timestamp: new Date(feedback.timestamp)
        });
        
        newFeedbackIds.push({ 
          driverId: feedback.entity_id, 
          combinedRating: combinedScore
        });
        
      } catch (error) {
        if (error.code === 11000) {
          console.log(`Message ${feedback.message_id} already processed (skipping)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`   Saved ${newFeedbackIds.length} new driver feedbacks`);
    
    if (newFeedbackIds.length > 0) {
      await updateDriverScores(newFeedbackIds, alpha, threshold, cooldown);
    }
    
  } catch (error) {
    console.error('Driver feedback processing error:', error);
    throw error;
  }
};

const updateDriverScores = async (feedbacks, alpha, threshold, cooldown) => {
  try {
    const driverGroups = {};
    feedbacks.forEach(({ driverId, combinedRating }) => {
      if (!driverGroups[driverId]) {
        driverGroups[driverId] = [];
      }
      driverGroups[driverId].push(combinedRating);
    });
    
    const driverIds = Object.keys(driverGroups);
    console.log(`   Updating scores for ${driverIds.length} drivers...`);
    
    for (const driverId of driverIds) {
      const combinedRatings = driverGroups[driverId];
      
      const driver = await Driver.findOne({ driver_id: driverId });
      if (!driver) {
        console.warn(`   Driver ${driverId} not found, skipping`);
        continue;
      }
      
      let newAvg = driver.avg_score || 0;
      for (const combinedRating of combinedRatings) {
        if (newAvg === 0) {
          newAvg = combinedRating;
        } else {
          newAvg = calculateEMA(newAvg, combinedRating, alpha);
        }
      }
      
      driver.avg_score = parseFloat(newAvg.toFixed(2));
      driver.total_feedback += combinedRatings.length;
      await driver.save();
      
      console.log(`   Driver ${driverId}: avg_score = ${driver.avg_score}, total_feedback = ${driver.total_feedback}`);
      
      const alertGenerated = await checkAndGenerateAlert(
        driverId, 
        driver.avg_score, 
        threshold, 
        cooldown
      );
      
      if (alertGenerated) {
        stats.alertsGenerated++;
      }
    }
    
  } catch (error) {
    console.error('Driver score update error:', error);
    throw error;
  }
};

const processOtherFeedback = async (feedbacks) => {
  try {
    const newFeedbacks = [];
    
    for (const feedback of feedbacks) {
      try {
        await Feedback.create({
          _id: feedback.message_id,
          entity_type: feedback.entity_type,
          entity_id: feedback.entity_id,
          user_id: feedback.user_id,
          rating: feedback.rating,
          text: feedback.text,
          predicted_score: null,
          sentiment: null,
          timestamp: new Date(feedback.timestamp)
        });
        
        newFeedbacks.push(feedback.message_id);
        
      } catch (error) {
        if (error.code === 11000) {
          console.log(`   Message ${feedback.message_id} already processed (skipping)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`   Saved ${newFeedbacks.length} new other feedbacks`);
    
  } catch (error) {
    console.error('Other feedback processing error:', error);
    throw error;
  }
};

const printStats = () => {
  console.log('\nConsumer Statistics:');
  console.log(`   Total processed: ${stats.totalProcessed}`);
  console.log(`   Driver feedback: ${stats.driverFeedback}`);
  console.log(`   Other feedback: ${stats.otherFeedback}`);
  console.log(`   Alerts generated: ${stats.alertsGenerated}`);
  console.log(`   Errors: ${stats.errors}`);
};

const startConsumer = async () => {
  try {
    await connectDB();
    
    await consumer.connect();
    console.log('Kafka Consumer connected');
    
    await consumer.subscribe({ 
      topic: process.env.KAFKA_TOPIC || 'feedback',
      fromBeginning: false 
    });
    console.log(`Subscribed to topic: ${process.env.KAFKA_TOPIC || 'feedback'}`);
    
    await consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        try {
          await processBatch(batch.messages);
          
          const lastMessage = batch.messages[batch.messages.length - 1];
          await resolveOffset(lastMessage.offset);
          
          await heartbeat();
          
        } catch (error) {
          console.error('Batch processing failed:', error);
          throw error;
        }
      }
    });
    
    console.log('\nConsumer is running and waiting for messages...');
    console.log('Press Ctrl+C to stop\n');
    
    setInterval(printStats, 30000);
    
  } catch (error) {
    console.error('Failed to start consumer:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log('\nShutting down consumer gracefully...');
  
  try {
    printStats();
    await consumer.disconnect();
    console.log('Consumer disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startConsumer();
