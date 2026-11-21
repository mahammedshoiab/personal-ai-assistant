# personal-ai-assistant
My Personal AI Assistant using Gemini API
# 🤖 Personal AI Assistant

A web-based AI personal assistant powered by the **Google Gemini API**. It allows users to interact with AI through text and voice, maintain chat history, and upload documents to get summaries and answers.

## 🌐 Live Demo

[Open Personal AI Assistant](https://my-personal-ai-assistant123.netlify.app/)

## ✨ Features

- **AI Chat:** Get intelligent responses using the Gemini API.
- **Voice Input:** Ask questions using your microphone.
- **Chat History:** Save and revisit previous conversations.
- **New Chat:** Start separate conversations whenever needed.
- **PDF Upload:** Upload PDF documents and ask questions about their contents.
- **TXT Upload:** Read text files and get AI-powered summaries.
- **Responsive Interface:** Use the assistant through a web browser.
- **Serverless Backend:** Connect to Gemini through Netlify Functions.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive design |
| JavaScript | Frontend functionality |
| Google Gemini API | AI responses |
| PDF.js | PDF text extraction |
| Netlify Functions | Backend API |
| Netlify | Website hosting |
| GitHub | Source code management |

## 🏗️ Project Structure

```text
personal-ai-assistant/
│
├── index.html
├── style.css
├── script.js
│
├── netlify/
│   └── functions/
│       └── chat.mjs
│
└── README.md
```

## ⚙️ How It Works

1. The user enters a question or uses voice input.
2. The frontend sends the conversation to a Netlify Function.
3. The backend securely communicates with the Gemini API.
4. Gemini generates a response.
5. The response is displayed in the chat interface.

For document questions, PDF.js extracts PDF text in the browser, or JavaScript reads TXT files. The extracted text is sent to the backend along with the question.

## 🚀 Run the Project Locally

1. Clone the repository:

```bash
git clone https://github.com/mahammedshoiab/personal-ai-assistant.git
```

2. Open the project folder:

```bash
cd personal-ai-assistant
```

3. Install the Netlify CLI if needed:

```bash
npm install -g netlify-cli
```

4. Configure the `GEMINI_API_KEY` environment variable in your local Netlify environment.

5. Run the project:

```bash
netlify dev
```

## 🔐 Environment Variable

Configure this environment variable in Netlify:

```text
GEMINI_API_KEY=your_gemini_api_key
```

**Security:** Never commit your actual API key to GitHub. Store it in Netlify environment variables.

## ☁️ Deployment

The project is deployed using Netlify and connected to GitHub for source code management.

Live website: https://my-personal-ai-assistant123.netlify.app/

## 👨‍💻 Author

mahammed shoiab

GitHub: [mahammedshoiab](https://github.com/mahammedshoiab)

---

⭐ If you find this project interesting, consider giving the repository a star!
