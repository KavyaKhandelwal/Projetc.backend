const Note = require('../models/Note');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/responseHandler');

// @desc    Get all notes
// @route   GET /api/notes
// @access  Public
const getAllNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, isImportant, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (isImportant !== undefined) filter.isImportant = isImportant === 'true';
    if (search) {
      filter.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const notes = await Note.find(filter)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Note.countDocuments(filter);

    const result = {
      notes,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      totalNotes: total
    };

    successResponse(res, result, 'Notes retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Public
const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return notFoundResponse(res, 'Note not found');
    }

    successResponse(res, note, 'Note retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Public
const createNote = async (req, res) => {
  try {
    const note = await Note.create(req.body);
    successResponse(res, note, 'Note created successfully', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Public
const updateNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!note) {
      return notFoundResponse(res, 'Note not found');
    }

    successResponse(res, note, 'Note updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Public
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return notFoundResponse(res, 'Note not found');
    }

    successResponse(res, null, 'Note deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Toggle important status
// @route   PATCH /api/notes/:id/toggle-important
// @access  Public
const toggleImportant = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return notFoundResponse(res, 'Note not found');
    }

    note.isImportant = !note.isImportant;
    await note.save();

    successResponse(res, note, 'Note importance toggled successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get notes by category
// @route   GET /api/notes/category/:category
// @access  Public
const getNotesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const notes = await Note.find({ category })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Note.countDocuments({ category });

    const result = {
      notes,
      category,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalNotes: total
    };

    successResponse(res, result, `Notes in ${category} category retrieved successfully`);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  toggleImportant,
  getNotesByCategory
}; 