const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateNewPassword,
  validateProfileUpdate,
  handleValidationErrors
} = require('../validators/userValidator');

// Public routes
router.post('/register', validateRegister, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validatePasswordReset, handleValidationErrors, forgotPassword);
router.put('/reset-password/:resetToken', validateNewPassword, handleValidationErrors, resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, validateProfileUpdate, handleValidationErrors, updateProfile);
router.put('/change-password', protect, validateNewPassword, handleValidationErrors, changePassword);

module.exports = router; 