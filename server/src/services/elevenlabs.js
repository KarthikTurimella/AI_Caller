import axios from 'axios';
import { config } from '../env.js';

const BASE_URL = 'https://api.elevenlabs.io/v1';

export function elevenConfigured() {
  return Boolean(config.elevenApiKey) && Boolean(config.elevenVoiceId);
}

export function elevenInfo() {
  return {
    hasApiKey: Boolean(config.elevenApiKey),
    hasVoiceId: Boolean(config.elevenVoiceId),
  };
}

export function elevenClient() {
  if (!config.elevenApiKey) throw new Error('ELEVENLABS_API_KEY missing');
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'xi-api-key': config.elevenApiKey,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
    validateStatus: () => true,
  });
}

// Reachability: treat ANY HTTP response as reachable (404/401 are fine).
export async function elevenReachable() {
  try {
    const resp = await axios.get(`${BASE_URL}/voices`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    return Number.isInteger(resp.status);
  } catch {
    return false;
  }
}
