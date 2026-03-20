import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const API_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Sends a WhatsApp message using the Meta Cloud API.
 */
export async function sendWhatsAppMessage(to, text) {
  try {
    const url = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
    
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (err) {
    console.error(`[WHATSAPP-SERVICE] Send failed to ${to}:`, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Sends an interactive list or button message (Optional/Placeholder)
 */
export async function sendWhatsAppInteractive(to, text, buttons) {
    // Similar to above but with interactive payload
}
