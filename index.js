require('dotenv').config();
const connectDB = require('./config/db');
const { logError, logInfo } = require('./utils/logger');

process.on('uncaughtException', (err) => {
  logError(err, 'Uncaught Exception');
  process.exit(1);
});

(async () => {
  try {
    await connectDB();
    logInfo('Database connected');
    
    require('./handlers/newsHandler');
    logInfo('Bot handlers loaded');
    
    logInfo('🚀 NewsBot is running');
  } catch (err) {
    logError(err, 'Application startup');
    process.exit(1);
  }
})();

process.on('unhandledRejection', (err) => {
  logError(err, 'Unhandled Rejection');
});

process.on('SIGTERM', () => {
  logInfo('SIGTERM received - shutting down');
  process.exit(0);
});