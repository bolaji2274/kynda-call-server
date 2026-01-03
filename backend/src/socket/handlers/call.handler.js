// ============================================================================
// MISSING FILE 2: backend/src/socket/handlers/call.handler.js
// ============================================================================

const Session = require('../../models/Session');
const CallLog = require('../../models/CallLog');

class CallHandler {
  constructor(io, redis) {
    this.io = io;
    this.redis = redis;
  }

  register(socket, socketToRoom, socketToUser) {
    // Call started event
    socket.on('call-started', async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId);
        
        if (session && session.status === 'scheduled') {
          await session.start();
          
          // Create call log
          const callLog = new CallLog({
            sessionId: session._id,
            participants: [socket.userId],
          });
          await callLog.save();
          
          console.log(`Call started: ${sessionId}`);
        }
      } catch (error) {
        console.error('Call started error:', error);
      }
    });

    // Call ended event
    socket.on('call-ended', async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId);
        
        if (session && session.status === 'active') {
          await session.end();
          console.log(`Call ended: ${sessionId}`);
        }
      } catch (error) {
        console.error('Call ended error:', error);
      }
    });

    // Quality update event
    socket.on('quality-update', async ({ sessionId, metrics }) => {
      try {
        const callLog = await CallLog.findOne({ sessionId });
        
        if (callLog) {
          await callLog.updateQualityMetrics(metrics);
        }
      } catch (error) {
        console.error('Quality update error:', error);
      }
    });

    // Network stats event
    socket.on('network-stats', async ({ sessionId, stats }) => {
      try {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        // Store in Redis with TTL
        const key = `network_stats:${roomId}:${socket.id}`;
        await this.redis.set(
          key,
          JSON.stringify({
            userId: socket.userId,
            stats,
            timestamp: Date.now(),
          }),
          60 // 60 seconds TTL
        );
      } catch (error) {
        console.error('Network stats error:', error);
      }
    });
  }
}

module.exports = CallHandler;