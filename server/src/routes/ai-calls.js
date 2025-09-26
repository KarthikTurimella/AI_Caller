import { Router } from 'express';
import { createCall, hangup, telnyxConfigured } from '../services/telnyx.js';
import { config } from '../env.js';
import { mediaBridge } from '../services/media-bridge.js';

const router = Router();

/**
 * Create a new outbound call with OpenAI conversation
 */
router.post('/create', async (req, res) => {
  try {
    const { to, instructions } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Phone number (to) is required' });
    }

    if (!telnyxConfigured()) {
      return res.status(400).json({ 
        error: 'Telnyx not configured. Please set TELNYX_API_KEY and TELNYX_FROM_NUMBER' 
      });
    }

    if (!config.openaiApiKey) {
      return res.status(400).json({ 
        error: 'OpenAI not configured. Please set OPENAI_API_KEY' 
      });
    }

    // Create the call
    const call = await createCall({ 
      to,
      connection_id: config.telnyxAppId || config.telnyxOutboundProfileId
    });

    // Store custom instructions if provided
    if (instructions) {
      // You could store this in a database or cache
      // For now, we'll just log it
      console.log(`Custom instructions for call ${call.call_control_id}:`, instructions);
    }

    res.json({
      success: true,
      call: {
        id: call.call_control_id,
        to,
        from: config.telnyxFromNumber,
        status: 'initiated',
        instructions: instructions || 'Default AI assistant instructions'
      }
    });

  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ 
      error: 'Failed to create call',
      details: error.message 
    });
  }
});

/**
 * Hang up a call
 */
router.post('/:callId/hangup', async (req, res) => {
  try {
    const { callId } = req.params;

    await hangup({ callControlId: callId });

    res.json({
      success: true,
      message: 'Call hangup initiated'
    });

  } catch (error) {
    console.error('Error hanging up call:', error);
    res.status(500).json({ 
      error: 'Failed to hang up call',
      details: error.message 
    });
  }
});

/**
 * Get call status and active connections
 */
router.get('/status', (req, res) => {
  const activeConnections = mediaBridge.getActiveConnections();
  
  res.json({
    success: true,
    status: {
      activeConnections,
      telnyxConfigured: telnyxConfigured(),
      openaiConfigured: Boolean(config.openaiApiKey),
      baseUrl: config.basePublicUrl
    }
  });
});

/**
 * Interrupt AI speech for a call (if user wants to speak)
 */
router.post('/:callId/interrupt', (req, res) => {
  try {
    const { callId } = req.params;
    
    mediaBridge.interruptCall(callId);
    
    res.json({
      success: true,
      message: 'AI speech interrupted'
    });

  } catch (error) {
    console.error('Error interrupting call:', error);
    res.status(500).json({ 
      error: 'Failed to interrupt call',
      details: error.message 
    });
  }
});

export default router;
