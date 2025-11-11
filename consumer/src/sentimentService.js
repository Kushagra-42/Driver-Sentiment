const axios = require('axios');

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:8000';

const getPredictions = async (texts) => {
  try {
    const response = await axios.post(`${MODEL_SERVER_URL}/predict_batch`, {
      texts
    });
    
    return response.data.scores;
  } catch (error) {
    console.error('Model server error:', error.message);
    throw error;
  }
};

const getSentimentLabel = (score, threshold = 2.5) => {
  const positiveThreshold = threshold + 1.0;
  if (score >= positiveThreshold) return 'positive';
  if (score >= threshold) return 'neutral';
  return 'negative';
};

module.exports = {
  getPredictions,
  getSentimentLabel
};
