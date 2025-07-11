const { body, param, query, validationResult } = require('express-validator');
const { isValidEmail } = require('../utils/helpers');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * User validation rules
 */
const validateUserRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

const validatePasswordReset = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  handleValidationErrors
];

const validatePasswordUpdate = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  
  handleValidationErrors
];

/**
 * Note validation rules
 */
const validateNoteCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Note title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('content')
    .notEmpty()
    .withMessage('Note content is required'),
  
  body('contentType')
    .optional()
    .isIn(['text', 'markdown', 'html'])
    .withMessage('Content type must be text, markdown, or html'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid tag ID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('visibility')
    .optional()
    .isIn(['private', 'public', 'shared'])
    .withMessage('Visibility must be private, public, or shared'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  
  handleValidationErrors
];

const validateNoteUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Content cannot be empty'),
  
  body('contentType')
    .optional()
    .isIn(['text', 'markdown', 'html'])
    .withMessage('Content type must be text, markdown, or html'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid tag ID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('visibility')
    .optional()
    .isIn(['private', 'public', 'shared'])
    .withMessage('Visibility must be private, public, or shared'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  
  handleValidationErrors
];

/**
 * Category validation rules
 */
const validateCategoryCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon name cannot exceed 50 characters'),
  
  handleValidationErrors
];

const validateCategoryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon name cannot exceed 50 characters'),
  
  handleValidationErrors
];

/**
 * Tag validation rules
 */
const validateTagCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tag name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  
  handleValidationErrors
];

const validateTagUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  
  handleValidationErrors
];

/**
 * Share validation rules
 */
const validateShareCreation = [
  body('permissions')
    .optional()
    .isIn(['view', 'edit', 'comment'])
    .withMessage('Permissions must be view, edit, or comment'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Expiration time must be a positive integer (milliseconds)'),
  
  handleValidationErrors
];

/**
 * Collaboration validation rules
 */
const validateCollaboratorAdd = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('permission')
    .optional()
    .isIn(['view', 'edit', 'admin'])
    .withMessage('Permission must be view, edit, or admin'),
  
  handleValidationErrors
];

/**
 * Query parameter validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(tag => typeof tag === 'string');
      }
      return false;
    })
    .withMessage('Tags must be a string or array of strings'),
  
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateUserUpdate,
  validateNoteCreation,
  validateNoteUpdate,
  validateCategoryCreation,
  validateCategoryUpdate,
  validateTagCreation,
  validateTagUpdate,
  validateShareCreation,
  validateCollaboratorAdd,
  validatePagination,
  validateSearch,
  validateObjectId
};
