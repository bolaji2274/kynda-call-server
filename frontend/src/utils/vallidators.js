// ============================================================================
// MISSING FILE 3: frontend/src/utils/validators.js
// ============================================================================

/**
 * Validation Utilities
 */

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

export const validateSessionId = (sessionId) => {
  // Basic session ID validation
  return sessionId && sessionId.length > 0;
};

export const validateRoomId = (roomId) => {
  return roomId && roomId.length > 0;
};

