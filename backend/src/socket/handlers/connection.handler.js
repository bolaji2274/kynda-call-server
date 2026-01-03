// // ============================================================================
// // SOCKET HANDLERS
// // ============================================================================

// // src/socket/handlers/connection.handler.js
// const redisConfig = require('../../config/redis');

// module.exports = (io, socket) => {
//   console.log(`Client connected: ${socket.id}, User: ${socket.userId}`);
  
//   // Store user connection in Redis
//   const updateUserStatus = async (status) => {
//     await redisConfig.set(
//       `user:${socket.userId}:connection`,
//       {
//         userId: socket.userId,
//         socketId: socket.id,
//         status,
//         lastSeen: Date.now(),
//       },
//       3600 // 1 hour expiry
//     );
//   };
  
//   updateUserStatus('online');
  
//   socket.on('disconnect', async () => {
//     console.log(`Client disconnected: ${socket.id}`);
//     await updateUserStatus('offline');
//   });
  
//   socket.on('heartbeat', () => {
//     updateUserStatus('online');
//     socket.emit('heartbeat-ack', { timestamp: Date.now() });
//   });
// };

// ============================================================================
// MISSING FILE 3: backend/src/socket/handlers/connection.handler.js
// ============================================================================

class ConnectionHandler {
  constructor(io, redis) {
    this.io = io;
    this.redis = redis;
  }

  register(socket, socketToUser) {
    console.log(`Client connected: ${socket.id}, User: ${socket.userId}`);
    
    // Store user connection in Redis
    this.updateUserStatus(socket.userId, socket.id, 'online');
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      await this.updateUserStatus(socket.userId, socket.id, 'offline');
    });
    
    // Handle heartbeat
    socket.on('heartbeat', () => {
      this.updateUserStatus(socket.userId, socket.id, 'online');
      socket.emit('heartbeat-ack', { timestamp: Date.now() });
    });
  }

  async updateUserStatus(userId, socketId, status) {
    try {
      const key = `user:${userId}:connection`;
      await this.redis.set(
        key,
        JSON.stringify({
          userId,
          socketId,
          status,
          lastSeen: Date.now(),
        }),
        3600 // 1 hour expiry
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }
}

module.exports = ConnectionHandler;