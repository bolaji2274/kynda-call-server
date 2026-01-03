// ============================================================================
// MISSING FILE 5: backend/src/utils/helpers.js
// ============================================================================

/**
 * Generate a random room ID
 */
function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate duration in seconds between two dates
 */
function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  return Math.floor((endDate - startDate) / 1000);
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sleep utility for async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse with fallback
 */
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  generateRoomId,
  isValidEmail,
  calculateDuration,
  formatBytes,
  sleep,
  safeJsonParse,
};
