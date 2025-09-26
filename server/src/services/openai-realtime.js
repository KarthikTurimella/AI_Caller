import WebSocket from 'ws';
import { config } from '../env.js';

/**
 * OpenAI Realtime API Integration
 * Handles speech-to-speech conversation with OpenAI's Realtime API
 */
export class OpenAIRealtimeService {
  constructor(callControlId) {
    this.callControlId = callControlId;
    this.ws = null;
    this.isConnected = false;
    this.audioQueue = [];
    this.isProcessingAudio = false;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect() {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      this.ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        {
          headers: {
            'Authorization': `Bearer ${config.openaiApiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      this.ws.on('open', () => {
        console.log(`[OpenAI Realtime] Connected for call ${this.callControlId}`);
        this.isConnected = true;
        this.initializeSession();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });

      this.ws.on('close', () => {
        console.log(`[OpenAI Realtime] Disconnected for call ${this.callControlId}`);
        this.isConnected = false;
      });

      this.ws.on('error', (error) => {
        console.error(`[OpenAI Realtime] Error for call ${this.callControlId}:`, error);
      });

      // Wait for connection
      await new Promise((resolve, reject) => {
        this.ws.once('open', resolve);
        this.ws.once('error', reject);
      });

    } catch (error) {
      console.error('Failed to connect to OpenAI Realtime API:', error);
      throw error;
    }
  }

  /**
   * Initialize the session with configuration
   */
  initializeSession() {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are a helpful AI assistant having a phone conversation. 
        Be conversational, friendly, and natural. Keep responses concise since this is a voice call.
        The user is calling you, so greet them appropriately and ask how you can help.`,
        voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    this.sendMessage(sessionConfig);
  }

  /**
   * Send message to OpenAI
   */
  sendMessage(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming messages from OpenAI
   */
  handleMessage(message) {
    console.log(`[OpenAI Realtime] Message type: ${message.type}`);

    switch (message.type) {
      case 'session.created':
        console.log('[OpenAI Realtime] Session created');
        break;

      case 'session.updated':
        console.log('[OpenAI Realtime] Session updated');
        break;

      case 'conversation.item.created':
        console.log('[OpenAI Realtime] Item created:', message.item?.type);
        break;

      case 'response.created':
        console.log('[OpenAI Realtime] Response created');
        break;

      case 'response.output_item.added':
        console.log('[OpenAI Realtime] Output item added:', message.item?.type);
        break;

      case 'response.content_part.added':
        if (message.part?.type === 'audio') {
          console.log('[OpenAI Realtime] Audio content part added');
        }
        break;

      case 'response.audio.delta':
        // Stream audio delta to Telnyx
        if (message.delta) {
          this.onAudioDelta(message.delta);
        }
        break;

      case 'response.audio.done':
        console.log('[OpenAI Realtime] Audio response complete');
        this.onAudioComplete();
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[OpenAI Realtime] User started speaking');
        this.onUserSpeechStart();
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[OpenAI Realtime] User stopped speaking');
        this.onUserSpeechStop();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('[OpenAI Realtime] Transcription:', message.transcript);
        break;

      case 'response.done':
        console.log('[OpenAI Realtime] Response done');
        break;

      case 'error':
        console.error('[OpenAI Realtime] Error:', message.error);
        break;

      default:
        console.log(`[OpenAI Realtime] Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Send audio data to OpenAI (from Telnyx)
   */
  sendAudio(audioData) {
    if (!this.isConnected) return;

    const message = {
      type: 'input_audio_buffer.append',
      audio: audioData // Base64 encoded PCM16 audio
    };

    this.sendMessage(message);
  }

  /**
   * Handle audio delta from OpenAI (send to Telnyx)
   */
  onAudioDelta(delta) {
    // This will be called by the media bridge to send audio to Telnyx
    if (this.onAudioOutput) {
      this.onAudioOutput(delta);
    }
  }

  /**
   * Handle audio completion
   */
  onAudioComplete() {
    if (this.onAudioOutputComplete) {
      this.onAudioOutputComplete();
    }
  }

  /**
   * Handle user speech start
   */
  onUserSpeechStart() {
    // Interrupt any ongoing AI speech
    if (this.onInterrupt) {
      this.onInterrupt();
    }
  }

  /**
   * Handle user speech stop
   */
  onUserSpeechStop() {
    // User finished speaking, AI can process
  }

  /**
   * Create a response (when user finishes speaking)
   */
  createResponse() {
    const message = {
      type: 'response.create',
      response: {
        modalities: ['audio'],
        instructions: 'Please respond to the user.'
      }
    };

    this.sendMessage(message);
  }

  /**
   * Interrupt the current response
   */
  interrupt() {
    const message = {
      type: 'response.cancel'
    };

    this.sendMessage(message);
  }

  /**
   * Disconnect from OpenAI
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Set audio output callback
   */
  setAudioOutputCallback(callback) {
    this.onAudioOutput = callback;
  }

  /**
   * Set audio output complete callback
   */
  setAudioOutputCompleteCallback(callback) {
    this.onAudioOutputComplete = callback;
  }

  /**
   * Set interrupt callback
   */
  setInterruptCallback(callback) {
    this.onInterrupt = callback;
  }
}

/**
 * Factory function to create OpenAI Realtime service
 */
export function createOpenAIRealtimeService(callControlId) {
  return new OpenAIRealtimeService(callControlId);
}
