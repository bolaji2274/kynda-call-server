// src/config/database.js
const mongoose = require('mongoose');

class DatabaseConfig {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const options = {
        maxPoolSize: 50,
        minPoolSize: 10,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        w: 'majority',
      };

      this.connection = await mongoose.connect(
        process.env.MONGODB_URI,
        options
      );

      console.log('✓ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
    }
  }

  getConnection() {
    return this.connection;
  }
}

module.exports = new DatabaseConfig();