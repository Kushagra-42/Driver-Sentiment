require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { connectProducer, disconnectProducer } = require('./config/kafka');

const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'API Server' });
});

app.use('/auth', authRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/admin', adminRoutes);
app.use('/config', configRoutes);

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  
  try {
    await disconnectProducer();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const startServer = async () => {
  try {
    await connectDB();
    await connectProducer();
    
    app.listen(PORT, () => {
      console.log(`\nAPI Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\nAvailable routes:`);
      console.log(`   POST   /auth/register`);
      console.log(`   POST   /auth/login`);
      console.log(`   POST   /auth/refresh`);
      console.log(`   POST   /auth/logout`);
      console.log(`   GET    /auth/me`);
      console.log(`   POST   /feedback`);
      console.log(`   GET    /feedback/drivers`);
      console.log(`   GET    /admin/stats`);
      console.log(`   GET    /admin/drivers`);
      console.log(`   GET    /admin/alerts`);
      console.log(`   GET    /admin/feedback`);
      console.log(`   GET    /config`);
      console.log(`   PATCH  /config`);
      console.log(`\nServer ready to accept requests\n`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
