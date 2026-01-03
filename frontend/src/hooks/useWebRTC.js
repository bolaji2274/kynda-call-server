// src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

export const useWebRTC = (sessionId, roomId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [error, setError] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [isReconnecting, setIsReconnecting] = useState(false);

  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map());
  const consumersRef = useRef(new Map());
  const networkStatsRef = useRef(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Connection failed. Retrying...');
    });

    // Handle new participants
    socket.on('user-joined', async ({ socketId, userId }) => {
      console.log('User joined:', userId);
      setParticipants(prev => [...prev, { socketId, userId }]);
      
      // Create consumers for new participant's producers
      // This will be handled by new-producer event
    });

    socket.on('user-left', ({ socketId, userId }) => {
      console.log('User left:', userId);
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      
      // Remove remote streams
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });

      // Close associated consumers
      consumersRef.current.forEach((consumer, consumerId) => {
        if (consumer.appData.socketId === socketId) {
          consumer.close();
          consumersRef.current.delete(consumerId);
        }
      });
    });

    socket.on('new-producer', async ({ producerId, socketId, userId, kind }) => {
      console.log('New producer:', producerId, kind);
      await createConsumer(socketId, producerId, kind);
    });

    socket.on('producer-closed', ({ producerId, socketId }) => {
      console.log('Producer closed:', producerId);
      const consumer = Array.from(consumersRef.current.values())
        .find(c => c.producerId === producerId);
      
      if (consumer) {
        consumer.close();
        consumersRef.current.delete(consumer.id);
      }
    });

    socket.on('producer-paused', ({ producerId }) => {
      const consumer = Array.from(consumersRef.current.values())
        .find(c => c.producerId === producerId);
      if (consumer) consumer.pause();
    });

    socket.on('producer-resumed', ({ producerId }) => {
      const consumer = Array.from(consumersRef.current.values())
        .find(c => c.producerId === producerId);
      if (consumer) consumer.resume();
    });

    socketRef.current = socket;
    return socket;
  }, [token]);

  // Join room
  const joinRoom = useCallback(async () => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }

    return new Promise((resolve, reject) => {
      socketRef.current.emit('join-room', { roomId, sessionId }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          setParticipants(response.participants);
          resolve(response);
        }
      });
    });
  }, [roomId, sessionId]);

  // Initialize mediasoup device
  const initializeDevice = useCallback(async () => {
    if (deviceRef.current) return deviceRef.current;

    const device = new mediasoupClient.Device();

    const { rtpCapabilities } = await new Promise((resolve, reject) => {
      socketRef.current.emit('get-router-capabilities', { roomId }, (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });

    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    
    return device;
  }, [roomId]);

  // Create send transport
  const createSendTransport = useCallback(async () => {
    if (sendTransportRef.current) return sendTransportRef.current;

    const device = deviceRef.current;
    const transportData = await new Promise((resolve, reject) => {
      socketRef.current.emit('create-transport', 
        { roomId, direction: 'send' }, 
        (response) => {
          if (response.error) reject(new Error(response.error));
          else resolve(response);
        }
      );
    });

    const transport = device.createSendTransport(transportData);

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          socketRef.current.emit('connect-transport', 
            { transportId: transport.id, dtlsParameters },
            (response) => {
              if (response.error) reject(new Error(response.error));
              else resolve(response);
            }
          );
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await new Promise((resolve, reject) => {
          socketRef.current.emit('produce',
            { transportId: transport.id, kind, rtpParameters },
            (response) => {
              if (response.error) reject(new Error(response.error));
              else resolve(response);
            }
          );
        });
        callback({ id });
      } catch (error) {
        errback(error);
      }
    });

    transport.on('connectionstatechange', (state) => {
      console.log('Send transport state:', state);
      if (state === 'failed' || state === 'closed') {
        setError('Connection lost. Reconnecting...');
      }
    });

    sendTransportRef.current = transport;
    return transport;
  }, [roomId]);

  // Create receive transport
  const createRecvTransport = useCallback(async () => {
    if (recvTransportRef.current) return recvTransportRef.current;

    const device = deviceRef.current;
    const transportData = await new Promise((resolve, reject) => {
      socketRef.current.emit('create-transport',
        { roomId, direction: 'recv' },
        (response) => {
          if (response.error) reject(new Error(response.error));
          else resolve(response);
        }
      );
    });

    const transport = device.createRecvTransport(transportData);

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          socketRef.current.emit('connect-transport',
            { transportId: transport.id, dtlsParameters },
            (response) => {
              if (response.error) reject(new Error(response.error));
              else resolve(response);
            }
          );
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    transport.on('connectionstatechange', (state) => {
      console.log('Recv transport state:', state);
    });

    recvTransportRef.current = transport;
    return transport;
  }, [roomId]);

  // Produce media (audio/video)
  const produceMedia = useCallback(async (track, kind) => {
    try {
      const transport = await createSendTransport();
      
      const producer = await transport.produce({
        track,
        codecOptions: kind === 'audio' ? {
          opusStereo: true,
          opusDtx: true,
          opusFec: true,
        } : undefined,
        appData: { kind },
      });

      producersRef.current.set(producer.id, producer);

      producer.on('trackended', () => {
        console.log('Track ended:', kind);
        stopProducing(producer.id);
      });

      producer.on('transportclose', () => {
        console.log('Producer transport closed:', kind);
        producersRef.current.delete(producer.id);
      });

      return producer;
    } catch (error) {
      console.error('Error producing media:', error);
      throw error;
    }
  }, [createSendTransport]);

  // Create consumer for remote producer
  const createConsumer = useCallback(async (socketId, producerId, kind) => {
    try {
      const transport = await createRecvTransport();
      const device = deviceRef.current;

      const consumerData = await new Promise((resolve, reject) => {
        socketRef.current.emit('consume',
          {
            transportId: transport.id,
            producerId,
            rtpCapabilities: device.rtpCapabilities,
          },
          (response) => {
            if (response.error) reject(new Error(response.error));
            else resolve(response);
          }
        );
      });

      const consumer = await transport.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters,
        appData: { socketId, producerId },
      });

      consumersRef.current.set(consumer.id, consumer);

      // Add track to remote stream
      setRemoteStreams(prev => {
        const next = new Map(prev);
        let stream = next.get(socketId);
        
        if (!stream) {
          stream = new MediaStream();
          next.set(socketId, stream);
        }
        
        stream.addTrack(consumer.track);
        return next;
      });

      // Resume consumer
      await new Promise((resolve, reject) => {
        socketRef.current.emit('resume-consumer',
          { consumerId: consumer.id },
          (response) => {
            if (response.error) reject(new Error(response.error));
            else resolve(response);
          }
        );
      });

      consumer.on('trackended', () => {
        console.log('Consumer track ended');
      });

      consumer.on('transportclose', () => {
        console.log('Consumer transport closed');
        consumersRef.current.delete(consumer.id);
      });

      return consumer;
    } catch (error) {
      console.error('Error creating consumer:', error);
    }
  }, [createRecvTransport]);

  // Start local media
  const startLocalMedia = useCallback(async (audioOnly = false) => {
    try {
      const constraints = {
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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Produce audio
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        await produceMedia(audioTrack, 'audio');
      }

      // Produce video if not audio-only
      if (!audioOnly) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          await produceMedia(videoTrack, 'video');
        }
      }

      return stream;
    } catch (error) {
      console.error('Error starting local media:', error);
      setError('Could not access camera/microphone');
      throw error;
    }
  }, [produceMedia]);

  // Stop producing
  const stopProducing = useCallback((producerId) => {
    const producer = producersRef.current.get(producerId);
    if (producer) {
      producer.close();
      producersRef.current.delete(producerId);
      socketRef.current?.emit('close-producer', { producerId });
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        const audioProducer = Array.from(producersRef.current.values())
          .find(p => p.kind === 'audio');
        
        if (audioProducer) {
          if (audioTrack.enabled) {
            audioProducer.resume();
            socketRef.current?.emit('resume-producer', { producerId: audioProducer.id });
          } else {
            audioProducer.pause();
            socketRef.current?.emit('pause-producer', { producerId: audioProducer.id });
          }
        }
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        const videoProducer = Array.from(producersRef.current.values())
          .find(p => p.kind === 'video');
        
        if (videoProducer) {
          if (videoTrack.enabled) {
            videoProducer.resume();
            socketRef.current?.emit('resume-producer', { producerId: videoProducer.id });
          } else {
            videoProducer.pause();
            socketRef.current?.emit('pause-producer', { producerId: videoProducer.id });
          }
        }
      }
    }
  }, [localStream]);

  // Monitor network quality
  const monitorQuality = useCallback(() => {
    if (!networkStatsRef.current) {
      networkStatsRef.current = setInterval(async () => {
        const producers = Array.from(producersRef.current.values());
        
        for (const producer of producers) {
          const stats = await producer.getStats();
          
          stats.forEach(stat => {
            if (stat.type === 'outbound-rtp') {
              const packetLoss = stat.packetsLost / (stat.packetsSent || 1);
              
              if (packetLoss > 0.05) {
                setConnectionQuality('poor');
              } else if (packetLoss > 0.02) {
                setConnectionQuality('fair');
              } else {
                setConnectionQuality('good');
              }

              // Send stats to server
              socketRef.current?.emit('network-stats', {
                kind: producer.kind,
                packetLoss,
                bitrate: stat.bitrate,
                timestamp: stat.timestamp,
              });
            }
          });
        }
      }, 5000);
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close producers
    producersRef.current.forEach(producer => producer.close());
    producersRef.current.clear();

    // Close consumers
    consumersRef.current.forEach(consumer => consumer.close());
    consumersRef.current.clear();

    // Close transports
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }

    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }

    // Clear network monitoring
    if (networkStatsRef.current) {
      clearInterval(networkStatsRef.current);
      networkStatsRef.current = null;
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsConnected(false);
  }, [localStream, roomId]);

  // Initialize on mount
  useEffect(() => {
    if (!sessionId || !roomId || !token) return;

    const init = async () => {
      try {
        initializeSocket();
        await initializeDevice();
        await joinRoom();
        monitorQuality();
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
      }
    };

    init();

    return cleanup;
  }, [sessionId, roomId, token]);

  return {
    isConnected,
    participants,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    error,
    connectionQuality,
    isReconnecting,
    startLocalMedia,
    toggleAudio,
    toggleVideo,
    stopProducing,
  };
};