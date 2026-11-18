
export default async (request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API key is not configured");
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Please send a message" },
        { status: 400 }
      );
    }

    const contents = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 4000) }]
    }));

    const result = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are a friendly, intelligent personal AI assistant. Give helpful, clear and accurate answers."
            }]
          },
          contents
        })
      }
    );

    const data = await result.json();

    if (!result.ok) {
      return Response.json(
        { error: "AI provider request failed" },
        { status: 502 }
      );
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "I couldn't generate a reply.";

    return Response.json({ reply });

  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Something went wrong on the server" },
      { status: 500 }
    );
  }
};
