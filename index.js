require('dotenv').config();
const connectDB = require('./config/db');
const { logError, logInfo } = require('./utils/logger');
const http = require('http');

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
    
    
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Telegram Bot is running');
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logInfo(`Dummy server running on port ${PORT}`);
      logInfo('🚀 NewsBot is running');
    });
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