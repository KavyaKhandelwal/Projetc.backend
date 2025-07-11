const Note = require('../models/Note');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Create share link for a note
 * @route   POST /api/notes/:id/share
 * @access  Private
 */
const createShareLink = asyncHandler(async (req, res) => {
  const { permissions = 'view', expiresIn } = req.body;

  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Create share link
  await note.createShareLink(permissions, expiresIn);

  logger.info(`Share link created for note: ${note.title} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Share link created successfully',
    data: {
      shareId: note.shareSettings.shareId,
      shareUrl: note.shareUrl,
      permissions: note.shareSettings.sharePermissions,
      expiresAt: note.shareSettings.shareExpiresAt
    }
  });
});

/**
 * @desc    Get shared note by share ID
 * @route   GET /api/shared/:shareId
 * @access  Public
 */
const getSharedNote = asyncHandler(async (req, res) => {
  const { shareId } = req.params;

  const note = await Note.findByShareId(shareId);

  if (!note) {
    throw new AppError('Shared note not found or link has expired', 404);
  }

  // Check if share link has expired
  if (note.shareSettings.shareExpiresAt && new Date() > note.shareSettings.shareExpiresAt) {
    throw new AppError('Share link has expired', 410);
  }

  // Increment view count
  await note.incrementViewCount();

  // Return note data based on permissions
  const responseData = {
    id: note._id,
    title: note.title,
    content: note.content,
    contentType: note.contentType,
    excerpt: note.excerpt,
    wordCount: note.wordCount,
    readingTime: note.readingTime,
    author: {
      name: note.author.fullName,
      firstName: note.author.firstName,
      lastName: note.author.lastName
    },
    category: note.category,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    sharePermissions: note.shareSettings.sharePermissions,
    allowComments: note.shareSettings.allowComments
  };

  res.json({
    success: true,
    data: {
      note: responseData
    }
  });
});

/**
 * @desc    Update share settings
 * @route   PUT /api/notes/:id/share
 * @access  Private
 */
const updateShareSettings = asyncHandler(async (req, res) => {
  const {
    permissions,
    expiresIn,
    allowComments
  } = req.body;

  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  if (!note.shareSettings.isShared) {
    throw new AppError('Note is not currently shared', 400);
  }

  // Update share settings
  if (permissions !== undefined) {
    note.shareSettings.sharePermissions = permissions;
  }

  if (expiresIn !== undefined) {
    if (expiresIn === null) {
      note.shareSettings.shareExpiresAt = null;
    } else {
      note.shareSettings.shareExpiresAt = new Date(Date.now() + expiresIn);
    }
  }

  if (allowComments !== undefined) {
    note.shareSettings.allowComments = allowComments;
  }

  await note.save();

  logger.info(`Share settings updated for note: ${note.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Share settings updated successfully',
    data: {
      shareSettings: note.shareSettings
    }
  });
});

/**
 * @desc    Revoke share link
 * @route   DELETE /api/notes/:id/share
 * @access  Private
 */
const revokeShareLink = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  if (!note.shareSettings.isShared) {
    throw new AppError('Note is not currently shared', 400);
  }

  // Revoke share link
  await note.revokeShareLink();

  logger.info(`Share link revoked for note: ${note.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Share link revoked successfully'
  });
});

/**
 * @desc    Get all shared notes for user
 * @route   GET /api/notes/shared
 * @access  Private
 */
const getSharedNotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const notes = await Note.find({
    author: req.user._id,
    'shareSettings.isShared': true,
    isDeleted: false
  })
  .populate('category', 'name color')
  .populate('tags', 'name color')
  .sort({ 'shareSettings.shareId': -1 })
  .skip(skip)
  .limit(limitNum)
  .select('title excerpt shareSettings createdAt updatedAt category tags viewCount');

  const total = await Note.countDocuments({
    author: req.user._id,
    'shareSettings.isShared': true,
    isDeleted: false
  });

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalItems: total,
    itemsPerPage: limitNum,
    hasNextPage: pageNum < Math.ceil(total / limitNum),
    hasPrevPage: pageNum > 1
  };

  res.json({
    success: true,
    data: {
      notes,
      pagination
    }
  });
});

/**
 * @desc    Add collaborator to note
 * @route   POST /api/notes/:id/collaborators
 * @access  Private
 */
const addCollaborator = asyncHandler(async (req, res) => {
  const { email, permission = 'view' } = req.body;

  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Find user by email
  const collaboratorUser = await User.findByEmail(email);
  if (!collaboratorUser) {
    throw new AppError('User not found with this email', 404);
  }

  // Check if user is trying to add themselves
  if (collaboratorUser._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot add yourself as a collaborator', 400);
  }

  // Check if user is already a collaborator
  const existingCollaborator = note.collaborators.find(
    collab => collab.user.toString() === collaboratorUser._id.toString()
  );

  if (existingCollaborator) {
    throw new AppError('User is already a collaborator on this note', 400);
  }

  // Add collaborator
  await note.addCollaborator(collaboratorUser._id, permission);

  // Populate the new collaborator data
  await note.populate('collaborators.user', 'firstName lastName email');

  logger.info(`Collaborator added to note: ${note.title} - ${email} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Collaborator added successfully',
    data: {
      collaborators: note.collaborators
    }
  });
});

/**
 * @desc    Update collaborator permission
 * @route   PUT /api/notes/:id/collaborators/:userId
 * @access  Private
 */
const updateCollaboratorPermission = asyncHandler(async (req, res) => {
  const { permission } = req.body;
  const { userId } = req.params;

  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Find collaborator
  const collaborator = note.collaborators.find(
    collab => collab.user.toString() === userId
  );

  if (!collaborator) {
    throw new AppError('Collaborator not found', 404);
  }

  // Update permission
  collaborator.permission = permission;
  await note.save();

  // Populate collaborator data
  await note.populate('collaborators.user', 'firstName lastName email');

  logger.info(`Collaborator permission updated for note: ${note.title} - ${userId} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Collaborator permission updated successfully',
    data: {
      collaborators: note.collaborators
    }
  });
});

/**
 * @desc    Remove collaborator from note
 * @route   DELETE /api/notes/:id/collaborators/:userId
 * @access  Private
 */
const removeCollaborator = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const note = await Note.findOne({
    _id: req.params.id,
    author: req.user._id,
    isDeleted: false
  });

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Check if collaborator exists
  const collaboratorExists = note.collaborators.some(
    collab => collab.user.toString() === userId
  );

  if (!collaboratorExists) {
    throw new AppError('Collaborator not found', 404);
  }

  // Remove collaborator
  await note.removeCollaborator(userId);

  // Populate remaining collaborators
  await note.populate('collaborators.user', 'firstName lastName email');

  logger.info(`Collaborator removed from note: ${note.title} - ${userId} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Collaborator removed successfully',
    data: {
      collaborators: note.collaborators
    }
  });
});

/**
 * @desc    Get notes shared with user (as collaborator)
 * @route   GET /api/notes/collaborated
 * @access  Private
 */
const getCollaboratedNotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const notes = await Note.find({
    'collaborators.user': req.user._id,
    isDeleted: false
  })
  .populate('author', 'firstName lastName email')
  .populate('category', 'name color')
  .populate('tags', 'name color')
  .populate('collaborators.user', 'firstName lastName email')
  .sort({ updatedAt: -1 })
  .skip(skip)
  .limit(limitNum);

  const total = await Note.countDocuments({
    'collaborators.user': req.user._id,
    isDeleted: false
  });

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalItems: total,
    itemsPerPage: limitNum,
    hasNextPage: pageNum < Math.ceil(total / limitNum),
    hasPrevPage: pageNum > 1
  };

  // Add user's permission for each note
  const notesWithPermissions = notes.map(note => {
    const userCollaboration = note.collaborators.find(
      collab => collab.user._id.toString() === req.user._id.toString()
    );
    
    return {
      ...note.toObject(),
      userPermission: userCollaboration ? userCollaboration.permission : null
    };
  });

  res.json({
    success: true,
    data: {
      notes: notesWithPermissions,
      pagination
    }
  });
});

module.exports = {
  createShareLink,
  getSharedNote,
  updateShareSettings,
  revokeShareLink,
  getSharedNotes,
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
  getCollaboratedNotes
};
