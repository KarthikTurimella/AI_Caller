import { Router } from "express";
import * as telnyx from "../services/telnyx.js";
import { setPlannedSpeech } from "../convo/state.js";

const r = Router();

/**
 * POST /api/calls/outbound
 * body: { "to": "+1XXXXXXXXXX", "say": "optional line to speak after answer" }
 */
r.post("/outbound", async (req, res, next) => {
  try {
    const { to, connection_id, say } = req.body || {};
    if (!to) return res.status(400).json({ error: "Missing 'to' number" });

    const call = await telnyx.createCall({ to, connection_id });
    const callControlId = call?.call_control_id || call?.id;

    if (say && callControlId) {
      // store a one-time line that we’ll speak on call.answered
      setPlannedSpeech(callControlId, say);
    }

    return res.json({ ok: true, call });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/calls/:id/speak
 * body: { "text": "say this now", "voice": "male"|"female" }
 * Manually speak on an active call (no waiting for webhook).
 */
r.post("/:id/speak", async (req, res, next) => {
  try {
    const callControlId = req.params.id;
    const { text, voice } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing 'text'" });

    const result = await telnyx.speakText({ callControlId, text, voice });
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

export default r;
