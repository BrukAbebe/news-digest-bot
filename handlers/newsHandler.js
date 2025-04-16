const bot = require('../config/bot');
const UserPreference = require('../models/userPreferences');
const { fetchNewsByCategory } = require('../services/newsService');
const { logError, logInfo, sendUserError } = require('../utils/logger');

// News categories with emojis
const categories = [
  { name: 'Business', emoji: '💼', value: 'business' },
  { name: 'Entertainment', emoji: '🎬', value: 'entertainment' },
  { name: 'General', emoji: '🌐', value: 'general' },
  { name: 'Health', emoji: '🏥', value: 'health' },
  { name: 'Science', emoji: '🔬', value: 'science' },
  { name: 'Sports', emoji: '⚽', value: 'sports' },
  { name: 'Technology', emoji: '💻', value: 'technology' }
];

// Helper functions
const createMainMenu = () => ({
  reply_markup: {
    keyboard: [
      ['📰 Get News', '📋 My Subscriptions'],
      ['⚙️ Settings', 'ℹ️ Help']
    ],
    resize_keyboard: true
  }
});

const createCategoryKeyboard = (actionPrefix) => ({
  reply_markup: {
    inline_keyboard: [
      ...categories.map(cat => [{
        text: `${cat.emoji} ${cat.name}`,
        callback_data: `${actionPrefix}_${cat.value}`
      }]),
      [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
    ]
  }
});

const showSubscriptionManagement = async (chatId) => {
  try {
    const user = await UserPreference.findOne({ chatId });
    const userSubs = user?.categories.map(c => c.name) || [];

    return {
      reply_markup: {
        inline_keyboard: [
          ...categories.map(cat => {
            const isSubscribed = userSubs.includes(cat.value);
            return [{
              text: `${isSubscribed ? '✅ ' : '📌 '}${cat.emoji} ${cat.name}`,
              callback_data: isSubscribed ? `unsub_${cat.value}` : `sub_${cat.value}`
            }];
          }),
          [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
        ]
      }
    };
  } catch (err) {
    logError(err, 'Subscription management');
    return {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚠️ Error loading subscriptions', callback_data: 'main_menu' }]
        ]
      }
    };
  }
};

// Command handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  try {
    await UserPreference.updateOne(
      { chatId },
      {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        lastActive: new Date(),
        'settings.receiveWelcome': true
      },
      { upsert: true }
    );

    await bot.sendMessage(
      chatId,
      `👋 *Welcome ${user.first_name || ''} to NewsBot!*\n\n` +
      `📡 Get the latest news in any category\n` +
      `⚡ Quick access to trending topics\n\n` +
      `_Use the menu below or type /help for guidance_`,
      { 
        parse_mode: 'Markdown',
        ...createMainMenu() 
      }
    );
    logInfo(`New user started: ${user.username || user.first_name} (${chatId})`);
  } catch (err) {
    logError(err, 'Start command');
    await sendUserError(bot, chatId, 'Failed to initialize. Please try again.');
  }
});

bot.onText(/\/news|📰 get news/i, (msg) => {
  try {
    bot.sendMessage(
      msg.chat.id,
      '📡 *Select a news category:*',
      { 
        parse_mode: 'Markdown',
        ...createCategoryKeyboard('fetch') 
      }
    );
    logInfo(`News menu requested by ${msg.chat.id}`);
  } catch (err) {
    logError(err, 'News command');
    sendUserError(bot, msg.chat.id);
  }
});

bot.onText(/\/subscriptions|📋 my subscriptions/i, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await UserPreference.findOne({ chatId });
    if (!user?.categories?.length) {
      await bot.sendMessage(
        chatId,
        '🔔 *You have no subscriptions yet*\n\n' +
        'Subscribe to categories to quickly access your favorite news.',
        { 
          parse_mode: 'Markdown',
          ...await showSubscriptionManagement(chatId) 
        }
      );
      return;
    }
    
    const subList = user.categories.map(c => {
      const catInfo = categories.find(cat => cat.value === c.name);
      return `• ${catInfo?.emoji || '📰'} ${catInfo?.name || c.name}`;
    }).join('\n');
    
    await bot.sendMessage(
      chatId,
      `📋 *Your Current Subscriptions*\n\n${subList}\n\n` +
      `_Manage your subscriptions below:_`,
      { 
        parse_mode: 'Markdown',
        ...await showSubscriptionManagement(chatId) 
      }
    );
    logInfo(`Subscriptions viewed by ${chatId}`);
  } catch (err) {
    logError(err, 'Subscriptions command');
    await sendUserError(bot, chatId, 'Failed to load subscriptions.');
  }
});

bot.onText(/\/settings|⚙️ settings/i, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await UserPreference.findOne({ chatId });
    await bot.sendMessage(
      chatId,
      `⚙️ *Your Settings*\n\n` +
      `📰 *News Format:* ${user?.settings.digestFormat === 'detailed' ? 'Detailed' : 'Compact'}\n` +
      `🔔 *Notifications:* ${user?.settings.notifyUpdates ? 'On' : 'Off'}\n\n` +
      `_Change settings below:_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{
              text: `📰 Switch to ${user?.settings.digestFormat === 'detailed' ? 'Compact' : 'Detailed'} Format`,
              callback_data: 'toggle_format'
            }],
            [{
              text: `🔔 ${user?.settings.notifyUpdates ? 'Disable' : 'Enable'} Notifications`,
              callback_data: 'toggle_notify'
            }],
            [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    logInfo(`Settings viewed by ${chatId}`);
  } catch (err) {
    logError(err, 'Settings command');
    await sendUserError(bot, chatId);
  }
});

bot.onText(/\/help|ℹ️ help/i, async (msg) => {
  try {
    await bot.sendMessage(
      msg.chat.id,
      `ℹ️ *NewsBot Help*\n\n` +
      `*Main Commands:*\n` +
      `/start - Initialize the bot\n` +
      `/news - Browse news categories\n` +
      `/subscriptions - Manage your subscriptions\n` +
      `/settings - Configure your preferences\n` +
      `/help - Show this message\n\n` +
      `*Features:*\n` +
      `• Clickable category buttons\n` +
      `• Personalized news access\n` +
      `• Compact/detailed news formats\n\n` +
      `_Use the menu buttons for easy navigation_`,
      { parse_mode: 'Markdown' }
    );
    logInfo(`Help requested by ${msg.chat.id}`);
  } catch (err) {
    logError(err, 'Help command');
    await sendUserError(bot, msg.chat.id);
  }
});

// Callback query handler
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  if (!data) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Invalid request' });
    return;
  }

  try {
    // Handle news category selection
    if (data.startsWith('fetch_')) {
      const category = data.split('_')[1];
      const categoryInfo = categories.find(c => c.value === category);
      
      if (!categoryInfo) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ Category not found' });
        return;
      }

      await bot.sendChatAction(chatId, 'typing');
      const news = await fetchNewsByCategory(category);
      
      await bot.editMessageText(
        `${categoryInfo.emoji} *${categoryInfo.name} News*\n\n${news}`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [{ text: `✅ Subscribe to ${categoryInfo.name}`, callback_data: `sub_${category}` }],
              [{ text: '🔙 Back to Categories', callback_data: 'fetch_menu' }]
            ]
          }
        }
      );
      logInfo(`News fetched for ${category} by ${chatId}`);
    }
    // Handle subscription
    else if (data.startsWith('sub_')) {
      const category = data.split('_')[1];
      const categoryInfo = categories.find(c => c.value === category);
      
      if (!categoryInfo) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ Category not found' });
        return;
      }

      await UserPreference.updateOne(
        { chatId },
        { 
          $addToSet: { categories: { name: category } },
          lastActive: new Date()
        },
        { upsert: true }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Subscribed to ${categoryInfo.name} news!`
      });
      
      await bot.editMessageReplyMarkup(
        (await showSubscriptionManagement(chatId)).reply_markup,
        { chat_id: chatId, message_id: messageId }
      );
      logInfo(`Subscribed to ${category} by ${chatId}`);
    }
    // Handle unsubscription
    else if (data.startsWith('unsub_')) {
      const category = data.split('_')[1];
      const categoryInfo = categories.find(c => c.value === category);
      
      if (!categoryInfo) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ Category not found' });
        return;
      }

      await UserPreference.updateOne(
        { chatId },
        { $pull: { categories: { name: category } }}
      );
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Unsubscribed from ${categoryInfo.name} news`
      });
      
      await bot.editMessageReplyMarkup(
        (await showSubscriptionManagement(chatId)).reply_markup,
        { chat_id: chatId, message_id: messageId }
      );
      logInfo(`Unsubscribed from ${category} by ${chatId}`);
    }
    // Toggle news format
    else if (data === 'toggle_format') {
      const user = await UserPreference.findOne({ chatId });
      if (!user) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ User not found' });
        return;
      }

      const newFormat = user.settings.digestFormat === 'detailed' ? 'compact' : 'detailed';
      
      await UserPreference.updateOne(
        { chatId },
        { 'settings.digestFormat': newFormat }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Switched to ${newFormat} format`
      });
      
      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [{
              text: `📰 Switch to ${newFormat === 'detailed' ? 'Compact' : 'Detailed'} Format`,
              callback_data: 'toggle_format'
            }],
            [{
              text: `🔔 ${user.settings.notifyUpdates ? 'Disable' : 'Enable'} Notifications`,
              callback_data: 'toggle_notify'
            }],
            [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
          ]
        },
        { chat_id: chatId, message_id: messageId }
      );
      logInfo(`Format changed to ${newFormat} by ${chatId}`);
    }
    // Toggle notifications
    else if (data === 'toggle_notify') {
      const user = await UserPreference.findOne({ chatId });
      if (!user) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ User not found' });
        return;
      }

      const newNotify = !user.settings.notifyUpdates;
      
      await UserPreference.updateOne(
        { chatId },
        { 'settings.notifyUpdates': newNotify }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Notifications ${newNotify ? 'enabled' : 'disabled'}`
      });
      
      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [{
              text: `📰 Switch to ${user.settings.digestFormat === 'detailed' ? 'Compact' : 'Detailed'} Format`,
              callback_data: 'toggle_format'
            }],
            [{
              text: `🔔 ${newNotify ? 'Disable' : 'Enable'} Notifications`,
              callback_data: 'toggle_notify'
            }],
            [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
          ]
        },
        { chat_id: chatId, message_id: messageId }
      );
      logInfo(`Notifications ${newNotify ? 'enabled' : 'disabled'} by ${chatId}`);
    }
    // Navigation
    else if (data === 'main_menu') {
      await bot.deleteMessage(chatId, messageId);
      await bot.sendMessage(
        chatId,
        'Returning to main menu:',
        createMainMenu()
      );
      logInfo(`Returned to main menu by ${chatId}`);
    }
    else if (data === 'fetch_menu') {
      await bot.editMessageText(
        '📡 Select a news category:',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: createCategoryKeyboard('fetch').reply_markup
        }
      );
    }
    else {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown command' });
    }
  } catch (err) {
    logError(err, 'Callback query');
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '⚠️ An error occurred. Please try again.'
    });
  }
});