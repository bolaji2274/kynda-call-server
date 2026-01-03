const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const mediasoupService = require('./mediasoup.service');
const socketHandlers = require('./socket.handlers');

let initialized = false;

async function initializeCallSystem(io) {
  if (initialized) {
    console.log('Call system already initialized');
    return;
  }

  try {
    console.log('Initializing call system...');

    // 1. Initialize Redis for Socket.io scaling
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();
    
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✓ Redis adapter configured');

    // 2. Initialize Mediasoup
    await mediasoupService.initialize();
    console.log('✓ Mediasoup initialized');

    // 3. Setup Socket.io authentication
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('Authentication token required');
        }
        
        // Use YOUR existing auth verification
        const user = await verifyToken(token); // ← Use your existing function
        socket.userId = user.id || user._id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // 4. Setup call handlers
    socketHandlers(io);
    console.log('✓ Call handlers configured');

    initialized = true;
    console.log('✓ Call system initialized successfully');

  } catch (error) {
    console.error('Failed to initialize call system:', error);
    throw error;
  }
}

// Import your existing token verification
async function verifyToken(token) {
  // Replace this with YOUR existing JWT verification
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = initializeCallSystem;