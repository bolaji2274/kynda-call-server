// hooks/useScreenShare.js
import { useState, useCallback } from 'react';

export const useScreenShare = (socket, sendTransport, producersRef) => {
  const [isSharing, setIsSharing] = useState(false);
  const [screenShareProducer, setScreenShareProducer] = useState(null);

  const startScreenShare = useCallback(async () => {
    try {
      // Get screen share stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // 'window', 'application', 'browser'
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 15, max: 30 }, // Lower FPS for bandwidth
        },
        audio: {
          // Optional: Share system audio
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const videoTrack = stream.getVideoTracks()[0];
      
      // Handle user clicking "Stop sharing" in browser
      videoTrack.onended = () => {
        stopScreenShare();
      };

      // Produce screen share
      const producer = await sendTransport.produce({
        track: videoTrack,
        encodings: [
          // Simulcast for screen share (optional)
          { maxBitrate: 3000000, scalabilityMode: 'S1T3' }, // High quality
          { maxBitrate: 1500000, scalabilityMode: 'S1T3' }, // Medium
          { maxBitrate: 500000, scalabilityMode: 'S1T3' },  // Low
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
        appData: {
          share: true,
          source: 'screen',
        },
      });

      // Notify server
      socket.emit('start-screen-share', {
        transportId: sendTransport.id,
        rtpParameters: producer.rtpParameters,
      });

      setScreenShareProducer(producer);
      setIsSharing(true);

      // Store in refs
      producersRef.current.set(producer.id, producer);

      return { success: true };

    } catch (error) {
      console.error('Screen share failed:', error);
      
      if (error.name === 'NotAllowedError') {
        return { error: 'Screen share permission denied' };
      }
      
      return { error: error.message };
    }
  }, [socket, sendTransport, producersRef]);

  const stopScreenShare = useCallback(() => {
    if (screenShareProducer) {
      // Stop the track
      const track = screenShareProducer.track;
      track.stop();

      // Close producer
      screenShareProducer.close();
      producersRef.current.delete(screenShareProducer.id);

      // Notify server
      socket.emit('stop-screen-share', {});

      setScreenShareProducer(null);
      setIsSharing(false);
    }
  }, [screenShareProducer, socket, producersRef]);

  return {
    isSharing,
    startScreenShare,
    stopScreenShare,
  };
};