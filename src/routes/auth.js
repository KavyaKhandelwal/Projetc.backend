const express = require('express');
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  sendEmailVerification,
  verifyEmail
} = require('../controllers/authController');

const {
  authenticate,
  verifyRefreshToken,
  requireEmailVerification
} = require('../middleware/auth');

const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateUserUpdate
} = require('../middleware/validation');

const {
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, validateUserRegistration, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, validateUserLogin, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', verifyRefreshToken, refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, validateUserUpdate, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.put('/change-password', authenticate, changePassword);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Forgot password
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, validatePasswordReset, forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post('/reset-password', validatePasswordUpdate, resetPassword);

/**
 * @route   POST /api/auth/send-verification
 * @desc    Send email verification
 * @access  Private
 */
router.post('/send-verification', authenticate, emailVerificationLimiter, sendEmailVerification);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email
 * @access  Public
 */
router.post('/verify-email', verifyEmail);

module.exports = router;
