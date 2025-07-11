const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../../config/config');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  next();
};

/**
 * Middleware to check if user owns the resource
 */
const requireOwnership = (resourceField = 'author') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if resource exists and user owns it
    if (req.resource && req.resource[resourceField]) {
      if (req.resource[resourceField].toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this resource.'
        });
      }
    }

    next();
  };
};

/**
 * Middleware to check collaboration permissions
 */
const checkCollaborationPermission = (requiredPermission = 'view') => {
  return (req, res, next) => {
    if (!req.user || !req.resource) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user is the owner
    if (req.resource.author && req.resource.author.toString() === req.user._id.toString()) {
      return next();
    }

    // Check if user is a collaborator with required permission
    const collaboration = req.resource.collaborators?.find(
      collab => collab.user.toString() === req.user._id.toString()
    );

    if (!collaboration) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a collaborator on this resource.'
      });
    }

    // Check permission level
    const permissionLevels = {
      'view': 1,
      'edit': 2,
      'admin': 3
    };

    const userPermissionLevel = permissionLevels[collaboration.permission] || 0;
    const requiredPermissionLevel = permissionLevels[requiredPermission] || 0;

    if (userPermissionLevel < requiredPermissionLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${requiredPermission} permission required.`
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error.message);
  }
  
  next();
};

/**
 * Middleware to verify refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.'
      });
    }

    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found.'
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Refresh token verification failed.'
    });
  }
};

/**
 * Helper function to extract token from request headers
 */
const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Middleware to check if email is verified
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireOwnership,
  checkCollaborationPermission,
  optionalAuth,
  verifyRefreshToken,
  requireEmailVerification,
  getTokenFromHeader
};
