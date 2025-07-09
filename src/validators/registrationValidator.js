const { body, param, query, validationResult } = require('express-validator');

// Validation for event registration
const validateRegistration = [
  body('eventId')
    .isMongoId()
    .withMessage('Please provide a valid event ID'),
  
  body('ticketType')
    .isObject()
    .withMessage('Ticket type information is required'),
  
  body('ticketType.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ticket type name should be between 2 and 50 characters'),
  
  body('ticketType.price')
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a valid positive number'),
  
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10 tickets'),
  
  body('paymentMethod')
    .optional()
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'free'])
    .withMessage('Please select a valid payment method'),
  
  body('attendeeInfo')
    .isArray({ min: 1 })
    .withMessage('At least one attendee is required'),
  
  body('attendeeInfo.*.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name should be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('attendeeInfo.*.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name should be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('attendeeInfo.*.email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('attendeeInfo.*.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('attendeeInfo.*.dietaryRestrictions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Dietary restrictions cannot exceed 200 characters'),
  
  body('attendeeInfo.*.specialRequirements')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Special requirements cannot exceed 300 characters'),
  
  body('attendeeInfo.*.emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Emergency contact name should be between 2 and 100 characters'),
  
  body('attendeeInfo.*.emergencyContact.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid emergency contact phone number'),
  
  body('attendeeInfo.*.emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relationship cannot exceed 50 characters'),
  
  body('registrationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Registration notes cannot exceed 500 characters'),
  
  body('promotionalCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Promotional code should be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Promotional code can only contain uppercase letters and numbers')
];

// Validation for registration cancellation
const validateCancellation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Cancellation reason should be between 5 and 200 characters')
];

// Validation for registration refund
const validateRefund = [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a valid positive number'),
  
  body('reason')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Refund reason should be between 5 and 200 characters')
];

// Validation for check-in
const validateCheckIn = [
  body('checkInStatus')
    .isIn(['checked_in', 'no_show'])
    .withMessage('Please select a valid check-in status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Check-in notes cannot exceed 300 characters')
];

// Validation for registration ID parameter
const validateRegistrationId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid registration ID format')
];

// Validation for event ID parameter
const validateEventId = [
  param('eventId')
    .isMongoId()
    .withMessage('Invalid event ID format')
];

// Validation for registration search/filtering
const validateRegistrationSearch = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'refunded', 'expired'])
    .withMessage('Invalid status filter'),
  
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status filter'),
  
  query('checkInStatus')
    .optional()
    .isIn(['not_checked_in', 'checked_in', 'no_show'])
    .withMessage('Invalid check-in status filter'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'status', 'paymentStatus', 'checkInStatus', 'totalAmount'])
    .withMessage('Invalid sort option'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc')
];

// Validation for bulk operations
const validateBulkOperation = [
  body('registrationIds')
    .isArray({ min: 1 })
    .withMessage('At least one registration ID is required'),
  
  body('registrationIds.*')
    .isMongoId()
    .withMessage('Invalid registration ID format'),
  
  body('action')
    .isIn(['confirm', 'cancel', 'check_in', 'mark_no_show'])
    .withMessage('Please select a valid action'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation for promotional code
const validatePromotionalCode = [
  body('code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Promotional code should be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Promotional code can only contain uppercase letters and numbers')
];

// Validation for registration update
const validateRegistrationUpdate = [
  body('attendeeInfo')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one attendee is required'),
  
  body('attendeeInfo.*.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name should be between 2 and 50 characters'),
  
  body('attendeeInfo.*.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name should be between 2 and 50 characters'),
  
  body('attendeeInfo.*.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  
  body('attendeeInfo.*.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('registrationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Registration notes cannot exceed 500 characters')
];

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please check your registration details and try again',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

module.exports = {
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
}; 