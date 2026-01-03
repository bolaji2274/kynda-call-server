// ============================================================================
// MISSING FILE 2: frontend/src/utils/webrtcConfig.js
// ============================================================================

/**
 * WebRTC Configuration
 */
export const getWebRTCConfig = () => {
  const turnServer = import.meta.env.VITE_TURN_SERVER;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnPassword = import.meta.env.VITE_TURN_PASSWORD;
  const stunServer = import.meta.env.VITE_STUN_SERVER;

  const iceServers = [
    // STUN servers
    { urls: stunServer || 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Add TURN server if configured
  if (turnServer && turnUsername && turnPassword) {
    iceServers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnPassword,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
};

/**
 * Media Constraints
 */
export const getMediaConstraints = (audioOnly = false) => {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    },
    video: audioOnly ? false : {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 24, max: 30 },
    },
  };
};