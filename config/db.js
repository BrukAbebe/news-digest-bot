const mongoose = require('mongoose');
const { logError, logInfo } = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logInfo('MongoDB connected');
  } catch (err) {
    logError(err, 'MongoDB connection');
    process.exit(1);
  }
};

module.exports = connectDB;