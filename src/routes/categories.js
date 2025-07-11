const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleArchiveCategory,
  getCategoryHierarchy,
  moveCategory,
  getCategoryStats
} = require('../controllers/categoryController');

const {
  authenticate,
  requireOwnership
} = require('../middleware/auth');

const {
  validateCategoryCreation,
  validateCategoryUpdate,
  validateObjectId
} = require('../middleware/validation');

const {
  createLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Middleware to find and attach category to request
const findCategory = async (req, res, next) => {
  try {
    const Category = require('../models/Category');
    const category = await Category.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    req.resource = category;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/categories
 * @desc    Get all categories for authenticated user
 * @access  Private
 */
router.get('/', authenticate, getCategories);

/**
 * @route   GET /api/categories/stats
 * @desc    Get category statistics
 * @access  Private
 */
router.get('/stats', authenticate, getCategoryStats);

/**
 * @route   GET /api/categories/hierarchy
 * @desc    Get category hierarchy (tree structure)
 * @access  Private
 */
router.get('/hierarchy', authenticate, getCategoryHierarchy);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private
 */
router.post('/', authenticate, createLimiter, validateCategoryCreation, createCategory);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category
 * @access  Private
 */
router.get('/:id', 
  authenticate, 
  validateObjectId('id'), 
  findCategory,
  getCategory
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private
 */
router.put('/:id', 
  authenticate, 
  validateObjectId('id'), 
  validateCategoryUpdate,
  findCategory,
  requireOwnership('owner'),
  updateCategory
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private
 */
router.delete('/:id', 
  authenticate, 
  validateObjectId('id'), 
  findCategory,
  requireOwnership('owner'),
  deleteCategory
);

/**
 * @route   PUT /api/categories/:id/archive
 * @desc    Archive/Unarchive category
 * @access  Private
 */
router.put('/:id/archive', 
  authenticate, 
  validateObjectId('id'), 
  findCategory,
  requireOwnership('owner'),
  toggleArchiveCategory
);

/**
 * @route   PUT /api/categories/:id/move
 * @desc    Move category to different parent
 * @access  Private
 */
router.put('/:id/move', 
  authenticate, 
  validateObjectId('id'), 
  findCategory,
  requireOwnership('owner'),
  moveCategory
);

module.exports = router;
