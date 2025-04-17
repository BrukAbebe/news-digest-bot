const axios = require('axios');
const { NEWS_API_KEY } = process.env;
const { logError, logInfo } = require('../utils/logger');

const formatCompactNews = (articles, category) => {
  if (!articles || !articles.length) {
    return `📭 No recent ${category} news found.\nTry again later or choose another category.`;
  }

  return `📰 *${category.toUpperCase()} NEWS*\n\n` +
    articles.slice(0, 5).map((article, i) => 
      `${i + 1}. [${article.title || 'No title'}](${article.url || '#'})` +
      (article.description ? `\n   ${article.description.substring(0, 100)}...` : '')
    ).join('\n\n');
};

const formatDetailedNews = (articles, category) => {
  if (!articles || !articles.length) {
    return `📭 No recent ${category} news found.\nTry again later or choose another category.`;
  }

  return `🌐 *${category.toUpperCase()} NEWS DIGEST*\n\n` +
    articles.slice(0, 5).map((article, i) => 
      `*${i + 1}. ${article.title || 'No title'}*\n` +
      (article.author ? `_By ${article.author}_\n` : '') +
      (article.description ? `${article.description}\n` : '') +
      (article.content ? `${article.content.replace(/\[\+\d+ chars\]/, '')}\n` : '') +
      `[Read more](${article.url || '#'})`
    ).join('\n\n────────────────────\n\n') +
    `\n\n🔔 _Want these updates daily? Use /subscribe_`;
};

module.exports = {
  fetchNewsByCategory: async (category, format = 'compact') => {
    if (!category || typeof category !== 'string') {
      throw new Error('Invalid category specified');
    }
    console.log('🧪 Fetching news category:', category);
    console.log('🔐 Using API Key:', process.env.NEWS_API_KEY);


    try {
      const { data } = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          country: 'us',
          category,
          pageSize: 5,
          apiKey: NEWS_API_KEY,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' + 
                        ' AppleWebKit/537.36 (KHTML, like Gecko)' +
                        ' Chrome/89.0.4389.82 Safari/537.36'
        },
        timeout: 5000
      });
      

      if (!data.articles) {
        
        throw new Error('Invalid response format from news API');
      }

      return format === 'detailed' 
        ? formatDetailedNews(data.articles, category)
        : formatCompactNews(data.articles, category);
    } catch (err) {
      console.error('❌ Axios error:', err?.response?.data || err.message);
      logError(err, `Fetching ${category} news`);
      if (err.response?.status === 429) {
        throw new Error('⚠️ Too many requests. Please try again in a few minutes.');
      }
      throw new Error('⚠️ News service is temporarily unavailable. Please try again later.');
    }
  }
};