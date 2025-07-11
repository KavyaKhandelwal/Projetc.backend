const express = require('express');
const { getSharedNote } = require('../controllers/shareController');
const { optionalAuth } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/shared/:shareId
 * @desc    Get shared note by share ID
 * @access  Public
 */
router.get('/:shareId', optionalAuth, getSharedNote);

module.exports = router;
