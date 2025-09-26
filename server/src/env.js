import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  basePublicUrl: process.env.BASE_PUBLIC_URL || 'http://localhost',
  telnyxApiKey: process.env.TELNYX_API_KEY,
  telnyxFromNumber: process.env.TELNYX_FROM_NUMBER,
  telnyxOutboundProfileId: process.env.TELNYX_OUTBOUND_PROFILE_ID,
  telnyxAppId: process.env.TELNYX_CALL_CONTROL_APP_ID,
  telnyxWebhookSecret: process.env.TELNYX_WEBHOOK_SECRET,

  elevenApiKey: process.env.ELEVENLABS_API_KEY,
  elevenVoiceId: process.env.ELEVENLABS_VOICE_ID,

  openaiApiKey: process.env.OPENAI_API_KEY,
};
