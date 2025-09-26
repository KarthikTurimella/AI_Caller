import { Router } from 'express';
import axios from 'axios';
import { config } from '../env.js';

// If ElevenLabs service imports already work for you, keep them;
// otherwise we can also compute Eleven directly from env like Telnyx.
import * as ElevenNS from '../services/elevenlabs.js';

const r = Router();

/** Telnyx reachability: consider ANY HTTP response (2xx/3xx/4xx) as reachable */
async function telnyxReachableInline() {
  const ROOT = 'https://api.telnyx.com';
  const BASE = `${ROOT}/v2`;
  const tryUrl = async (url) => {
    try {
      const resp = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      return Number.isInteger(resp.status);
    } catch {
      return false;
    }
  };
  if (await tryUrl(`${BASE}/connections`)) return true;
  if (await tryUrl(BASE)) return true;
  if (await tryUrl(ROOT)) return true;
  return false;
}

// ElevenLabs helpers (fallback-safe in case export shape changes)
const Eleven = (ElevenNS.default && typeof ElevenNS.default === 'object') ? ElevenNS.default : ElevenNS;
const elevenConfigured = typeof Eleven.elevenConfigured === 'function'
  ? Eleven.elevenConfigured
  : () => Boolean(config.elevenApiKey) && Boolean(config.elevenVoiceId);
const elevenInfo = typeof Eleven.elevenInfo === 'function'
  ? Eleven.elevenInfo
  : () => ({ hasApiKey: Boolean(config.elevenApiKey), hasVoiceId: Boolean(config.elevenVoiceId) });
const elevenReachable = typeof Eleven.elevenReachable === 'function'
  ? Eleven.elevenReachable
  : async () => {
      // Inline probe for Eleven if service import ever fails
      try {
        const resp = await axios.get('https://api.elevenlabs.io/v1/voices', {
          timeout: 5000,
          validateStatus: () => true
        });
        return Number.isInteger(resp.status);
      } catch {
        return false;
      }
    };

r.get('/providers/status', async (_req, res) => {
  // Compute Telnyx directly from env (avoids import/export issues)
  const telnyxInfo = {
    hasApiKey: Boolean(config.telnyxApiKey),
    fromNumberSet: Boolean(config.telnyxFromNumber),
    outboundProfileSet: Boolean(config.telnyxOutboundProfileId),
    appIdSet: Boolean(config.telnyxAppId),
  };
  const telnyxConfigured = telnyxInfo.hasApiKey;

  // Run probes
  const [txReach, elReach] = await Promise.all([
    telnyxReachableInline(),
    elevenReachable(),
  ]);

  res.json({
    telnyx: {
      configured: telnyxConfigured,
      reachable: txReach,
      info: telnyxInfo,
    },
    elevenlabs: {
      configured: elevenConfigured(),
      reachable: elReach,
      info: elevenInfo(),
    },
  });
});

export default r;
