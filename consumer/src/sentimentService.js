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

const getSentimentLabel = (score) => {
  if (score >= 3.5) return 'positive';
  if (score >= 2.5) return 'neutral';
  return 'negative';
};

module.exports = {
  getPredictions,
  getSentimentLabel
};
