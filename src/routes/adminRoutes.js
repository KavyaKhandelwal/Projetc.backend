const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Event management
router.get('/events', adminController.getAllEvents);
router.get('/events/:id', adminController.getEventById);
router.put('/events/:id', adminController.updateEvent);
router.delete('/events/:id', adminController.deleteEvent);

// Report management (stubs)
router.get('/reports', adminController.getAllReports);
router.get('/reports/:id', adminController.getReportById);
router.delete('/reports/:id', adminController.deleteReport);

module.exports = router; 