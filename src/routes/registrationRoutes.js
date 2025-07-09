const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { 
  validateRegistration,
  validateCancellation,
  validateRefund,
  validateCheckIn,
  validateRegistrationId,
  validateEventId,
  validateRegistrationSearch,
  validateBulkOperation,
  validatePromotionalCode,
  validateRegistrationUpdate,
  handleValidationErrors
} = require('../validators/registrationValidator');


const {
  registerForEvent,
  getMyRegistrations,
  getRegistrationById,
  cancelRegistration,
  updateRegistration,
  getEventRegistrations,
  checkInAttendee,
  processRefund,
  bulkOperations,
  exportRegistrations
} = require('../controllers/registrationController');



// Public routes (if any)
// Note: Most registration routes require authentication

// Protected routes - User registration management
router.post('/',
  authenticate,
  validateRegistration,
  handleValidationErrors,
  registerForEvent
);

router.get('/my-registrations',
  authenticate,
  validateRegistrationSearch,
  handleValidationErrors,
  getMyRegistrations
);

router.get('/:id',
  authenticate,
  validateRegistrationId,
  handleValidationErrors,
  getRegistrationById
);

router.patch('/:id/cancel',
  authenticate,
  validateRegistrationId,
  validateCancellation,
  handleValidationErrors,
  cancelRegistration
);

router.put('/:id',
  authenticate,
  validateRegistrationId,
  validateRegistrationUpdate,
  handleValidationErrors,
  updateRegistration
);

// Organizer/Admin routes - Event registration management
router.get('/event/:eventId',
  authenticate,
  validateEventId,
  validateRegistrationSearch,
  handleValidationErrors,
  getEventRegistrations
);

router.patch('/:id/check-in',
  authenticate,
  validateRegistrationId,
  validateCheckIn,
  handleValidationErrors,
  checkInAttendee
);

router.patch('/:id/refund',
  authenticate,
  validateRegistrationId,
  validateRefund,
  handleValidationErrors,
  processRefund
);

router.post('/bulk',
  authenticate,
  validateBulkOperation,
  handleValidationErrors,
  bulkOperations
);

router.get('/event/:eventId/export',
  authenticate,
  validateEventId,
  handleValidationErrors,
  exportRegistrations
);

module.exports = router; 