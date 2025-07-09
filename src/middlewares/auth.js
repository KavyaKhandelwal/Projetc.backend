const { verifyToken } = require('../utils/jwtUtils');
const User = require('../models/User');
const { errorResponse } = require('../utils/responseHandler');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return errorResponse(res, 'Not authorized to access this route', 401);
  }

  try {
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return errorResponse(res, 'Token is not valid', 401);
    }

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return errorResponse(res, 'User not found', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'User account is deactivated', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Not authorized to access this route', 401);
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, `User role ${req.user.role} is not authorized to access this route`, 403);
    }

    next();
  };
};

// Optional authentication - doesn't require token but adds user if available
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    } catch (error) {
      // Token is invalid, but we don't throw error for optional auth
    }
  }

  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth
}; 