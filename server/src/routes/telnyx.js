// src/routes/telnyx.js
import { Router } from "express";
import axios from "axios";
import { speakText } from "../services/telnyx.js";
import { popPlannedSpeech } from "../convo/state.js";
import { mediaBridge } from "../services/media-bridge.js";

const r = Router();

// env
const BASE_PUBLIC_URL = process.env.BASE_PUBLIC_URL;
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

/**
 * Helper: start Telnyx ↔ WS bidirectional media streaming
 * Points Telnyx at your websocket bridge (e.g. wss://<host>/media-bridge)
 */
async function startStreaming(callControlId) {
  const url = `https://api.telnyx.com/v2/calls/${callControlId}/actions/streaming_start`;
  const body = {
    stream_url: `wss://${BASE_PUBLIC_URL.replace('https://', '')}/media-bridge`,
    stream_track: "both_tracks",
    stream_bidirectional_mode: "rtp",
    // Use PCMU (G.711 μ-law) for better compatibility
    stream_bidirectional_codec: "PCMU",
  };
  const headers = { Authorization: `Bearer ${TELNYX_API_KEY}` };

  const { data } = await axios.post(url, body, { headers });
  return data;
}

/**
 * Telnyx webhook receiver
 * Set your Telnyx app webhook to: https://<your-host>/api/webhooks/telnyx
 */
r.post("/webhooks/telnyx", async (req, res) => {
  try {
    const event = req.body;
    const type = event?.data?.event_type;
    const payload = event?.data?.payload || {};
    const callControlId = payload.call_control_id;

    console.log("[Telnyx webhook]", type, { callControlId });
    // Uncomment if you need full payload noise:
    // console.log("Full webhook payload:", JSON.stringify(event, null, 2));

    if (type === "call.answered" && callControlId) {
      // 1) Start Telnyx <-> OpenAI Realtime bridge streaming
      try {
        const s = await startStreaming(callControlId);
        console.log("streaming_start OK:", s?.data || s);
        console.log(`[Telnyx] Started streaming for call ${callControlId} - OpenAI conversation will begin automatically`);
      } catch (e) {
        console.error(
          "streaming_start FAILED",
          e?.response?.status,
          e?.response?.data || e.message
        );
        
        // Fallback to basic TTS if streaming fails
        const toSay = "Hello, I'm having trouble connecting to the AI service. Please try calling again later.";
        try {
          await speakText({
            callControlId,
            text: toSay,
            voice: "male",
            service_level: "basic",
          });
        } catch (speakError) {
          console.error("Fallback speak failed", speakError);
        }
      }
    }

    if (type === "call.hangup" && callControlId) {
      // Clean up any OpenAI connections when call ends
      console.log(`[Telnyx] Call hangup detected for ${callControlId}`);
      // The media bridge will handle cleanup automatically
    }

    if (type === "call.machine.detection.ended" && callControlId) {
      // Handle answering machine detection if needed
      console.log(`[Telnyx] Machine detection ended for ${callControlId}:`, payload.result);
    }

    res.status(200).json({ received: true });
  } catch (e) {
    console.error("Webhook error", e);
    res.status(200).json({ received: true });
  }
});

export default r;
