const { body, param, query, validationResult } = require('express-validator');

// Validation for creating/updating events
const validateEvent = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Event title should be between 5 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()&]+$/)
    .withMessage('Event title contains invalid characters'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Event description should be between 20 and 2000 characters'),
  
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Short description cannot exceed 300 characters'),
  
  body('category')
    .isIn(['music', 'sports', 'business', 'technology', 'arts', 'food', 'education', 'health', 'entertainment', 'other'])
    .withMessage('Please select a valid event category'),
  
  body('venue.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Venue name should be between 2 and 100 characters'),
  
  body('venue.address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Please provide a valid street address'),
  
  body('venue.address.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Please provide a valid city name'),
  
  body('venue.address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Please provide a valid state/province'),
  
  body('venue.address.zipCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Please provide a valid zip/postal code'),
  
  body('venue.address.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Please provide a valid country name'),
  
  body('dateTime.start')
    .isISO8601()
    .withMessage('Please provide a valid start date and time')
    .custom((value) => {
      const startDate = new Date(value);
      const now = new Date();
      if (startDate <= now) {
        throw new Error('Event start time must be in the future');
      }
      return true;
    }),
  
  body('dateTime.end')
    .isISO8601()
    .withMessage('Please provide a valid end date and time')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.dateTime.start);
      if (endDate <= startDate) {
        throw new Error('Event end time must be after start time');
      }
      return true;
    }),
  
  body('pricing.type')
    .optional()
    .isIn(['free', 'paid', 'donation'])
    .withMessage('Please select a valid pricing type'),
  
  body('pricing.tickets')
    .optional()
    .isArray()
    .withMessage('Tickets must be an array'),
  
  body('pricing.tickets.*.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ticket name should be between 2 and 50 characters'),
  
  body('pricing.tickets.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a positive number'),
  
  body('pricing.tickets.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ticket quantity must be at least 1'),
  
  body('capacity')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Event capacity must be between 1 and 100,000'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('You can add up to 10 tags'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Each tag should be between 2 and 20 characters'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'invite-only'])
    .withMessage('Please select a valid visibility option'),
  
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid contact email'),
  
  body('contactInfo.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid contact phone number'),
  
  body('socialLinks.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  body('socialLinks.facebook')
    .optional()
    .isURL()
    .withMessage('Please provide a valid Facebook URL'),
  
  body('socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Please provide a valid Twitter URL'),
  
  body('socialLinks.instagram')
    .optional()
    .isURL()
    .withMessage('Please provide a valid Instagram URL'),
  
  body('socialLinks.linkedin')
    .optional()
    .isURL()
    .withMessage('Please provide a valid LinkedIn URL'),
  
  body('highlights')
    .optional()
    .isArray({ max: 5 })
    .withMessage('You can add up to 5 highlights'),
  
  body('highlights.*.title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Highlight title should be between 2 and 50 characters'),
  
  body('highlights.*.description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Highlight description cannot exceed 200 characters'),
  
  body('faq')
    .optional()
    .isArray({ max: 10 })
    .withMessage('You can add up to 10 FAQ items'),
  
  body('faq.*.question')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('FAQ question should be between 5 and 200 characters'),
  
  body('faq.*.answer')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('FAQ answer should be between 10 and 500 characters'),
  
  body('cancellationPolicy')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Cancellation policy cannot exceed 1000 characters'),
  
  body('refundPolicy')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Refund policy cannot exceed 1000 characters'),
  
  body('termsAndConditions')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Terms and conditions cannot exceed 2000 characters')
];

// Validation for event ID parameter
const validateEventId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID format')
];

// Validation for event search/filtering
const validateEventSearch = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('category')
    .optional()
    .isIn(['music', 'sports', 'business', 'technology', 'arts', 'food', 'education', 'health', 'entertainment', 'other'])
    .withMessage('Invalid category filter'),
  
  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Invalid status filter'),
  
  query('pricing')
    .optional()
    .isIn(['free', 'paid', 'donation'])
    .withMessage('Invalid pricing filter'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location search should be between 2 and 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['date', 'title', 'price', 'rating', 'popularity'])
    .withMessage('Invalid sort option'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc')
];

// Validation for event review
const validateEventReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Review comment should be between 10 and 500 characters')
];

// Validation for event status update
const validateEventStatus = [
  body('status')
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Please select a valid event status')
];

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please check your input and try again',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

module.exports = {
  validateEvent,
  validateEventId,
  validateEventSearch,
  validateEventReview,
  validateEventStatus,
  handleValidationErrors
}; 