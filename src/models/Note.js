const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['personal', 'work', 'study', 'other'],
    default: 'personal'
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    default: '#ffffff'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better search performance
noteSchema.index({ title: 'text', content: 'text' });

// Virtual for formatted date
noteSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Ensure virtual fields are serialized
noteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Note', noteSchema); 