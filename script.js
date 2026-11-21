
document.addEventListener("DOMContentLoaded", () => {
  const chat = document.getElementById("chat");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("message");
  const send = document.getElementById("send");
  const newChat = document.getElementById("newChat");
  const chatList = document.getElementById("chatList");
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const closeSidebar = document.getElementById("closeSidebar");
  const app = document.querySelector(".app");

  if (
    !chat || !form || !input || !send ||
    !newChat || !chatList || !sidebar
  ) {
    console.error("Chat interface elements are missing.");
    return;
  }

  const STORAGE_KEY = "personalAI_chats";

  let conversations = [];
  let activeChatId = null;
  let busy = false;

  // Load saved conversations
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (Array.isArray(saved)) {
      conversations = saved.filter(item =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        Array.isArray(item.messages)
      );
    }
  } catch (error) {
    console.error("Could not load chat history:", error);
  }

  function saveChats() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(conversations)
      );
    } catch (error) {
      console.error("Could not save chat history:", error);
      alert("Unable to save chats. Browser storage may be full.");
    }
  }

  function getActiveChat() {
    return conversations.find(item => item.id === activeChatId);
  }

  function showWelcome() {
    chat.innerHTML = `
      <div class="welcome">
        <div class="welcome-icon">✦</div>
        <h1>How can I help you?</h1>
        <p>Your personal AI assistant is ready.</p>
      </div>
    `;
  }

  function addMessage(text, type) {
    const welcome = chat.querySelector(".welcome");
    if (welcome) welcome.remove();

    const message = document.createElement("div");
    message.className = `message ${type}`;
    message.textContent = text;

    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;

    return message;
  }

  function renderMessages() {
    chat.innerHTML = "";

    const conversation = getActiveChat();

    if (!conversation || conversation.messages.length === 0) {
      showWelcome();
      return;
    }

    conversation.messages.forEach(message => {
      addMessage(
        message.content,
        message.role === "user" ? "user" : "bot"
      );
    });
  }

  // Render sidebar history
  function renderChatList() {
    chatList.innerHTML = "";

    conversations
      .slice()
      .reverse()
      .forEach(conversation => {
        const item = document.createElement("div");
        item.className = "chat-item";

        if (conversation.id === activeChatId) {
          item.classList.add("active");
        }

        const title = document.createElement("span");
        title.className = "chat-title";
        title.textContent = conversation.title;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-chat";
        deleteButton.textContent = "🗑";
        deleteButton.type = "button";
        deleteButton.title = "Delete conversation";

        item.appendChild(title);
        item.appendChild(deleteButton);

        title.addEventListener("click", () => {
          if (busy) return;

          activeChatId = conversation.id;
          renderMessages();
          renderChatList();
          closeMobileSidebar();
        });

        deleteButton.addEventListener("click", (event) => {
          event.stopPropagation();

          if (busy) return;

          conversations = conversations.filter(
            chatItem => chatItem.id !== conversation.id
          );

          if (activeChatId === conversation.id) {
            activeChatId = null;
            showWelcome();
          }

          saveChats();
          renderChatList();
        });

        item.addEventListener("click", () => {
          if (busy) return;

          activeChatId = conversation.id;
          renderMessages();
          renderChatList();
          closeMobileSidebar();
        });

        chatList.appendChild(item);
      });
  }

  function createNewChat() {
    if (busy) return;

    activeChatId = null;
    showWelcome();
    renderChatList();
    input.value = "";
    input.focus();
    closeMobileSidebar();
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    if (app) app.classList.remove("sidebar-open");
  }

  function openMobileSidebar() {
    sidebar.classList.add("open");
    if (app) app.classList.add("sidebar-open");
  }

  newChat.addEventListener("click", createNewChat);

  if (menuToggle) {
    menuToggle.addEventListener("click", openMobileSidebar);
  }

  if (closeSidebar) {
    closeSidebar.addEventListener("click", closeMobileSidebar);
  }

  // Send messages to Gemini
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = input.value.trim();

    if (!text || busy) return;

    if (!activeChatId) {
      activeChatId = Date.now().toString() +
        Math.random().toString(36).slice(2, 7);

      conversations.push({
        id: activeChatId,
        title: text.length > 35
          ? text.slice(0, 35) + "..."
          : text,
        messages: []
      });
    }

    const conversation = getActiveChat();

    if (!conversation) return;

    busy = true;
    send.disabled = true;

    addMessage(text, "user");

    input.value = "";

    const loading = addMessage("Thinking...", "bot");

    // Send existing conversation history to Netlify
    const messages = [
      ...conversation.messages,
      { role: "user", content: text }
    ];

    try {
      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Server error ${response.status}`
        );
      }

      if (!data.reply) {
        throw new Error("Empty AI response");
      }

      loading.remove();

      conversation.messages.push(
        { role: "user", content: text },
        { role: "assistant", content: data.reply }
      );

      addMessage(data.reply, "bot");

      saveChats();
      renderChatList();

    } catch (error) {
      loading.remove();

      // Remove the unsent user message from the display
      const messagesInChat = chat.querySelectorAll(".message");
      const lastMessage = messagesInChat[messagesInChat.length - 1];

      if (lastMessage && lastMessage.classList.contains("user")) {
        lastMessage.remove();
      }

      addMessage("Error: " + error.message, "bot");

      console.error("Chat error:", error);

      // Remove an empty conversation after a failed first request
      if (conversation.messages.length === 0) {
        conversations = conversations.filter(
          item => item.id !== activeChatId
        );
        activeChatId = null;
        renderChatList();
      }

    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  });

  // Initial setup
  renderChatList();
  renderMessages();

  console.log("Personal AI Assistant initialized successfully.");
});
