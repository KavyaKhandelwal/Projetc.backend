const Note = require('../models/Note');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Get all notes for authenticated user
 * @route   GET /api/notes
 * @access  Private
 */
const getNotes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    tags,
    favorites,
    pinned,
    sortBy = 'created',
    search
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter options
  const filterOptions = {
    status,
    category,
    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
    favorites: favorites === 'true',
    pinned: pinned === 'true',
    sortBy
  };

  let notes;
  let total;

  if (search) {
    // Use search method
    notes = await Note.searchNotes(req.user._id, search, filterOptions)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for search
    const searchResults = await Note.searchNotes(req.user._id, search, filterOptions);
    total = searchResults.length;
  } else {
    // Use regular find method
    notes = await Note.findByAuthor(req.user._id, filterOptions)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count
    const query = { author: req.user._id, isDeleted: false };
    if (filterOptions.status) query.status = filterOptions.status;
    if (filterOptions.category) query.category = filterOptions.category;
    if (filterOptions.tags && filterOptions.tags.length > 0) {
      query.tags = { $in: filterOptions.tags };
    }
    if (filterOptions.favorites) query.isFavorite = true;
    if (filterOptions.pinned) query.isPinned = true;
    
    total = await Note.countDocuments(query);
  }

  const pagination = getPaginationMeta(pageNum, limitNum, total);

  res.json({
    success: true,
    data: {
      notes,
      pagination
    }
  });
});

/**
 * @desc    Get single note
 * @route   GET /api/notes/:id
 * @access  Private
 */
const getNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  })
  .populate('category', 'name color icon')
  .populate('tags', 'name color')
  .populate('collaborators.user', 'firstName lastName email');

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Increment view count
  await note.incrementViewCount();

  res.json({
    success: true,
    data: {
      note
    }
  });
});

/**
 * @desc    Create new note
 * @route   POST /api/notes
 * @access  Private
 */
const createNote = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    contentType = 'text',
    category,
    tags = [],
    status = 'draft',
    visibility = 'private',
    priority = 'medium'
  } = req.body;

  // Validate category if provided
  if (category) {
    const categoryExists = await Category.findOne({
      _id: category,
      owner: req.user._id,
      isArchived: false
    });
    if (!categoryExists) {
      throw new AppError('Category not found', 404);
    }
  }

  // Validate tags if provided
  if (tags.length > 0) {
    const validTags = await Tag.find({
      _id: { $in: tags },
      owner: req.user._id
    });
    if (validTags.length !== tags.length) {
      throw new AppError('One or more tags not found', 404);
    }
  }

  // Create note
  const note = await Note.create({
    title,
    content,
    contentType,
    category: category || undefined,
    tags,
    status,
    visibility,
    priority,
    author: req.user._id
  });

  // Update tag usage counts
  if (tags.length > 0) {
    await Promise.all(
      tags.map(tagId => 
        Tag.findByIdAndUpdate(tagId, {
          $inc: { usageCount: 1 },
          lastUsedAt: new Date()
        })
      )
    );
  }

  // Populate the created note
  await note.populate([
    { path: 'category', select: 'name color icon' },
    { path: 'tags', select: 'name color' }
  ]);

  logger.info(`Note created: ${note.title} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Note created successfully',
    data: {
      note
    }
  });
});

/**
 * @desc    Update note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  const {
    title,
    content,
    contentType,
    category,
    tags,
    status,
    visibility,
    priority,
    isPinned,
    isFavorite
  } = req.body;

  // Create version backup before updating
  if (content && content !== note.content) {
    note.createVersionBackup();
  }

  // Validate category if provided
  if (category !== undefined) {
    if (category) {
      const categoryExists = await Category.findOne({
        _id: category,
        owner: req.user._id,
        isArchived: false
      });
      if (!categoryExists) {
        throw new AppError('Category not found', 404);
      }
    }
    note.category = category || undefined;
  }

  // Handle tags update
  if (tags !== undefined) {
    const oldTags = note.tags || [];
    const newTags = tags || [];

    // Validate new tags
    if (newTags.length > 0) {
      const validTags = await Tag.find({
        _id: { $in: newTags },
        owner: req.user._id
      });
      if (validTags.length !== newTags.length) {
        throw new AppError('One or more tags not found', 404);
      }
    }

    // Update tag usage counts
    const tagsToDecrement = oldTags.filter(tag => !newTags.includes(tag.toString()));
    const tagsToIncrement = newTags.filter(tag => !oldTags.some(oldTag => oldTag.toString() === tag));

    await Promise.all([
      ...tagsToDecrement.map(tagId => 
        Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } })
      ),
      ...tagsToIncrement.map(tagId => 
        Tag.findByIdAndUpdate(tagId, {
          $inc: { usageCount: 1 },
          lastUsedAt: new Date()
        })
      )
    ]);

    note.tags = newTags;
  }

  // Update other fields
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (contentType !== undefined) note.contentType = contentType;
  if (status !== undefined) note.status = status;
  if (visibility !== undefined) note.visibility = visibility;
  if (priority !== undefined) note.priority = priority;
  if (isPinned !== undefined) note.isPinned = isPinned;
  if (isFavorite !== undefined) note.isFavorite = isFavorite;

  await note.save();

  // Populate the updated note
  await note.populate([
    { path: 'category', select: 'name color icon' },
    { path: 'tags', select: 'name color' }
  ]);

  logger.info(`Note updated: ${note.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Note updated successfully',
    data: {
      note
    }
  });
});

/**
 * @desc    Delete note (soft delete)
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Soft delete
  await note.softDelete();

  // Decrement tag usage counts
  if (note.tags && note.tags.length > 0) {
    await Promise.all(
      note.tags.map(tagId => 
        Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } })
      )
    );
  }

  logger.info(`Note deleted: ${note.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Note deleted successfully'
  });
});

/**
 * @desc    Restore deleted note
 * @route   PUT /api/notes/:id/restore
 * @access  Private
 */
const restoreNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: true
  });

  if (!note) {
    throw new AppError('Deleted note not found', 404);
  }

  // Restore note
  await note.restore();

  // Increment tag usage counts
  if (note.tags && note.tags.length > 0) {
    await Promise.all(
      note.tags.map(tagId => 
        Tag.findByIdAndUpdate(tagId, {
          $inc: { usageCount: 1 },
          lastUsedAt: new Date()
        })
      )
    );
  }

  logger.info(`Note restored: ${note.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Note restored successfully',
    data: {
      note
    }
  });
});

/**
 * @desc    Get deleted notes
 * @route   GET /api/notes/deleted
 * @access  Private
 */
const getDeletedNotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const notes = await Note.find({
    author: req.user._id,
    isDeleted: true
  })
  .populate('category', 'name color')
  .populate('tags', 'name color')
  .sort({ deletedAt: -1 })
  .skip(skip)
  .limit(limitNum);

  const total = await Note.countDocuments({
    author: req.user._id,
    isDeleted: true
  });

  const pagination = getPaginationMeta(pageNum, limitNum, total);

  res.json({
    success: true,
    data: {
      notes,
      pagination
    }
  });
});

/**
 * @desc    Permanently delete note
 * @route   DELETE /api/notes/:id/permanent
 * @access  Private
 */
const permanentDeleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: true
  });

  if (!note) {
    throw new AppError('Deleted note not found', 404);
  }

  await Note.findByIdAndDelete(note._id);

  logger.info(`Note permanently deleted: ${note.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Note permanently deleted'
  });
});

/**
 * @desc    Duplicate note
 * @route   POST /api/notes/:id/duplicate
 * @access  Private
 */
const duplicateNote = asyncHandler(async (req, res) => {
  const originalNote = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!originalNote) {
    throw new AppError('Note not found', 404);
  }

  // Create duplicate
  const duplicateData = {
    title: `${originalNote.title} (Copy)`,
    content: originalNote.content,
    contentType: originalNote.contentType,
    category: originalNote.category,
    tags: originalNote.tags,
    status: 'draft', // Always create as draft
    visibility: originalNote.visibility,
    priority: originalNote.priority,
    author: req.user._id
  };

  const duplicatedNote = await Note.create(duplicateData);

  // Update tag usage counts
  if (duplicatedNote.tags && duplicatedNote.tags.length > 0) {
    await Promise.all(
      duplicatedNote.tags.map(tagId => 
        Tag.findByIdAndUpdate(tagId, {
          $inc: { usageCount: 1 },
          lastUsedAt: new Date()
        })
      )
    );
  }

  // Populate the duplicated note
  await duplicatedNote.populate([
    { path: 'category', select: 'name color icon' },
    { path: 'tags', select: 'name color' }
  ]);

  logger.info(`Note duplicated: ${originalNote.title} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Note duplicated successfully',
    data: {
      note: duplicatedNote
    }
  });
});

/**
 * @desc    Get note statistics
 * @route   GET /api/notes/stats
 * @access  Private
 */
const getNoteStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await Note.aggregate([
    {
      $match: {
        author: userId,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        totalWords: { $sum: '$wordCount' },
        totalViews: { $sum: '$viewCount' },
        draftNotes: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        publishedNotes: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
        },
        archivedNotes: {
          $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
        },
        pinnedNotes: {
          $sum: { $cond: ['$isPinned', 1, 0] }
        },
        favoriteNotes: {
          $sum: { $cond: ['$isFavorite', 1, 0] }
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalNotes: 0,
    totalWords: 0,
    totalViews: 0,
    draftNotes: 0,
    publishedNotes: 0,
    archivedNotes: 0,
    pinnedNotes: 0,
    favoriteNotes: 0
  };

  // Get recent activity
  const recentNotes = await Note.find({
    author: userId,
    isDeleted: false
  })
  .sort({ updatedAt: -1 })
  .limit(5)
  .select('title updatedAt status');

  res.json({
    success: true,
    data: {
      stats: result,
      recentActivity: recentNotes
    }
  });
});

module.exports = {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  getDeletedNotes,
  permanentDeleteNote,
  duplicateNote,
  getNoteStats
};
