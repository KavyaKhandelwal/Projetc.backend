const express = require('express');
const {
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
} = require('../controllers/noteController');

const {
  createShareLink,
  updateShareSettings,
  revokeShareLink,
  getSharedNotes,
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
  getCollaboratedNotes
} = require('../controllers/shareController');

const {
  authenticate,
  requireOwnership,
  checkCollaborationPermission
} = require('../middleware/auth');

const {
  validateNoteCreation,
  validateNoteUpdate,
  validateShareCreation,
  validateCollaboratorAdd,
  validatePagination,
  validateSearch,
  validateObjectId
} = require('../middleware/validation');

const {
  createLimiter,
  searchLimiter,
  shareLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Middleware to find and attach note to request
const findNote = async (req, res, next) => {
  try {
    const Note = require('../models/Note');
    const note = await Note.findOne({
      _id: req.params.id,
      isDeleted: false
    });
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    req.resource = note;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notes
 * @desc    Get all notes for authenticated user
 * @access  Private
 */
router.get('/', authenticate, validatePagination, validateSearch, getNotes);

/**
 * @route   GET /api/notes/stats
 * @desc    Get note statistics
 * @access  Private
 */
router.get('/stats', authenticate, getNoteStats);

/**
 * @route   GET /api/notes/deleted
 * @desc    Get deleted notes
 * @access  Private
 */
router.get('/deleted', authenticate, validatePagination, getDeletedNotes);

/**
 * @route   GET /api/notes/shared
 * @desc    Get all shared notes for user
 * @access  Private
 */
router.get('/shared', authenticate, validatePagination, getSharedNotes);

/**
 * @route   GET /api/notes/collaborated
 * @desc    Get notes shared with user (as collaborator)
 * @access  Private
 */
router.get('/collaborated', authenticate, validatePagination, getCollaboratedNotes);

/**
 * @route   POST /api/notes
 * @desc    Create new note
 * @access  Private
 */
router.post('/', authenticate, createLimiter, validateNoteCreation, createNote);

/**
 * @route   GET /api/notes/:id
 * @desc    Get single note
 * @access  Private
 */
router.get('/:id', 
  authenticate, 
  validateObjectId('id'), 
  findNote,
  checkCollaborationPermission('view'),
  getNote
);

/**
 * @route   PUT /api/notes/:id
 * @desc    Update note
 * @access  Private
 */
router.put('/:id', 
  authenticate, 
  validateObjectId('id'), 
  validateNoteUpdate,
  findNote,
  checkCollaborationPermission('edit'),
  updateNote
);

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete note (soft delete)
 * @access  Private
 */
router.delete('/:id', 
  authenticate, 
  validateObjectId('id'), 
  findNote,
  requireOwnership(),
  deleteNote
);

/**
 * @route   PUT /api/notes/:id/restore
 * @desc    Restore deleted note
 * @access  Private
 */
router.put('/:id/restore', 
  authenticate, 
  validateObjectId('id'), 
  restoreNote
);

/**
 * @route   DELETE /api/notes/:id/permanent
 * @desc    Permanently delete note
 * @access  Private
 */
router.delete('/:id/permanent', 
  authenticate, 
  validateObjectId('id'), 
  permanentDeleteNote
);

/**
 * @route   POST /api/notes/:id/duplicate
 * @desc    Duplicate note
 * @access  Private
 */
router.post('/:id/duplicate', 
  authenticate, 
  validateObjectId('id'), 
  createLimiter,
  findNote,
  checkCollaborationPermission('view'),
  duplicateNote
);

// Share routes
/**
 * @route   POST /api/notes/:id/share
 * @desc    Create share link for a note
 * @access  Private
 */
router.post('/:id/share', 
  authenticate, 
  validateObjectId('id'), 
  shareLimiter,
  validateShareCreation,
  findNote,
  requireOwnership(),
  createShareLink
);

/**
 * @route   PUT /api/notes/:id/share
 * @desc    Update share settings
 * @access  Private
 */
router.put('/:id/share', 
  authenticate, 
  validateObjectId('id'), 
  findNote,
  requireOwnership(),
  updateShareSettings
);

/**
 * @route   DELETE /api/notes/:id/share
 * @desc    Revoke share link
 * @access  Private
 */
router.delete('/:id/share', 
  authenticate, 
  validateObjectId('id'), 
  findNote,
  requireOwnership(),
  revokeShareLink
);

// Collaboration routes
/**
 * @route   POST /api/notes/:id/collaborators
 * @desc    Add collaborator to note
 * @access  Private
 */
router.post('/:id/collaborators', 
  authenticate, 
  validateObjectId('id'), 
  validateCollaboratorAdd,
  findNote,
  requireOwnership(),
  addCollaborator
);

/**
 * @route   PUT /api/notes/:id/collaborators/:userId
 * @desc    Update collaborator permission
 * @access  Private
 */
router.put('/:id/collaborators/:userId', 
  authenticate, 
  validateObjectId('id'), 
  validateObjectId('userId'),
  findNote,
  requireOwnership(),
  updateCollaboratorPermission
);

/**
 * @route   DELETE /api/notes/:id/collaborators/:userId
 * @desc    Remove collaborator from note
 * @access  Private
 */
router.delete('/:id/collaborators/:userId', 
  authenticate, 
  validateObjectId('id'), 
  validateObjectId('userId'),
  findNote,
  requireOwnership(),
  removeCollaborator
);

module.exports = router;
