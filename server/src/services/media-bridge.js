import WebSocket, { WebSocketServer } from 'ws';
import { createOpenAIRealtimeService } from '../services/openai-realtime.js';

/**
 * Media Bridge - Handles audio streaming between Telnyx and OpenAI Realtime API
 */
export class MediaBridge {
  constructor() {
    this.connections = new Map(); // callControlId -> connection info
    this.wss = null;
  }

  /**
   * Start the WebSocket server for media streaming
   */
  startServer(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/media-bridge'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('[Media Bridge] New WebSocket connection');
      this.handleConnection(ws, req);
    });

    console.log('[Media Bridge] WebSocket server started on /media-bridge');
  }

  /**
   * Handle new WebSocket connection from Telnyx
   */
  async handleConnection(ws, req) {
    let callControlId = null;
    let openaiService = null;
    let isConnected = false;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.event === 'start') {
          // Extract call control ID from Telnyx start event
          callControlId = data.start?.call_control_id;
          
          if (!callControlId) {
            console.error('[Media Bridge] No call_control_id in start event');
            return;
          }

          console.log(`[Media Bridge] Starting session for call ${callControlId}`);

          // Create OpenAI Realtime service
          openaiService = createOpenAIRealtimeService(callControlId);
          
          // Set up callbacks
          openaiService.setAudioOutputCallback((audioData) => {
            // Send AI audio to Telnyx
            this.sendAudioToTelnyx(ws, audioData);
          });

          openaiService.setInterruptCallback(() => {
            // Handle interruption (user started speaking)
            console.log(`[Media Bridge] User interrupted AI for call ${callControlId}`);
          });

          // Connect to OpenAI
          await openaiService.connect();

          // Store connection
          this.connections.set(callControlId, {
            telnyxWs: ws,
            openaiService,
            isActive: true
          });

          isConnected = true;
          console.log(`[Media Bridge] Session established for call ${callControlId}`);

        } else if (data.event === 'media') {
          // Handle incoming audio from Telnyx
          if (openaiService && isConnected) {
            this.handleTelnyxAudio(data, openaiService);
          }

        } else if (data.event === 'stop') {
          console.log(`[Media Bridge] Session ended for call ${callControlId}`);
          this.cleanup(callControlId);
        }

      } catch (error) {
        console.error('[Media Bridge] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`[Media Bridge] WebSocket closed for call ${callControlId}`);
      this.cleanup(callControlId);
    });

    ws.on('error', (error) => {
      console.error(`[Media Bridge] WebSocket error for call ${callControlId}:`, error);
      this.cleanup(callControlId);
    });
  }

  /**
   * Handle audio data from Telnyx
   */
  handleTelnyxAudio(data, openaiService) {
    if (data.media && data.media.payload) {
      // Telnyx sends base64 encoded mulaw audio
      // We need to convert it to PCM16 for OpenAI
      const audioData = this.convertMulawToPcm16(data.media.payload);
      
      // Send to OpenAI
      openaiService.sendAudio(audioData);
    }
  }

  /**
   * Send AI audio to Telnyx
   */
  sendAudioToTelnyx(ws, audioData) {
    try {
      // Convert PCM16 to mulaw for Telnyx
      const mulawData = this.convertPcm16ToMulaw(audioData);
      
      const message = {
        event: 'media',
        media: {
          payload: mulawData
        }
      };

      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[Media Bridge] Error sending audio to Telnyx:', error);
    }
  }

  /**
   * Convert mulaw to PCM16 (simplified conversion)
   * In production, you might want to use a proper audio processing library
   */
  convertMulawToPcm16(mulawBase64) {
    try {
      // Decode base64
      const mulawBuffer = Buffer.from(mulawBase64, 'base64');
      
      // Convert mulaw to PCM16 (8kHz to 24kHz upsampling)
      // This is a simplified conversion - you might want to use a proper audio library
      const pcm16Buffer = Buffer.alloc(mulawBuffer.length * 2 * 3); // 16-bit, 3x upsampling
      
      for (let i = 0; i < mulawBuffer.length; i++) {
        const mulaw = mulawBuffer[i];
        const pcm = this.mulawToPcm16(mulaw);
        
        // Write PCM16 value 3 times for upsampling (8kHz -> 24kHz)
        for (let j = 0; j < 3; j++) {
          const offset = (i * 3 + j) * 2;
          pcm16Buffer.writeInt16LE(pcm, offset);
        }
      }

      return pcm16Buffer.toString('base64');
    } catch (error) {
      console.error('[Media Bridge] Error converting mulaw to PCM16:', error);
      return '';
    }
  }

  /**
   * Convert PCM16 to mulaw
   */
  convertPcm16ToMulaw(pcm16Base64) {
    try {
      // Decode base64
      const pcm16Buffer = Buffer.from(pcm16Base64, 'base64');
      
      // Downsample from 24kHz to 8kHz (take every 3rd sample)
      const downsampledLength = Math.floor(pcm16Buffer.length / 6); // 16-bit samples, downsample by 3
      const mulawBuffer = Buffer.alloc(downsampledLength);
      
      for (let i = 0; i < downsampledLength; i++) {
        const pcm16Offset = i * 6; // Every 3rd 16-bit sample
        const pcm16Value = pcm16Buffer.readInt16LE(pcm16Offset);
        const mulawValue = this.pcm16ToMulaw(pcm16Value);
        mulawBuffer[i] = mulawValue;
      }

      return mulawBuffer.toString('base64');
    } catch (error) {
      console.error('[Media Bridge] Error converting PCM16 to mulaw:', error);
      return '';
    }
  }

  /**
   * Convert single mulaw byte to PCM16
   */
  mulawToPcm16(mulaw) {
    // Simplified mulaw to PCM16 conversion
    const BIAS = 0x84;
    const CLIP = 8159;
    
    mulaw = ~mulaw;
    const sign = (mulaw & 0x80);
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0F;
    
    let sample = mantissa << (exponent + 3);
    sample += BIAS;
    if (exponent === 0) sample += BIAS >> 1;
    
    return sign ? -sample : sample;
  }

  /**
   * Convert single PCM16 value to mulaw
   */
  pcm16ToMulaw(pcm16) {
    // Simplified PCM16 to mulaw conversion
    const BIAS = 0x84;
    const CLIP = 8159;
    
    let sign = (pcm16 >> 8) & 0x80;
    if (sign) pcm16 = (BIAS - pcm16) + BIAS;
    else pcm16 += BIAS;
    
    if (pcm16 > CLIP) pcm16 = CLIP;
    
    let exponent = this.getExponent(pcm16);
    let mantissa = (pcm16 >> (exponent + 3)) & 0x0F;
    
    return ~(sign | (exponent << 4) | mantissa);
  }

  /**
   * Get exponent for mulaw encoding
   */
  getExponent(value) {
    let exp = 0;
    if (value >= 256) {
      if (value >= 4096) {
        if (value >= 16384) {
          exp = value >= 32768 ? 8 : 7;
        } else {
          exp = value >= 8192 ? 6 : 5;
        }
      } else {
        exp = value >= 2048 ? 4 : value >= 1024 ? 3 : 2;
      }
    } else {
      exp = value >= 128 ? 1 : 0;
    }
    return exp;
  }

  /**
   * Cleanup connection
   */
  cleanup(callControlId) {
    if (callControlId && this.connections.has(callControlId)) {
      const connection = this.connections.get(callControlId);
      
      if (connection.openaiService) {
        connection.openaiService.disconnect();
      }
      
      this.connections.delete(callControlId);
      console.log(`[Media Bridge] Cleaned up connection for call ${callControlId}`);
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnections() {
    return this.connections.size;
  }

  /**
   * Interrupt AI speech for a specific call
   */
  interruptCall(callControlId) {
    const connection = this.connections.get(callControlId);
    if (connection && connection.openaiService) {
      connection.openaiService.interrupt();
    }
  }
}

// Export singleton instance
export const mediaBridge = new MediaBridge();
