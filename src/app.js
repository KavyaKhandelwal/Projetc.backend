const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import utilities and middleware
const database = require('./utils/database');
const logger = require('./utils/logger');
const config = require('../config/config');

const {
  errorHandler,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException,
  handleGracefulShutdown
} = require('./middleware/errorHandler');

const { generalLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const shareRoutes = require('./routes/share');

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Create Express app
const app = express();

// Trust proxy (for rate limiting and logging)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/shared', shareRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Notes App API',
    version: '1.0.0',
    documentation: {
      authentication: '/api/auth',
      notes: '/api/notes',
      categories: '/api/categories',
      tags: '/api/tags',
      sharing: '/api/shared'
    },
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refreshToken: 'POST /api/auth/refresh-token',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password'
      },
      notes: {
        list: 'GET /api/notes',
        create: 'POST /api/notes',
        get: 'GET /api/notes/:id',
        update: 'PUT /api/notes/:id',
        delete: 'DELETE /api/notes/:id',
        stats: 'GET /api/notes/stats',
        shared: 'GET /api/notes/shared',
        collaborated: 'GET /api/notes/collaborated'
      },
      categories: {
        list: 'GET /api/categories',
        create: 'POST /api/categories',
        get: 'GET /api/categories/:id',
        update: 'PUT /api/categories/:id',
        delete: 'DELETE /api/categories/:id',
        hierarchy: 'GET /api/categories/hierarchy',
        stats: 'GET /api/categories/stats'
      },
      tags: {
        list: 'GET /api/tags',
        create: 'POST /api/tags',
        get: 'GET /api/tags/:id',
        update: 'PUT /api/tags/:id',
        delete: 'DELETE /api/tags/:id',
        popular: 'GET /api/tags/popular',
        search: 'GET /api/tags/search',
        stats: 'GET /api/tags/stats'
      },
      sharing: {
        getShared: 'GET /api/shared/:shareId'
      }
    }
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server function
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
      logger.info(`Health check available at http://localhost:${config.port}/health`);
      logger.info(`API documentation available at http://localhost:${config.port}/api`);
    });

    // Handle graceful shutdown
    handleGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
