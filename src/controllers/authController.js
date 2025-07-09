const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const Event = require('../models/Event');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: role || 'user',
      dateOfBirth
    });

    // Generate token
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    successResponse(res, {
      user: userResponse,
      token,
      refreshToken
    }, 'User registered successfully', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    successResponse(res, {
      user: userResponse,
      token,
      refreshToken
    }, 'Login successful');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Clear refresh token cookie
    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true
    });

    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    successResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'bio', 'dateOfBirth', 
      'address', 'preferences', 'profilePicture'
    ];

    // Filter out fields that are not allowed to be updated
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    successResponse(res, user, 'Profile updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token not provided', 401);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    if (!decoded) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return errorResponse(res, 'User not found or inactive', 401);
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Set new refresh token in cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    successResponse(res, {
      token: newToken,
      refreshToken: newRefreshToken
    }, 'Token refreshed successfully');
  } catch (error) {
    errorResponse(res, 'Invalid refresh token', 401);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // TODO: Send email with reset token
    // For now, just return the token (in production, send via email)
    successResponse(res, {
      resetToken: resetToken
    }, 'Password reset token sent to email');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    // Hash the reset token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user with reset token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired reset token', 400);
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    successResponse(res, null, 'Password reset successful');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// List all users with pagination and search
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(filter);
    successResponse(res, {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        limit: parseInt(limit)
      }
    }, 'Users retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFoundResponse(res, 'User not found');
    successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Update user by ID
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return notFoundResponse(res, 'User not found');
    successResponse(res, user, 'User updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Delete user by ID
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return notFoundResponse(res, 'User not found');
    successResponse(res, user, 'User deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// List all events with pagination and search
const getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) {
      filter.$text = { $search: search };
    }
    const events = await Event.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Event.countDocuments(filter);
    successResponse(res, {
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        limit: parseInt(limit)
      }
    }, 'Events retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Get single event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return notFoundResponse(res, 'Event not found');
    successResponse(res, event, 'Event retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Update event by ID
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return notFoundResponse(res, 'Event not found');
    successResponse(res, event, 'Event updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Delete event by ID
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return notFoundResponse(res, 'Event not found');
    successResponse(res, event, 'Event deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// --- Report management stubs ---
// List all reports (stub)
const getAllReports = async (req, res) => {
  return successResponse(res, [], 'Report management not implemented yet');
};
// Get single report (stub)
const getReportById = async (req, res) => {
  return successResponse(res, {}, 'Report management not implemented yet');
};
// Delete report (stub)
const deleteReport = async (req, res) => {
  return successResponse(res, {}, 'Report management not implemented yet');
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getAllReports,
  getReportById,
  deleteReport
}; 