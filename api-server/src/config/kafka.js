const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'api-server',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();

let isConnected = false;

const connectProducer = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('Kafka Producer connected');
  }
};

const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('Kafka Producer disconnected');
  }
};

const sendMessage = async (topic, key, value) => {
  try {
    await connectProducer();
    
    const result = await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value)
        }
      ]
    });
    
    return result;
  } catch (error) {
    console.error('Kafka send error:', error);
    throw error;
  }
};

module.exports = {
  connectProducer,
  disconnectProducer,
  sendMessage
};
