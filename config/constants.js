import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  TREASURY_WALLET: "0x26bb5535479D02fEA526F22ddFCA8DE65DCE0406",
  HEDERA_TREASURY_WALLET: "0.0.10382983",
  TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY,
  GAS_BUFFER: 1.5,
  GEN_AI_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: "gemini-2.0-flash",
  OPEN_ROUTER_API: process.env.OPEN_ROUTER_API,
  OPENROUTER_MODEL: "openai/gpt-oss-20b:free",
  NAIRA_MARGIN: 3,
};