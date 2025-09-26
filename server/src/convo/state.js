// simple in-memory storage (clear on process restart)
const plannedSpeech = new Map();

/** Save a one-time line to speak when the call is answered */
export function setPlannedSpeech(callControlId, text) {
  if (callControlId && text) plannedSpeech.set(callControlId, text);
}

/** Get & remove the planned line for this call */
export function popPlannedSpeech(callControlId) {
  const t = plannedSpeech.get(callControlId);
  plannedSpeech.delete(callControlId);
  return t;
}
