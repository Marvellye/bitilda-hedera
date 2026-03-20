import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function generateAIResponse(history, userMessage) {
  try {
    const messages = [
      ...history,
      { role: "user", content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.NVIDIA_AI_MODEL,
      messages,
      temperature: 0.3,
      top_p: 0.8,
      max_tokens: 1024,  // Reduced from 8192
      timeout: 10000,  // 10 second timeout
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("NVIDIA API Error:", err.message);
    throw err;
  }
}