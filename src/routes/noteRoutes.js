const express = require('express');
const router = express.Router();
const {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  toggleImportant,
  getNotesByCategory
} = require('../controllers/noteController');
const { validateNote, handleValidationErrors } = require('../validators/noteValidator');

// GET /api/notes - Get all notes with filtering and pagination
router.get('/', getAllNotes);

// GET /api/notes/category/:category - Get notes by category
router.get('/category/:category', getNotesByCategory);

// GET /api/notes/:id - Get single note
router.get('/:id', getNoteById);

// POST /api/notes - Create new note
router.post('/', validateNote, handleValidationErrors, createNote);

// PUT /api/notes/:id - Update note
router.put('/:id', validateNote, handleValidationErrors, updateNote);

// PATCH /api/notes/:id/toggle-important - Toggle important status
router.patch('/:id/toggle-important', toggleImportant);

// DELETE /api/notes/:id - Delete note
router.delete('/:id', deleteNote);

module.exports = router; 