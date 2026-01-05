// ============================================================================
// FILE 1: backend/src/config/redis.js
// ============================================================================

const Redis = require('ioredis');

class RedisConfig {
  constructor() {
    this.client = null;
    this.pubClient = null;
    this.subClient = null;
  }

  async connect() {
    try {
      const redisOptions = {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // Reconnect on READONLY errors
          }
          return false;
        },
      };

      // Main client
      this.client = new Redis(process.env.REDIS_URI, redisOptions);

      // Pub/Sub clients for Socket.io adapter
      this.pubClient = new Redis(process.env.REDIS_URI, redisOptions);
      this.subClient = this.pubClient.duplicate();

      // Event listeners
      this.client.on('connect', () => {
        console.log('✓ Redis connected');
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      // Wait for connection
      await this.client.ping();

      return {
        client: this.client,
        pubClient: this.pubClient,
        subClient: this.subClient,
      };
    } catch (error) {
      console.error('Redis connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    if (this.client) await this.client.quit();
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
    console.log('Redis disconnected');
  }

  getClient() {
    return this.client;
  }

  getPubSubClients() {
    return {
      pubClient: this.pubClient,
      subClient: this.subClient,
    };
  }

  // Helper methods for common operations
  async set(key, value, expirySeconds = null) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (expirySeconds) {
      return await this.client.setex(key, expirySeconds, stringValue);
    }
    return await this.client.set(key, stringValue);
  }

  async get(key) {
    const value = await this.client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async delete(key) {
    return await this.client.del(key);
  }

  async exists(key) {
    return await this.client.exists(key);
  }

  async increment(key) {
    return await this.client.incr(key);
  }

  async expire(key, seconds) {
    return await this.client.expire(key, seconds);
  }

  async getKeys(pattern) {
    return await this.client.keys(pattern);
  }

  // List operations
  async lpush(key, ...values) {
    return await this.client.lpush(key, ...values);
  }

  async rpush(key, ...values) {
    return await this.client.rpush(key, ...values);
  }

  async lrange(key, start, stop) {
    return await this.client.lrange(key, start, stop);
  }

  // Hash operations
  async hset(key, field, value) {
    return await this.client.hset(key, field, value);
  }

  async hget(key, field) {
    return await this.client.hget(key, field);
  }

  async hgetall(key) {
    return await this.client.hgetall(key);
  }

  // Set operations
  async sadd(key, ...members) {
    return await this.client.sadd(key, ...members);
  }

  async smembers(key) {
    return await this.client.smembers(key);
  }

  async sismember(key, member) {
    return await this.client.sismember(key, member);
  }
}

module.exports = new RedisConfig();