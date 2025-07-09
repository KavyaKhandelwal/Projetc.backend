const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getFeaturedEvents,
  getEventsByCategory,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  updateEventStatus,
  addEventReview,
  searchEvents,
  getUpcomingEvents,
  toggleEventFeatured
} = require('../controllers/eventController');
const { protect, authorize } = require('../middlewares/auth');
const {
  validateEvent,
  validateEventId,
  validateEventSearch,
  validateEventReview,
  validateEventStatus,
  handleValidationErrors
} = require('../validators/eventValidator');

// Public routes - anyone can access
router.get('/', validateEventSearch, handleValidationErrors, getAllEvents);
router.get('/featured', getFeaturedEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/search', searchEvents);
router.get('/category/:category', validateEventSearch, handleValidationErrors, getEventsByCategory);
router.get('/:id', validateEventId, handleValidationErrors, getEventById);

// Protected routes - require authentication
router.use(protect);

// Organizer routes - only organizers can access
router.post('/', authorize('organizer', 'admin'), validateEvent, handleValidationErrors, createEvent);
router.put('/:id', validateEventId, validateEvent, handleValidationErrors, updateEvent);
router.delete('/:id', validateEventId, handleValidationErrors, deleteEvent);
router.patch('/:id/status', validateEventId, validateEventStatus, handleValidationErrors, updateEventStatus);
router.get('/organizer/my-events', authorize('organizer', 'admin'), validateEventSearch, handleValidationErrors, getMyEvents);

// User routes - authenticated users can access
router.post('/:id/reviews', validateEventId, validateEventReview, handleValidationErrors, addEventReview);

// Admin routes - only admins can access
router.patch('/:id/feature', authorize('admin'), validateEventId, handleValidationErrors, toggleEventFeatured);

module.exports = router; 