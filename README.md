🗣️ AI Voice Assistant (ai-voice-mvp)

An AI-powered voice automation backend that integrates the Telnyx Call Control API with a Node.js (Express) server.
This system can make outbound phone calls, handle webhooks in real time, and speak dynamically during live conversations — forming the foundation for future integration with OpenAI or ElevenLabs for natural voice interactions.

🚀 Features

🔹 Automated Calling: Place and manage outbound calls through the Telnyx Call Control API.

🔹 Dynamic Voice Playback: Speak real-time responses when a call is answered.

🔹 Webhook Handling: Process live call events securely through Express routes.

🔹 Structured Logging: Implemented using winston and morgan for clean debugging and monitoring.

🔹 Environment Security: Managed with .env and dotenv for credentials and configuration.

🔹 ngrok Integration: Securely expose your local server for webhook testing.

🔹 AI-Ready Foundation: Built for future integration with OpenAI or ElevenLabs TTS/STT for natural speech.

🧠 Tech Stack
Component	Technology
Backend Framework	Node.js + Express
Telephony API	Telnyx Call Control
Logging	Winston + Morgan
Environment Management	dotenv
Local Tunneling	ngrok
Future Integrations	OpenAI GPT-4o, ElevenLabs TTS/STT
⚙️ Project Structure
ai-voice-mvp/
├─ server/
│  └─ src/
│     ├─ index.js
│     ├─ env.js
│     ├─ logger.js
│     ├─ routes/
│     │  ├─ calls.js
│     │  ├─ providers.js
│     │  └─ webhooks.js
│     └─ services/
│        └─ telnyx.js
├─ .env.example
├─ package.json
└─ README.md

🔧 Environment Setup

Create a .env file in the root directory:

PORT=3000
BASE_PUBLIC_URL=https://<your-ngrok-url>.ngrok-free.app

# Telnyx API
TELNYX_API_KEY=your_telnyx_api_key
TELNYX_FROM_NUMBER=+1XXXXXXXXXX
TELNYX_OUTBOUND_PROFILE_ID=your_connection_id
TELNYX_CALL_CONTROL_APP_ID=your_app_id
TELNYX_WEBHOOK_SECRET=

DEFAULT_SAY=Thanks for answering. This is a system test.


Refer to .env.example for guidance.

🧩 Installation & Run

1️⃣ Install dependencies

npm install


2️⃣ Start ngrok to expose your local port

ngrok http 3000


3️⃣ Start the server

npm start


4️⃣ Set your Telnyx webhook to point to:

https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/telnyx

☎️ Test an Outbound Call

Run this command to place a call:

curl -X POST "http://localhost:3000/api/calls/outbound"   -H "Content-Type: application/json"   -d '{"to":"+1XXXXXXXXXX","say":"Hello, this is your AI voice assistant test call."}'


You should receive a call from your configured Telnyx number, and the AI will speak the message you provide.

🩺 Provider Health Check

Check if your integrations are configured properly:

curl http://localhost:3000/api/providers/status

🧭 Architecture Overview
graph TD
    A[User Request] --> B[Express Server (Node.js)]
    B --> C[Telnyx API: Call Control]
    C --> D[Webhook Events]
    D --> E[Express Webhook Handler]
    E --> F[Speech Playback via TTS]
    F -->|Future| G[OpenAI / ElevenLabs Integration]

🧠 Future Enhancements

🤖 Integrate OpenAI GPT-4o for conversational reasoning and dynamic responses.

🗣️ Add ElevenLabs / OpenAI TTS-STT for lifelike, real-time speech.

📊 Build a React Dashboard to visualize call logs and metrics.

💾 Add Redis/PostgreSQL for session and call state tracking.

✅ Implement Telnyx Signature Verification for webhook security.

👨‍💻 Author

Karthik Turimella
AI Developer | Voice & Conversational AI Enthusiast
LinkedIn
 • GitHub
