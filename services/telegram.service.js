// services/telegram.service.js

/**
 * Sends a text message to a specific Telegram chat.
 */
function escapeTelegramMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  // Escape underscore which often causes "Can't find end of the entity" errors in Markdown
  return text.replace(/_/g, '\\_');
}

export async function sendTelegramMessage(bot, chatId, text, options = {}) {
  try {
    const safeText = escapeTelegramMarkdown(text);
    const sendOptions = { parse_mode: "Markdown" };
    if (Array.isArray(options.buttons) && options.buttons.length) {
      const hasUrl = options.buttons.some(b => b.type === 'url');
      if (hasUrl) {
        sendOptions.reply_markup = {
          inline_keyboard: [
            options.buttons.map(b => (
              b.type === 'url' ? { text: b.title, url: b.url } : { text: b.title, callback_data: b.id || b.title }
            ))
          ]
        };
      } else {
        // Fallback to standard reply keyboard for pure text replies
        sendOptions.reply_markup = {
          keyboard: [
            options.buttons.map(b => ({ text: b.title }))
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        };
      }
    }
    return await bot.sendMessage(chatId, safeText, sendOptions);
  } catch (err) {
    console.error("Telegram Send Message Error:", err);
    throw err;
  }
}

/**
 * Sends a photo to a specific Telegram chat.
 */
export async function sendTelegramPhoto(bot, chatId, url, caption) {
  try {
    return await bot.sendPhoto(chatId, url, {
      caption: caption,
      parse_mode: "Markdown"
    });
  } catch (err) {
    console.error("Telegram Send Photo Error:", err);
    throw err;
  }
}