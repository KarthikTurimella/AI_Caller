# OpenAI Realtime API Integration

This integration adds speech-to-speech conversation capabilities to your AI Voice MVP using OpenAI's Realtime API.

## What's New

### 🎙️ **Real-time Speech-to-Speech Conversations**
- Direct audio streaming between caller and OpenAI's AI assistant
- No intermediate text processing - pure voice-to-voice interaction
- Natural conversation flow with interruption handling
- Voice activity detection (VAD) for turn-taking

### 🔧 **New Components**

1. **OpenAI Realtime Service** (`src/services/openai-realtime.js`)
   - Manages WebSocket connection to OpenAI Realtime API
   - Handles audio streaming and conversation state
   - Configurable voice and conversation parameters

2. **Media Bridge** (`src/services/media-bridge.js`)
   - Bridges audio between Telnyx and OpenAI
   - Handles audio format conversion (mulaw ↔ PCM16)
   - Manages multiple concurrent calls

3. **AI Calls API** (`src/routes/ai-calls.js`)
   - New REST endpoints for managing AI-powered calls
   - Call status monitoring and control

## Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
Add to your `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Update Telnyx Configuration
Make sure your `BASE_PUBLIC_URL` points to your public server (use ngrok for development):
```env
BASE_PUBLIC_URL=https://your-ngrok-url.ngrok.io
```

## Usage

### Making AI Calls

**Create a new AI-powered call:**
```bash
curl -X POST http://localhost:3000/api/ai-calls/create \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "instructions": "You are a helpful customer service agent. Be friendly and professional."
  }'
```

**Check call status:**
```bash
curl http://localhost:3000/api/ai-calls/status
```

**Hang up a call:**
```bash
curl -X POST http://localhost:3000/api/ai-calls/{callId}/hangup
```

**Interrupt AI speech:**
```bash
curl -X POST http://localhost:3000/api/ai-calls/{callId}/interrupt
```

## How It Works

```
Phone Call → Telnyx → Media Bridge → OpenAI Realtime API
                ↓                         ↓
            WebSocket               AI Conversation
            (audio stream)          (speech-to-speech)
```

1. **Call Initiation**: Create call via API
2. **Call Answer**: Webhook triggers streaming setup
3. **Audio Bridge**: Bidirectional audio streaming starts
4. **AI Conversation**: OpenAI handles the conversation
5. **Real-time Response**: AI speaks back to caller

## Configuration Options

### OpenAI Assistant Behavior
In `src/services/openai-realtime.js`, you can customize:

- **Voice**: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **Instructions**: System prompt for the AI assistant
- **Temperature**: Response creativity (0.0-1.0)
- **Turn Detection**: Voice activity detection settings

### Audio Settings
- **Input/Output Format**: PCM16 at 24kHz (automatically converted)
- **Voice Activity Detection**: Server-side VAD for natural turn-taking
- **Interruption Handling**: User can interrupt AI speech

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Add `OPENAI_API_KEY` to your `.env` file

2. **"streaming_start FAILED"**
   - Check your `BASE_PUBLIC_URL` is publicly accessible
   - Ensure WebSocket endpoint `/media-bridge` is available

3. **Audio quality issues**
   - Verify Telnyx codec is set to PCMU (G.711 μ-law)
   - Check network latency between your server and OpenAI

4. **No audio from AI**
   - Check OpenAI API quota and billing
   - Verify WebSocket connection in logs

### Debug Logs
The system provides detailed logging for:
- Telnyx webhook events
- OpenAI connection status
- Audio streaming status
- Call state changes

## Advanced Features

### Custom Instructions Per Call
You can provide custom instructions when creating calls:

```javascript
{
  "to": "+1234567890",
  "instructions": "You are a sales representative for Acme Corp. Focus on our new product launch."
}
```

### Multi-Call Support
The media bridge supports multiple concurrent calls, each with its own OpenAI session.

### Interruption Handling
Users can interrupt the AI at any time - the system will:
1. Cancel current AI response
2. Process user's new input
3. Generate appropriate response

This creates natural, human-like conversation flow.
