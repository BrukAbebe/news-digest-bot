const TelegramBot = require('node-telegram-bot-api');
const { logError } = require('../utils/logger');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
  polling: true,
  request: {
    proxy: process.env.PROXY || null
  }
});

bot.on('polling_error', (error) => {
  logError(error, 'Polling error');
});

bot.on('webhook_error', (error) => {
  logError(error, 'Webhook error');
});

module.exports = bot;