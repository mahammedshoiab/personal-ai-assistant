
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
      throw new Error("GEMINI_API_KEY is missing in Netlify");
    }

    const body = await request.json();

    const { messages, documentText } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Please send a message" },
        { status: 400 }
      );
    }

    if (
      documentText !== undefined &&
      typeof documentText !== "string"
    ) {
      return Response.json(
        { error: "Invalid document text" },
        { status: 400 }
      );
    }

    const safeDocument = (documentText || "").slice(0, 20000);

    const contents = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{
        text: String(m.content || "").slice(0, 4000)
      }]
    }));

    // Add uploaded document to the latest user message
    if (safeDocument) {
      const lastUserIndex = contents.findLastIndex(
        item => item.role === "user"
      );

      if (lastUserIndex === -1) {
        return Response.json(
          { error: "A user question is required" },
          { status: 400 }
        );
      }

      contents[lastUserIndex].parts[0].text +=
        "\n\nUploaded document content:\n" +
        safeDocument +
        "\n\nAnswer the user's question using this document when relevant.";
    }

    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite"
    ];

    let lastError = "AI service is temporarily unavailable.";

    for (const model of models) {
      try {
        const result = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text:
                    "You are a friendly, intelligent personal AI assistant. " +
                    "Give helpful, clear and accurate answers. " +
                    "When a document is provided, use its contents to answer questions. " +
                    "If the answer is not present in the document, say so clearly."
                }]
              },
              contents
            })
          }
        );

        const data = await result.json().catch(() => ({}));

        const reply = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

        if (result.ok && reply) {
          return Response.json({ reply });
        }

        lastError =
          data.error?.message ||
          `Model ${model} returned status ${result.status}`;

        console.error(
          "Gemini error:",
          model,
          result.status,
          lastError
        );

      } catch (modelError) {
        lastError = modelError.message;
        console.error("Model request failed:", model, modelError);
      }
    }

    return Response.json(
      { error: lastError },
      { status: 502 }
    );

  } catch (error) {
    console.error("Chat function error:", error);

    return Response.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
};
