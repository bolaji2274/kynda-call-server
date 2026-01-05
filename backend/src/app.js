// src/app.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

const config = require('./config/env');
const authMiddleware = require('./middleware/auth.middleware');
const rateLimitMiddleware = require('./middleware/rateLimit.middleware');
const sessionRoutes = require('./routes/session.routes');
const callRoutes = require('./routes/call.routes');
const socketHandlers = require('./socket');
const metricsService = require('./services/metrics.service');

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    res.end(await metricsService.getMetrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});


class KyndaCallServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = null;
    this.redis = null;
    this.pubClient = null;
    this.subClient = null;
  }

  async initializeDatabase() {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        maxPoolSize: 50,
        minPoolSize: 10,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✓ MongoDB connected');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async initializeRedis() {
    try {
      this.redis = new Redis(config.REDIS_URI, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // For Socket.io Redis adapter
      this.pubClient = new Redis(config.REDIS_URI);
      this.subClient = this.pubClient.duplicate();

      await this.redis.ping();
      console.log('✓ Redis connected');
    } catch (error) {
      console.error('Redis connection error:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: config.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    console.log('✓ Middleware configured');
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/sessions', authMiddleware, sessionRoutes);
    this.app.use('/api/calls', authMiddleware, callRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(config.NODE_ENV === 'development' && { stack: err.stack }),
      });
    });

    console.log('✓ Routes configured');
  }

  

  setupSocketIO() {
    this.io = socketIO(this.server, {
      cors: {
        origin: config.ALLOWED_ORIGINS,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8, // 100 MB
      allowUpgrades: true,
    });

    // Redis adapter for horizontal scaling
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Authentication middleware for Socket.io
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('Authentication token required');
        }
        
        // Verify JWT token
        const user = await this.verifyToken(token);
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Initialize socket handlers
    socketHandlers(this.io, this.redis);

    console.log('✓ Socket.IO configured');
  }

  async verifyToken(token) {
    // Implement JWT verification
    // This should verify the token and return user data
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, config.JWT_SECRET);
  }

  async start() {
    try {
      await this.initializeDatabase();
      await this.initializeRedis();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupSocketIO();

      const PORT = config.PORT || 3000;
      this.server.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════╗
║   Kynda Call Server Running                ║
║   Port: ${PORT}                            ║
║   Environment: ${config.NODE_ENV}          ║
║   PID: ${process.pid}                      ║
╚════════════════════════════════════════════╝
        `);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('\nShutting down gracefully...');
    
    this.server.close(() => {
      console.log('HTTP server closed');
    });

    if (this.io) {
      this.io.close(() => {
        console.log('Socket.IO closed');
      });
    }

    if (this.redis) {
      await this.redis.quit();
      console.log('Redis connection closed');
    }

    await mongoose.connection.close();
    console.log('MongoDB connection closed');

    process.exit(0);
  }
}

// Start server
const server = new KyndaCallServer();
server.start();

module.exports = server;