const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../../config/config');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password
  });

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  await user.addRefreshToken(refreshToken);

  // Generate email verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        preferences: user.preferences
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findByEmail(email).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  await user.addRefreshToken(refreshToken);

  // Update login statistics
  user.lastLoginAt = new Date();
  user.loginCount += 1;
  await user.save();

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        preferences: user.preferences,
        lastLoginAt: user.lastLoginAt
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await req.user.removeRefreshToken(refreshToken);
  }

  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const user = req.user;
  const oldRefreshToken = req.refreshToken;

  // Generate new tokens
  const accessToken = user.generateAuthToken();
  const newRefreshToken = user.generateRefreshToken();

  // Replace old refresh token with new one
  await user.removeRefreshToken(oldRefreshToken);
  await user.addRefreshToken(newRefreshToken);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    }
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('preferences.defaultCategory', 'name color');

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        preferences: user.preferences,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      }
    }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['firstName', 'lastName', 'bio', 'preferences'];
  const updates = {};

  // Filter allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).populate('preferences.defaultCategory', 'name color');

  logger.info(`User profile updated: ${user.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        preferences: user.preferences
      }
    }
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Remove all refresh tokens (force re-login on all devices)
  user.refreshTokens = [];
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully. Please login again.'
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    // Don't reveal if user exists or not
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // TODO: Send email with reset token
  // For now, we'll just log it (in production, send actual email)
  logger.info(`Password reset token for ${email}: ${resetToken}`);

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid reset token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Remove all refresh tokens
  user.refreshTokens = [];
  
  await user.save();

  logger.info(`Password reset successful for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successful. Please login with your new password.'
  });
});

/**
 * @desc    Send email verification
 * @route   POST /api/auth/send-verification
 * @access  Private
 */
const sendEmailVerification = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // Generate verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  // TODO: Send verification email
  // For now, we'll just log it (in production, send actual email)
  logger.info(`Email verification token for ${user.email}: ${verificationToken}`);

  res.json({
    success: true,
    message: 'Verification email sent successfully.'
  });
});

/**
 * @desc    Verify email
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid verification token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  
  await user.save();

  logger.info(`Email verified for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Email verified successfully.'
  });
});

module.exports = {
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
};
