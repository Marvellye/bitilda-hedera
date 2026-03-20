import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from "../config/constants.js";

const genAI = new GoogleGenerativeAI(CONFIG.GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });

export async function generateAIResponse(history, userMessage) {
  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}