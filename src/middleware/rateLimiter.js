const rateLimit = require('express-rate-limit');
const config = require('../../config/config');
const logger = require('../utils/logger');

/**
 * General rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(config.rateLimit.windowMs / 1000)
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      email: req.body.email
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again in 15 minutes.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email instead of IP for password reset
    return req.body.email || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded`, {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again in 1 hour.',
      retryAfter: 3600 // 1 hour in seconds
    });
  }
});

/**
 * Email verification rate limiter
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 attempts per 10 minutes
  message: {
    success: false,
    message: 'Too many email verification attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Email verification rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many email verification attempts, please try again in 10 minutes.',
      retryAfter: 600 // 10 minutes in seconds
    });
  }
});

/**
 * Search rate limiter
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    message: 'Too many search requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Search rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      searchQuery: req.query.q
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many search requests, please slow down.',
      retryAfter: 60 // 1 minute in seconds
    });
  }
});

/**
 * File upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many file uploads, please try again in 15 minutes.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

/**
 * Share creation rate limiter
 */
const shareLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 shares per 5 minutes
  message: {
    success: false,
    message: 'Too many share links created, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Share rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many share links created, please try again in 5 minutes.',
      retryAfter: 300 // 5 minutes in seconds
    });
  }
});

/**
 * API creation rate limiter (for creating notes, categories, tags)
 */
const createLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 creations per minute
  message: {
    success: false,
    message: 'Too many items created, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Create rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many items created, please slow down.',
      retryAfter: 60 // 1 minute in seconds
    });
  }
});

/**
 * Bulk operations rate limiter
 */
const bulkLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 bulk operations per 5 minutes
  message: {
    success: false,
    message: 'Too many bulk operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Bulk operation rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many bulk operations, please try again in 5 minutes.',
      retryAfter: 300 // 5 minutes in seconds
    });
  }
});

/**
 * Dynamic rate limiter based on user role
 */
const dynamicLimiter = (options = {}) => {
  return (req, res, next) => {
    // Default limits
    let windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    let max = options.max || 100;

    // Adjust limits based on user role
    if (req.user) {
      if (req.user.role === 'admin') {
        max = max * 5; // Admins get 5x the limit
      } else if (req.user.role === 'premium') {
        max = max * 2; // Premium users get 2x the limit
      }
    }

    // Create dynamic rate limiter
    const limiter = rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        message: 'Rate limit exceeded, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user ? `user_${req.user._id}` : req.ip;
      }
    });

    limiter(req, res, next);
  };
};

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  searchLimiter,
  uploadLimiter,
  shareLimiter,
  createLimiter,
  bulkLimiter,
  dynamicLimiter
};
