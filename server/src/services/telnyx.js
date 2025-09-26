import axios from 'axios';
import { config } from '../env.js';

const BASE_URL = 'https://api.telnyx.com/v2';

/**
 * Step 2 - Check if Telnyx is configured
 */
export function telnyxConfigured() {
  return Boolean(config.telnyxApiKey && config.telnyxFromNumber);
}

/**
 * Step 2 - Basic Telnyx info
 */
export function telnyxInfo() {
  return {
    hasApiKey: Boolean(config.telnyxApiKey),
    hasFromNumber: Boolean(config.telnyxFromNumber),
    hasOutboundProfile: Boolean(config.telnyxOutboundProfileId),
    hasCallControlApp: Boolean(config.telnyxAppId),
  };
}

/**
 * Step 2 - Check if Telnyx API is reachable
 */
export async function telnyxReachable() {
  if (!config.telnyxApiKey) {
    return { reachable: false, error: 'No API key configured' };
  }

  try {
    const response = await axios.get(`${BASE_URL}/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${config.telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    return { reachable: true, status: response.status };
  } catch (error) {
    return { 
      reachable: false, 
      error: error.message,
      status: error.response?.status 
    };
  }
}

/**
 * Step 3 - Create outbound call
 */
export async function createCall({ to, connection_id }) {
  if (!config.telnyxApiKey) {
    throw new Error('Telnyx API key not configured');
  }
  
  if (!config.telnyxFromNumber) {
    throw new Error('Telnyx from number not configured');
  }

  try {
    // Fix webhook URL - don't include port when using ngrok
    const webhookUrl = `${config.basePublicUrl}/api/webhooks/telnyx`;
    
    const payload = {
      to,
      from: config.telnyxFromNumber,
      webhook_url: webhookUrl,
    };

    // Add the Call Control App ID as connection_id
    if (connection_id) {
      payload.connection_id = connection_id;
    } else if (config.telnyxAppId) {
      payload.connection_id = config.telnyxAppId;
    } else if (config.telnyxOutboundProfileId) {
      payload.connection_id = config.telnyxOutboundProfileId;
    }

    console.log('Creating Telnyx call with payload:', payload);

    const response = await axios.post(`${BASE_URL}/calls`, payload, {
      headers: {
        'Authorization': `Bearer ${config.telnyxApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Telnyx API response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Telnyx createCall error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    
    // Log specific error details from Telnyx
    if (error.response?.data?.errors) {
      console.error('Detailed Telnyx errors:', JSON.stringify(error.response.data.errors, null, 2));
    }
    
    throw error;
  }
}

/**
 * Step 3 - Start playback on a call
 */
export async function playbackStart({ callControlId, audioUrl }) {
  if (!config.telnyxApiKey) {
    throw new Error('Telnyx API key not configured');
  }

  try {
    const payload = {
      audio_url: audioUrl,
      loop: 1
    };

    const response = await axios.post(
      `${BASE_URL}/calls/${callControlId}/actions/playback_start`, 
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.telnyxApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Telnyx playbackStart error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Step 3 - Hang up a call
 */
export async function hangup({ callControlId }) {
  if (!config.telnyxApiKey) {
    throw new Error('Telnyx API key not configured');
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/calls/${callControlId}/actions/hangup`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${config.telnyxApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Telnyx hangup error:', error.response?.data || error.message);
    throw error;
  }
}

/** Speak text using Telnyx TTS on the call */
export async function speakText({
  callControlId,
  text,
  voice = "male",           // "male" or "female" (basic)
  service_level = "basic",  // "basic" keeps it simple & fast
  payload_type = "text",    // also supports "ssml" on premium
  language = "en-US"        // optional: e.g., "en-US" for premium tiers
}) {
  if (!callControlId) throw new Error("callControlId required");
  if (!text) throw new Error("text required");
  if (!config.telnyxApiKey) throw new Error("Telnyx API key not configured");

  const body = {
    payload: text,
    service_level,
    payload_type,
    voice
  };
  if (language) body.language = language;

  try {
    console.log('Sending speak request:', { callControlId, text, voice, service_level });
    
    const response = await axios.post(
      `${BASE_URL}/calls/${callControlId}/actions/speak`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${config.telnyxApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Speak response:', response.data);
    return response.data?.data;
  } catch (error) {
    console.error('Telnyx speakText error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
}