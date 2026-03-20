export async function generateAIResponse(history, userMessage) {
  try {
    const messages = [
      ...history,
      { role: "user", content: userMessage },
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPEN_ROUTER_API}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost", // REQUIRED
          "X-Title": "crypto-bot",            // REQUIRED
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b:free",
          messages,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error("OpenRouter Error:", err);
    return null;
  }
}