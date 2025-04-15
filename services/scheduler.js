const cron = require('node-cron');
const UserPreference = require('../models/userPreferences');
const { fetchNewsByCategory } = require('./newsService');
const bot = require('../config/bot');
const { logError, logInfo } = require('../utils/logger');

const getTimeOfDay = (hours) => {
  if (hours < 12) return 'morning';
  if (hours < 17) return 'afternoon';
  return 'evening';
};

const sendCategoryNews = async (chatId, category, format) => {
  try {
    const news = await fetchNewsByCategory(category, format);
    await bot.sendMessage(
      chatId,
      news,
      { 
        parse_mode: 'Markdown', 
        disable_web_page_preview: true 
      }
    );
    return true;
  } catch (err) {
    logError(err, `Sending ${category} news to ${chatId}`);
    await bot.sendMessage(
      chatId,
      `⚠️ Failed to fetch ${category} news. We'll try again in your next digest.`,
      { parse_mode: 'Markdown' }
    );
    return false;
  }
};

const sendDailyDigests = async () => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timeOfDay = getTimeOfDay(now.getHours());

  try {
    const users = await UserPreference.find({
      'categories.0': { $exists: true },
      digestTime: currentTime
    });

    logInfo(`Found ${users.length} users for digest delivery`);

    for (const user of users) {
      try {
        const greeting = `🌞 *Good ${timeOfDay} ${user.firstName || 'there'}!*\n\n` +
          `Here's your ${user.categories.length > 1 ? 
            `${user.categories.length}-category` : user.categories[0].name} news digest for ${currentTime}:\n`;
        
        await bot.sendMessage(
          user.chatId, 
          greeting, 
          { parse_mode: 'Markdown' }
        );

        // Send each category with delay
        for (const [index, category] of user.categories.entries()) {
          const success = await sendCategoryNews(
            user.chatId,
            category.name,
            user.settings.digestFormat
          );
          
          // Add delay between categories (1.5 seconds)
          if (success && index < user.categories.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }

        // Send digest footer
        await bot.sendMessage(
          user.chatId,
          `✅ *Digest delivered at ${currentTime}*\n\n` +
          `You're receiving ${user.categories.length} category${user.categories.length > 1 ? 's' : ''} daily.\n\n` +
          `_Manage your subscriptions:_ /subscriptions\n` +
          `_Change delivery time:_ /time`,
          { parse_mode: 'Markdown' }
        );

      } catch (err) {
        logError(err, `Processing digest for ${user.chatId}`);
      }
    }
  } catch (err) {
    logError(err, 'Scheduler main loop');
  }
};

// Initialize scheduler
const initScheduler = () => {
  // Run every minute to check for scheduled digests
  cron.schedule('* * * * *', sendDailyDigests);
  logInfo('Scheduler initialized');
};

module.exports = { initScheduler, sendDailyDigests };