const Tag = require('../models/Tag');
const Note = require('../models/Note');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Get all tags for authenticated user
 * @route   GET /api/tags
 * @access  Private
 */
const getTags = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    sortBy = 'alphabetical',
    favorites,
    search
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  let tags;
  let total;

  if (search) {
    // Search tags
    tags = await Tag.searchTags(req.user._id, search, limitNum);
    total = tags.length;
  } else {
    // Get tags with options
    const options = {
      sortBy,
      favorites: favorites === 'true'
    };

    tags = await Tag.findByOwner(req.user._id, options)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const query = { owner: req.user._id };
    if (options.favorites) query.isFavorite = true;
    total = await Tag.countDocuments(query);
  }

  // Populate notes count for each tag
  await Tag.populate(tags, {
    path: 'notesCount'
  });

  const pagination = getPaginationMeta(pageNum, limitNum, total);

  res.json({
    success: true,
    data: {
      tags,
      pagination
    }
  });
});

/**
 * @desc    Get single tag
 * @route   GET /api/tags/:id
 * @access  Private
 */
const getTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOne({
    _id: req.params.id,
    owner: req.user._id
  }).populate('notesCount');

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  res.json({
    success: true,
    data: {
      tag
    }
  });
});

/**
 * @desc    Create new tag
 * @route   POST /api/tags
 * @access  Private
 */
const createTag = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    color,
    isPrivate = false
  } = req.body;

  // Check if tag name already exists for this user
  const existingTag = await Tag.findOne({
    name: name.trim(),
    owner: req.user._id
  });

  if (existingTag) {
    throw new AppError('Tag with this name already exists', 400);
  }

  // Create tag
  const tag = await Tag.create({
    name: name.trim(),
    description,
    color,
    isPrivate,
    owner: req.user._id
  });

  logger.info(`Tag created: ${name} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Tag created successfully',
    data: {
      tag
    }
  });
});

/**
 * @desc    Update tag
 * @route   PUT /api/tags/:id
 * @access  Private
 */
const updateTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  const {
    name,
    description,
    color,
    isPrivate,
    isFavorite
  } = req.body;

  // Check if new name conflicts with existing tags
  if (name && name.trim() !== tag.name) {
    const existingTag = await Tag.findOne({
      name: name.trim(),
      owner: req.user._id,
      _id: { $ne: tag._id }
    });

    if (existingTag) {
      throw new AppError('Tag with this name already exists', 400);
    }
  }

  // Update fields
  if (name !== undefined) tag.name = name.trim();
  if (description !== undefined) tag.description = description;
  if (color !== undefined) tag.color = color;
  if (isPrivate !== undefined) tag.isPrivate = isPrivate;
  if (isFavorite !== undefined) tag.isFavorite = isFavorite;

  await tag.save();

  logger.info(`Tag updated: ${tag.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Tag updated successfully',
    data: {
      tag
    }
  });
});

/**
 * @desc    Delete tag
 * @route   DELETE /api/tags/:id
 * @access  Private
 */
const deleteTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  // Get notes count that use this tag
  const notesCount = await Note.countDocuments({
    tags: tag._id,
    author: req.user._id,
    isDeleted: false
  });

  // Remove tag from all notes
  if (notesCount > 0) {
    await Note.updateMany(
      { tags: tag._id, author: req.user._id },
      { $pull: { tags: tag._id } }
    );
  }

  await Tag.findByIdAndDelete(tag._id);

  logger.info(`Tag deleted: ${tag.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: `Tag deleted successfully. Removed from ${notesCount} notes.`
  });
});

/**
 * @desc    Toggle tag favorite status
 * @route   PUT /api/tags/:id/favorite
 * @access  Private
 */
const toggleFavoriteTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  const isFavorite = await tag.toggleFavorite();

  const action = isFavorite ? 'added to' : 'removed from';
  logger.info(`Tag ${action} favorites: ${tag.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: `Tag ${action} favorites successfully`,
    data: {
      tag: {
        ...tag.toObject(),
        isFavorite
      }
    }
  });
});

/**
 * @desc    Get popular tags
 * @route   GET /api/tags/popular
 * @access  Private
 */
const getPopularTags = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const limitNum = parseInt(limit);

  const tags = await Tag.findPopularTags(req.user._id, limitNum);

  // Populate notes count for each tag
  await Tag.populate(tags, {
    path: 'notesCount'
  });

  res.json({
    success: true,
    data: {
      tags
    }
  });
});

/**
 * @desc    Get tag suggestions based on content
 * @route   POST /api/tags/suggestions
 * @access  Private
 */
const getTagSuggestions = asyncHandler(async (req, res) => {
  const { content, limit = 10 } = req.body;

  if (!content) {
    throw new AppError('Content is required for tag suggestions', 400);
  }

  const suggestions = await Tag.getSuggestions(content, req.user._id, parseInt(limit));

  res.json({
    success: true,
    data: {
      suggestions
    }
  });
});

/**
 * @desc    Merge two tags
 * @route   POST /api/tags/:id/merge
 * @access  Private
 */
const mergeTags = asyncHandler(async (req, res) => {
  const { targetTagId } = req.body;
  const sourceTagId = req.params.id;

  if (!targetTagId) {
    throw new AppError('Target tag ID is required', 400);
  }

  if (sourceTagId === targetTagId) {
    throw new AppError('Cannot merge tag with itself', 400);
  }

  try {
    const mergedTag = await Tag.mergeTags(sourceTagId, targetTagId, req.user._id);

    logger.info(`Tags merged: ${sourceTagId} -> ${targetTagId} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Tags merged successfully',
      data: {
        tag: mergedTag
      }
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
});

/**
 * @desc    Bulk create tags from names
 * @route   POST /api/tags/bulk-create
 * @access  Private
 */
const bulkCreateTags = asyncHandler(async (req, res) => {
  const { names } = req.body;

  if (!names || !Array.isArray(names) || names.length === 0) {
    throw new AppError('Tag names array is required', 400);
  }

  if (names.length > 50) {
    throw new AppError('Cannot create more than 50 tags at once', 400);
  }

  const createdTags = [];
  const existingTags = [];
  const errors = [];

  for (const name of names) {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      // Check if tag already exists
      const existingTag = await Tag.findOne({
        name: trimmedName,
        owner: req.user._id
      });

      if (existingTag) {
        existingTags.push(existingTag);
      } else {
        const newTag = await Tag.create({
          name: trimmedName,
          owner: req.user._id
        });
        createdTags.push(newTag);
      }
    } catch (error) {
      errors.push({
        name,
        error: error.message
      });
    }
  }

  logger.info(`Bulk tag creation: ${createdTags.length} created, ${existingTags.length} existing by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: `Bulk tag creation completed. ${createdTags.length} created, ${existingTags.length} already existed.`,
    data: {
      created: createdTags,
      existing: existingTags,
      errors
    }
  });
});

/**
 * @desc    Get tag statistics
 * @route   GET /api/tags/stats
 * @access  Private
 */
const getTagStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get tag counts
  const totalTags = await Tag.countDocuments({ owner: userId });
  const favoriteTags = await Tag.countDocuments({ owner: userId, isFavorite: true });
  const privateTags = await Tag.countDocuments({ owner: userId, isPrivate: true });

  // Get most used tags
  const mostUsedTags = await Tag.find({ owner: userId })
    .sort({ usageCount: -1 })
    .limit(10)
    .select('name usageCount color');

  // Get recently used tags
  const recentlyUsedTags = await Tag.find({ 
    owner: userId,
    lastUsedAt: { $exists: true }
  })
    .sort({ lastUsedAt: -1 })
    .limit(10)
    .select('name lastUsedAt color');

  // Get unused tags
  const unusedTagsCount = await Tag.countDocuments({
    owner: userId,
    usageCount: 0
  });

  res.json({
    success: true,
    data: {
      stats: {
        totalTags,
        favoriteTags,
        privateTags,
        unusedTagsCount
      },
      mostUsedTags,
      recentlyUsedTags
    }
  });
});

/**
 * @desc    Search tags
 * @route   GET /api/tags/search
 * @access  Private
 */
const searchTags = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q) {
    throw new AppError('Search query is required', 400);
  }

  const tags = await Tag.searchTags(req.user._id, q, parseInt(limit));

  // Populate notes count for each tag
  await Tag.populate(tags, {
    path: 'notesCount'
  });

  res.json({
    success: true,
    data: {
      tags,
      query: q
    }
  });
});

module.exports = {
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
};
