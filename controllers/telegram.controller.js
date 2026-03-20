// controllers/telegram.controller.js
import { sendTelegramMessage, sendTelegramPhoto } from "../services/telegram.service.js";
import { processUserMessageWithTimeout } from "../controllers/bot.controller.js"; // The shared "Brain" with timeout
import { hasProcessedMessage, markMessageProcessed } from "../services/user.service.js";

export function startTelegramBot(bot) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const incoming = msg.text?.trim();
    // Ensure ID is a string to match WhatsApp format in the DB
    const number = msg.from.id.toString(); 

    if (!incoming) return; // Ignore non-text messages for now

    // Deduplicate using chatId + message id
    const dedupeKey = `${chatId}:${msg.message_id}`;
    try {
      const already = await hasProcessedMessage('telegram', dedupeKey);
      if (already) return; // Already handled

      // Reserve the message id (fail-open)
      await markMessageProcessed('telegram', dedupeKey, number);
    } catch (err) {
      console.error('Telegram dedupe error:', err);
      // Fail-open: continue processing
    }

    try {
      // 1. Send to the shared "Brain" with timeout (same logic used by WhatsApp)
      const response = await processUserMessageWithTimeout(number, incoming);

      // 2. Send back to Telegram based on response type
      if (response.type === 'image') {
        await sendTelegramPhoto(
          bot, 
          chatId, 
          response.url, 
          response.content
        );
      } else if (response.type === 'interactive') {
        await sendTelegramMessage(
          bot,
          chatId,
          response.content.text,
          { buttons: response.content.buttons }
        );
      } else {
        await sendTelegramMessage(
          bot, 
          chatId, 
          response.content
        );
      }

    } catch (error) {
      console.error("Telegram Handler Error:", error.message);
      const msg = error.message.includes('timeout') 
        ? "⏱️ Processing took too long. Please try again." 
        : "❌ Something went wrong. Please try again later.";
      await sendTelegramMessage(bot, chatId, msg);
    }
  });
}