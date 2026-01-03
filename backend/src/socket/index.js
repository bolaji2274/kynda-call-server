// src/socket/index.js
const mediasoupService = require('../services/mediasoup.service');
const CallLog = require('../models/CallLog');
const Session = require('../models/Session');

class SocketManager {
  constructor(io, redis) {
    this.io = io;
    this.redis = redis;
    this.rooms = new Map(); // roomId -> Set of socketIds
    this.socketToRoom = new Map(); // socketId -> roomId
    this.socketToUser = new Map(); // socketId -> userId
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}, User: ${socket.userId}`);
      
      this.socketToUser.set(socket.id, socket.userId);
      
      // Store user connection in Redis
      this.updateUserStatus(socket.userId, socket.id, 'online');

      // Register all event handlers
      this.registerHandlers(socket);

      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  registerHandlers(socket) {
    // Room management
    socket.on('join-room', (data, callback) => this.handleJoinRoom(socket, data, callback));
    socket.on('leave-room', (data, callback) => this.handleLeaveRoom(socket, data, callback));

    // WebRTC signaling
    socket.on('get-router-capabilities', (data, callback) => 
      this.handleGetRouterCapabilities(socket, data, callback));
    
    socket.on('create-transport', (data, callback) => 
      this.handleCreateTransport(socket, data, callback));
    
    socket.on('connect-transport', (data, callback) => 
      this.handleConnectTransport(socket, data, callback));
    
    socket.on('produce', (data, callback) => 
      this.handleProduce(socket, data, callback));
    
    socket.on('consume', (data, callback) => 
      this.handleConsume(socket, data, callback));
    
    socket.on('resume-consumer', (data, callback) => 
      this.handleResumeConsumer(socket, data, callback));

    // Media controls
    socket.on('pause-producer', (data) => this.handlePauseProducer(socket, data));
    socket.on('resume-producer', (data) => this.handleResumeProducer(socket, data));
    socket.on('close-producer', (data) => this.handleCloseProducer(socket, data));

    // Quality control
    socket.on('update-quality', (data) => this.handleUpdateQuality(socket, data));
    socket.on('network-stats', (data) => this.handleNetworkStats(socket, data));

    // Chat and screen sharing
    socket.on('chat-message', (data) => this.handleChatMessage(socket, data));
    socket.on('screen-share-start', (data) => this.handleScreenShareStart(socket, data));
    socket.on('screen-share-stop', (data) => this.handleScreenShareStop(socket, data));
  }

  async handleJoinRoom(socket, { roomId, sessionId }, callback) {
    try {
      // Validate session
      const session = await Session.findById(sessionId);
      if (!session) {
        return callback({ error: 'Session not found' });
      }

      // Check authorization
      if (session.tutorId.toString() !== socket.userId && 
          session.studentId.toString() !== socket.userId) {
        return callback({ error: 'Unauthorized' });
      }

      // Join socket.io room
      socket.join(roomId);
      
      // Update room tracking
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(socket.id);
      this.socketToRoom.set(socket.id, roomId);

      // Get existing participants
      const participants = Array.from(this.rooms.get(roomId))
        .filter(sid => sid !== socket.id)
        .map(sid => ({
          socketId: sid,
          userId: this.socketToUser.get(sid),
        }));

      // Update user status
      await this.updateUserStatus(socket.userId, socket.id, 'in_call', roomId);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        userId: socket.userId,
      });

      // Update session
      if (session.status === 'scheduled') {
        session.status = 'active';
        session.startedAt = new Date();
        await session.save();
      }

      // Log event
      await this.logCallEvent(sessionId, socket.userId, 'joined');

      console.log(`User ${socket.userId} joined room ${roomId}`);

      callback({
        success: true,
        participants,
        roomId,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  }

  async handleLeaveRoom(socket, { roomId }, callback) {
    try {
      await this.leaveRoom(socket, roomId);
      callback({ success: true });
    } catch (error) {
      console.error('Error leaving room:', error);
      callback({ error: error.message });
    }
  }

  async leaveRoom(socket, roomId) {
    if (!roomId) {
      roomId = this.socketToRoom.get(socket.id);
    }

    if (!roomId) return;

    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        this.rooms.delete(roomId);
        // Close mediasoup router
        mediasoupService.closeRoom(roomId);
      }
    }

    this.socketToRoom.delete(socket.id);

    // Notify others
    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Update user status
    await this.updateUserStatus(socket.userId, socket.id, 'online');

    // Log event
    const session = await Session.findOne({ roomId });
    if (session) {
      await this.logCallEvent(session._id, socket.userId, 'left');
      
      // End session if room is empty
      if (!room || room.size === 0) {
        session.status = 'completed';
        session.endedAt = new Date();
        await session.save();
      }
    }

    console.log(`User ${socket.userId} left room ${roomId}`);
  }

  async handleGetRouterCapabilities(socket, { roomId }, callback) {
    try {
      const rtpCapabilities = await mediasoupService.getRouterRtpCapabilities(roomId);
      callback({ rtpCapabilities });
    } catch (error) {
      console.error('Error getting router capabilities:', error);
      callback({ error: error.message });
    }
  }

  async handleCreateTransport(socket, { roomId, direction }, callback) {
    try {
      const transport = await mediasoupService.createWebRtcTransport(
        roomId,
        socket.id,
        direction
      );
      callback(transport);
    } catch (error) {
      console.error('Error creating transport:', error);
      callback({ error: error.message });
    }
  }

  async handleConnectTransport(socket, { transportId, dtlsParameters }, callback) {
    try {
      await mediasoupService.connectTransport(transportId, dtlsParameters);
      callback({ success: true });
    } catch (error) {
      console.error('Error connecting transport:', error);
      callback({ error: error.message });
    }
  }

  async handleProduce(socket, { transportId, kind, rtpParameters }, callback) {
    try {
      const roomId = this.socketToRoom.get(socket.id);
      const { id } = await mediasoupService.produce(
        transportId,
        kind,
        rtpParameters,
        { socketId: socket.id, userId: socket.userId, roomId }
      );

      // Notify other participants about new producer
      socket.to(roomId).emit('new-producer', {
        producerId: id,
        socketId: socket.id,
        userId: socket.userId,
        kind,
      });

      callback({ id });
    } catch (error) {
      console.error('Error producing:', error);
      callback({ error: error.message });
    }
  }

  async handleConsume(socket, { transportId, producerId, rtpCapabilities }, callback) {
    try {
      const consumer = await mediasoupService.consume(
        transportId,
        producerId,
        rtpCapabilities,
        socket.id
      );
      callback(consumer);
    } catch (error) {
      console.error('Error consuming:', error);
      callback({ error: error.message });
    }
  }

  async handleResumeConsumer(socket, { consumerId }, callback) {
    try {
      await mediasoupService.resumeConsumer(consumerId);
      callback({ success: true });
    } catch (error) {
      console.error('Error resuming consumer:', error);
      callback({ error: error.message });
    }
  }

  handlePauseProducer(socket, { producerId }) {
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('producer-paused', { producerId, socketId: socket.id });
  }

  handleResumeProducer(socket, { producerId }) {
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('producer-resumed', { producerId, socketId: socket.id });
  }

  handleCloseProducer(socket, { producerId }) {
    mediasoupService.closeProducer(producerId);
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('producer-closed', { producerId, socketId: socket.id });
  }

  handleUpdateQuality(socket, { quality }) {
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('quality-updated', {
      socketId: socket.id,
      quality,
    });
  }

  async handleNetworkStats(socket, stats) {
    // Store network stats in Redis for monitoring
    const roomId = this.socketToRoom.get(socket.id);
    if (roomId) {
      await this.redis.setex(
        `network_stats:${roomId}:${socket.id}`,
        60,
        JSON.stringify({ ...stats, timestamp: Date.now() })
      );
    }
  }

  handleChatMessage(socket, { message }) {
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('chat-message', {
      userId: socket.userId,
      message,
      timestamp: Date.now(),
    });
  }

  handleScreenShareStart(socket, { producerId }) {
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('screen-share-started', {
      socketId: socket.id,
      userId: socket.userId,
      producerId,
    });
  }

  handleScreenShareStop(socket, data) {
    const roomId = this.socketToRoom.get(socket.id);
    socket.to(roomId).emit('screen-share-stopped', {
      socketId: socket.id,
      userId: socket.userId,
    });
  }

  async handleDisconnect(socket) {
    console.log(`Socket disconnected: ${socket.id}`);

    const roomId = this.socketToRoom.get(socket.id);
    if (roomId) {
      await this.leaveRoom(socket, roomId);
    }

    this.socketToUser.delete(socket.id);
    await this.updateUserStatus(socket.userId, socket.id, 'offline');
  }

  async updateUserStatus(userId, socketId, status, roomId = null) {
    const key = `user:${userId}:connection`;
    await this.redis.setex(
      key,
      3600,
      JSON.stringify({
        userId,
        socketId,
        status,
        roomId,
        lastSeen: Date.now(),
      })
    );
  }

  async logCallEvent(sessionId, userId, eventType, metadata = {}) {
    try {
      await CallLog.findOneAndUpdate(
        { sessionId },
        {
          $push: {
            events: {
              type: eventType,
              userId,
              timestamp: new Date(),
              metadata,
            },
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error logging call event:', error);
    }
  }
}

module.exports = (io, redis) => {
  const manager = new SocketManager(io, redis);
  manager.initialize();
  return manager;
};