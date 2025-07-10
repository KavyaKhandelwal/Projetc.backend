const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
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
  protect,
  validateRegistration,
  handleValidationErrors,
  registerForEvent
);

router.get('/my-registrations',
  protect,
  validateRegistrationSearch,
  handleValidationErrors,
  getMyRegistrations
);

router.get('/:id',
  protect,
  validateRegistrationId,
  handleValidationErrors,
  getRegistrationById
);

router.patch('/:id/cancel',
  protect,
  validateRegistrationId,
  validateCancellation,
  handleValidationErrors,
  cancelRegistration
);

router.put('/:id',
  protect,
  validateRegistrationId,
  validateRegistrationUpdate,
  handleValidationErrors,
  updateRegistration
);

// Organizer/Admin routes - Event registration management
router.get('/event/:eventId',
  protect,
  validateEventId,
  validateRegistrationSearch,
  handleValidationErrors,
  getEventRegistrations
);

router.patch('/:id/check-in',
  protect,
  validateRegistrationId,
  validateCheckIn,
  handleValidationErrors,
  checkInAttendee
);

router.patch('/:id/refund',
  protect,
  validateRegistrationId,
  validateRefund,
  handleValidationErrors,
  processRefund
);

router.post('/bulk',
  protect,
  validateBulkOperation,
  handleValidationErrors,
  bulkOperations
);

router.get('/event/:eventId/export',
  protect,
  validateEventId,
  handleValidationErrors,
  exportRegistrations
);

module.exports = router; 