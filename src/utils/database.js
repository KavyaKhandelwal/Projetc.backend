const mongoose = require('mongoose');
const config = require('../../config/config');
const logger = require('./logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const uri = config.nodeEnv === 'test' ? config.mongodb.testUri : config.mongodb.uri;
      
      this.connection = await mongoose.connect(uri, config.mongodb.options);
      
      logger.info(`MongoDB connected successfully to ${uri}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  async clearDatabase() {
    if (config.nodeEnv === 'test') {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
