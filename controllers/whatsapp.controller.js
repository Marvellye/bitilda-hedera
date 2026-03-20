import { processUserMessageWithTimeout } from "./bot.controller.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";
import { hasProcessedMessage, markMessageProcessed } from "../services/user.service.js";

/**
 * Handles GET webhook verification from Meta (WhatsApp Cloud API)
 */
export async function verifyWebhook(req, res) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WHATSAPP-WEBHOOK] VERIFIED');
      return res.status(200).send(challenge);
    } else {
      console.error('[WHATSAPP-WEBHOOK] VERIFICATION FAILED: Forbidden token');
      return res.sendStatus(403);
    }
  }
}

/**
 * Handles POST webhook for inbound WhatsApp messages
 */
export async function handleWebhook(req, res) {
  const { body } = req;

  if (!body.object || !body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    return res.sendStatus(200); 
  }

  const change = body.entry[0].changes[0].value;
  const message = change.messages[0];
  const from = message.from; // Phone number
  const messageId = message.id;
  const text = message.text?.body?.trim();

  if (!text) return res.sendStatus(200); 

  // Deduplicate using messageId
  const already = await hasProcessedMessage('whatsapp', messageId);
  if (already) return res.sendStatus(200);

  // Mark as processed (fail-open)
  await markMessageProcessed('whatsapp', messageId, from);

  // Fire-and-forget processing to respond 200 to WhatsApp immediately
  res.sendStatus(200);

  try {
     const response = await processUserMessageWithTimeout(from, text);
     
     if (response.type === 'image') {
       // Cloud API needs a separate call for media, but for now we'll send the text part + URL link
       await sendWhatsAppMessage(from, `${response.content}\n\n🖼️ QR: ${response.url}`);
     } else if (response.type === 'interactive') {
       // Currently only handle text response, interactive buttons would require extra formatting
       await sendWhatsAppMessage(from, response.content.text);
     } else {
       await sendWhatsAppMessage(from, response.content);
     }
  } catch (err) {
     console.error(`[WHATSAPP-WEBHOOK] Error handling message ${messageId}:`, err.message);
     await sendWhatsAppMessage(from, "⚠️ Bitilda is having trouble processing that right now. Please try again later.");
  }
}
