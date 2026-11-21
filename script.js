
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
  const voiceInput = document.getElementById("voiceInput");
  const voiceStatus = document.getElementById("voiceStatus");
  const fileInput = document.getElementById("fileInput");
  const attachFile = document.getElementById("attachFile");
  const fileStatus = document.getElementById("fileStatus");
  const app = document.querySelector(".app");

  if (
    !chat || !form || !input || !send ||
    !newChat || !chatList || !sidebar
  ) {
    console.error("Chat interface elements are missing.");
    return;
  }

  const STORAGE_KEY = "personalAI_chats";
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_DOCUMENT_TEXT = 20000;

  let conversations = [];
  let activeChatId = null;
  let busy = false;
  let recognition = null;
  let isListening = false;

  // Current document stays in memory only.
  let activeDocumentText = "";
  let activeDocumentName = "";

  // Load saved conversations
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

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
    return conversations.find(
      item => item.id === activeChatId
    );
  }

  function clearDocument() {
    activeDocumentText = "";
    activeDocumentName = "";

    if (fileInput) {
      fileInput.value = "";
    }

    if (fileStatus) {
      fileStatus.textContent = "";
      fileStatus.style.display = "none";
    }
  }

  function showFileStatus(name) {
    if (!fileStatus) return;

    fileStatus.innerHTML = "";

    const nameText = document.createElement("span");
    nameText.textContent = "📄 " + name + " ";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "✕";
    clearButton.title = "Remove document";

    clearButton.addEventListener("click", clearDocument);

    fileStatus.appendChild(nameText);
    fileStatus.appendChild(clearButton);
    fileStatus.style.display = "block";
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

    message.className = type === "user"
      ? "message user user-message"
      : "message bot assistant-message";

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

  // Display saved conversations
  function renderChatList() {
    chatList.innerHTML = "";

    conversations.slice().reverse().forEach(conversation => {
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

      item.addEventListener("click", () => {
        if (busy) return;

        if (activeChatId !== conversation.id) {
          clearDocument();
        }

        activeChatId = conversation.id;
        renderMessages();
        renderChatList();
        closeMobileSidebar();
      });

      deleteButton.addEventListener("click", event => {
        event.stopPropagation();

        if (busy) return;

        conversations = conversations.filter(
          item => item.id !== conversation.id
        );

        if (activeChatId === conversation.id) {
          activeChatId = null;
          clearDocument();
          showWelcome();
        }

        saveChats();
        renderChatList();
      });

      chatList.appendChild(item);
    });
  }

  // New conversation
  function createNewChat() {
    if (busy) return;

    stopVoiceInput();
    clearDocument();

    activeChatId = null;
    showWelcome();
    renderChatList();
    input.value = "";
    input.focus();
    closeMobileSidebar();
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("open");

    if (app) {
      app.classList.remove("sidebar-open");
    }
  }

  function openMobileSidebar() {
    sidebar.classList.add("open");

    if (app) {
      app.classList.add("sidebar-open");
    }
  }

  newChat.addEventListener("click", createNewChat);

  if (menuToggle) {
    menuToggle.addEventListener("click", openMobileSidebar);
  }

  if (closeSidebar) {
    closeSidebar.addEventListener("click", closeMobileSidebar);
  }

  // PDF and TXT upload
  if (attachFile && fileInput) {
    attachFile.addEventListener("click", () => {
      if (!busy) {
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];

      if (!file) return;

      const extension = file.name.split(".").pop().toLowerCase();

      if (!["pdf", "txt"].includes(extension)) {
        alert("Please select a PDF or TXT file.");
        fileInput.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert("File is too large. Maximum file size is 5 MB.");
        fileInput.value = "";
        return;
      }

      attachFile.disabled = true;

      if (fileStatus) {
        fileStatus.textContent = "Reading " + file.name + "...";
        fileStatus.style.display = "block";
      }

      try {
        let extractedText = "";

        if (extension === "txt") {
          extractedText = await file.text();
        } else {
          if (!window.pdfjsLib) {
            throw new Error("PDF reader could not load. Refresh the page and try again.");
          }

          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          const buffer = await file.arrayBuffer();

          const pdf = await window.pdfjsLib.getDocument({
            data: new Uint8Array(buffer)
          }).promise;

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();

            const pageText = content.items
              .map(item => item.str || "")
              .join(" ");

            extractedText += pageText + "\n";

            if (extractedText.length >= MAX_DOCUMENT_TEXT) {
              break;
            }
          }
        }

        extractedText = extractedText
          .replace(/\s+/g, " ")
          .trim();

        if (!extractedText) {
          throw new Error(
            "No readable text found. This PDF may be scanned or image-based."
          );
        }

        activeDocumentText =
          extractedText.slice(0, MAX_DOCUMENT_TEXT);

        activeDocumentName = file.name;

        showFileStatus(file.name);

        if (extractedText.length > MAX_DOCUMENT_TEXT) {
          alert("Document loaded. Only the first 20,000 characters will be used.");
        }

      } catch (error) {
        console.error("File reading error:", error);
        clearDocument();
        alert("Could not read file: " + error.message);

      } finally {
        attachFile.disabled = false;
      }
    });
  }

  // Voice input setup
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  function stopVoiceInput() {
    if (recognition && isListening) {
      recognition.stop();
    }
  }

  if (SpeechRecognition && voiceInput) {
    recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    voiceInput.addEventListener("click", () => {
      if (busy) return;

      if (isListening) {
        recognition.stop();
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        console.error("Voice start error:", error);

        if (voiceStatus) {
          voiceStatus.textContent =
            "Unable to start microphone. Please try again.";
        }
      }
    });

    recognition.onstart = () => {
      isListening = true;
      voiceInput.classList.add("listening");
      voiceInput.textContent = "⏹";
      voiceInput.title = "Stop recording";
      voiceInput.setAttribute("aria-label", "Stop voice input");

      if (voiceStatus) {
        voiceStatus.textContent = "Listening... Speak now.";
      }
    };

    recognition.onresult = event => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        const separator = input.value.trim() ? " " : "";
        input.value += separator + finalTranscript.trim();
      }

      if (interimTranscript && voiceStatus) {
        voiceStatus.textContent =
          "Recognizing: " + interimTranscript;
      }
    };

    recognition.onerror = event => {
      console.error("Speech recognition error:", event.error);

      if (!voiceStatus) return;

      if (event.error === "not-allowed") {
        voiceStatus.textContent =
          "Microphone permission denied. Allow microphone access in your browser.";
      } else if (event.error === "no-speech") {
        voiceStatus.textContent =
          "No speech detected. Tap the microphone to try again.";
      } else if (event.error !== "aborted") {
        voiceStatus.textContent =
          "Voice input error: " + event.error;
      }
    };

    recognition.onend = () => {
      isListening = false;

      voiceInput.classList.remove("listening");
      voiceInput.textContent = "🎤";
      voiceInput.title = "Speak your message";
      voiceInput.setAttribute("aria-label", "Start voice input");

      if (
        voiceStatus &&
        (voiceStatus.textContent.startsWith("Listening") ||
         voiceStatus.textContent.startsWith("Recognizing"))
      ) {
        voiceStatus.textContent = "Voice input finished.";
      }
    };

  } else if (voiceInput) {
    voiceInput.disabled = true;
    voiceInput.title =
      "Speech recognition is not supported in this browser";

    if (voiceStatus) {
      voiceStatus.textContent =
        "Voice input is not supported in this browser. Try Chrome.";
    }
  }

  // Send messages to Gemini
  form.addEventListener("submit", async event => {
    event.preventDefault();

    const text = input.value.trim();

    if ((!text && !activeDocumentText) || busy) return;

    stopVoiceInput();

    if (!activeChatId) {
      activeChatId =
        Date.now().toString() +
        Math.random().toString(36).slice(2, 7);

      conversations.push({
        id: activeChatId,
        title: text
          ? (text.length > 35 ? text.slice(0, 35) + "..." : text)
          : "Document questions",
        messages: []
      });
    }

    const conversation = getActiveChat();

    if (!conversation) return;

    const userText = text || "Please read the attached document and summarize it.";

    busy = true;
    send.disabled = true;

    if (voiceInput) {
      voiceInput.disabled = true;
    }

    if (attachFile) {
      attachFile.disabled = true;
    }

    addMessage(
      activeDocumentName
        ? userText + " (Document: " + activeDocumentName + ")"
        : userText,
      "user"
    );

    input.value = "";

    const loading = addMessage("Thinking...", "bot");

    const messages = [
      ...conversation.messages,
      { role: "user", content: userText }
    ];

    try {
      const response = await fetch(
        "/.netlify/functions/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages,
            documentText: activeDocumentText
          })
        }
      );

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
        { role: "user", content: userText },
        { role: "assistant", content: data.reply }
      );

      addMessage(data.reply, "bot");

      saveChats();
      renderChatList();

    } catch (error) {
      loading.remove();

      const messagesInChat =
        chat.querySelectorAll(".message");

      const lastMessage =
        messagesInChat[messagesInChat.length - 1];

      if (
        lastMessage &&
        lastMessage.classList.contains("user")
      ) {
        lastMessage.remove();
      }

      addMessage("Error: " + error.message, "bot");

      console.error("Chat error:", error);

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

      if (voiceInput && SpeechRecognition) {
        voiceInput.disabled = false;
      }

      if (attachFile) {
        attachFile.disabled = false;
      }

      input.focus();
    }
  });

  // Initial setup
  renderChatList();
  renderMessages();

  console.log(
    "Personal AI Assistant with voice and document upload initialized."
  );
});
