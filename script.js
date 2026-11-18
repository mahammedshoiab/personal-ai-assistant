
const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("message");
const send = document.getElementById("send");
const newChat = document.getElementById("newChat");

let history = [];

function addMessage(text, type) {
  const welcome = chat.querySelector(".welcome");

  if (welcome) {
    welcome.remove();
  }

  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();

  if (!text || send.disabled) return;

  addMessage(text, "user");

  history.push({
    role: "user",
    content: text
  });

  input.value = "";
  send.disabled = true;

  const loading = document.createElement("div");
  loading.className = "message bot";
  loading.textContent = "Thinking...";

  chat.appendChild(loading);

  try {
    const response = await fetch(
      "/.netlify/functions/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: history
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed: ${response.status}`
      );
    }

    if (!data.reply) {
      throw new Error("AI returned an empty reply.");
    }

    loading.remove();

    addMessage(data.reply, "bot");

    history.push({
      role: "assistant",
      content: data.reply
    });

  } catch (error) {
    loading.remove();

    addMessage(
      error.message || "Unknown error occurred",
      "bot"
    );

    history.pop();

    console.error("Chat error:", error);

  } finally {
    send.disabled = false;
    input.focus();
  }
});

newChat.addEventListener("click", () => {
  history = [];

  chat.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">✦</div>
      <h1>How can I help you?</h1>
      <p>Your personal AI assistant is ready.</p>
    </div>
  `;
});

