import { speakText } from './src/services/telnyx.js';

// Test the speakText function directly
// Replace CALL_CONTROL_ID with a real call control ID from an active call
const callControlId = "REPLACE_WITH_ACTUAL_CALL_CONTROL_ID";
const text = "This is a test of the speech system";

console.log('Testing speakText function...');
console.log('CallControlId:', callControlId);
console.log('Text:', text);

speakText({
  callControlId,
  text,
  voice: "male",
  service_level: "basic"
}).then(result => {
  console.log('SUCCESS:', result);
}).catch(error => {
  console.error('ERROR:', error.message);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
  }
});
