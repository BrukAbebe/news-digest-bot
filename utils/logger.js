const isDevelopment = process.env.NODE_ENV === 'development';

const createMainMenu = () => ({
    reply_markup: {
      keyboard: [
        ['📰 Get News', '📋 My Subscriptions'],
        ['⏰ Set Time', '⚙️ Settings', 'ℹ️ Help']
      ],
      resize_keyboard: true
    }
  });

const logError = (error, context = '') => {
  if (isDevelopment) {
    console.error(`[DEV ERROR] ${context}:`, error.stack || error);
  }
};

const logInfo = (message) => {
  if (isDevelopment) {
    console.log(`[INFO] ${message}`);
  }
};

const sendUserError = async (bot, chatId, customMessage = 'Something went wrong. Please try again.') => {
  try {
    await bot.sendMessage(chatId, customMessage,createMainMenu());
  } catch (err) {
    logError(err, 'Failed to send error message to user');
    
  }
};

module.exports = {
  logError,
  logInfo,
  sendUserError
};