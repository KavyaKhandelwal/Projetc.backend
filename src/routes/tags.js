const express = require('express');
const {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  toggleFavoriteTag,
  getPopularTags,
  getTagSuggestions,
  mergeTags,
  bulkCreateTags,
  getTagStats,
  searchTags
} = require('../controllers/tagController');

const {
  authenticate,
  requireOwnership
} = require('../middleware/auth');

const {
  validateTagCreation,
  validateTagUpdate,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');

const {
  createLimiter,
  bulkLimiter,
  searchLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Middleware to find and attach tag to request
const findTag = async (req, res, next) => {
  try {
    const Tag = require('../models/Tag');
    const tag = await Tag.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    
    req.resource = tag;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tags
 * @desc    Get all tags for authenticated user
 * @access  Private
 */
router.get('/', authenticate, validatePagination, getTags);

/**
 * @route   GET /api/tags/stats
 * @desc    Get tag statistics
 * @access  Private
 */
router.get('/stats', authenticate, getTagStats);

/**
 * @route   GET /api/tags/popular
 * @desc    Get popular tags
 * @access  Private
 */
router.get('/popular', authenticate, getPopularTags);

/**
 * @route   GET /api/tags/search
 * @desc    Search tags
 * @access  Private
 */
router.get('/search', authenticate, searchLimiter, searchTags);

/**
 * @route   POST /api/tags
 * @desc    Create new tag
 * @access  Private
 */
router.post('/', authenticate, createLimiter, validateTagCreation, createTag);

/**
 * @route   POST /api/tags/bulk-create
 * @desc    Bulk create tags from names
 * @access  Private
 */
router.post('/bulk-create', authenticate, bulkLimiter, bulkCreateTags);

/**
 * @route   POST /api/tags/suggestions
 * @desc    Get tag suggestions based on content
 * @access  Private
 */
router.post('/suggestions', authenticate, getTagSuggestions);

/**
 * @route   GET /api/tags/:id
 * @desc    Get single tag
 * @access  Private
 */
router.get('/:id', 
  authenticate, 
  validateObjectId('id'), 
  findTag,
  getTag
);

/**
 * @route   PUT /api/tags/:id
 * @desc    Update tag
 * @access  Private
 */
router.put('/:id', 
  authenticate, 
  validateObjectId('id'), 
  validateTagUpdate,
  findTag,
  requireOwnership('owner'),
  updateTag
);

/**
 * @route   DELETE /api/tags/:id
 * @desc    Delete tag
 * @access  Private
 */
router.delete('/:id', 
  authenticate, 
  validateObjectId('id'), 
  findTag,
  requireOwnership('owner'),
  deleteTag
);

/**
 * @route   PUT /api/tags/:id/favorite
 * @desc    Toggle tag favorite status
 * @access  Private
 */
router.put('/:id/favorite', 
  authenticate, 
  validateObjectId('id'), 
  findTag,
  requireOwnership('owner'),
  toggleFavoriteTag
);

/**
 * @route   POST /api/tags/:id/merge
 * @desc    Merge two tags
 * @access  Private
 */
router.post('/:id/merge', 
  authenticate, 
  validateObjectId('id'), 
  findTag,
  requireOwnership('owner'),
  mergeTags
);

module.exports = router;
