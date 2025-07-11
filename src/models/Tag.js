const mongoose = require('mongoose');
const { createSlug } = require('../utils/helpers');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    trim: true,
    maxlength: [50, 'Tag name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  color: {
    type: String,
    default: '#6B7280',
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Usage statistics
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  
  // Settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for notes count
tagSchema.virtual('notesCount', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'tags',
  count: true
});

// Indexes
tagSchema.index({ owner: 1, name: 1 }, { unique: true });
tagSchema.index({ slug: 1 });
tagSchema.index({ owner: 1, usageCount: -1 });
tagSchema.index({ owner: 1, lastUsedAt: -1 });
tagSchema.index({ owner: 1, isFavorite: -1 });

// Pre-save middleware to generate slug
tagSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = createSlug(`${this.name}-${this.owner}`);
  }
  next();
});

// Static method to find user tags
tagSchema.statics.findByOwner = function(ownerId, options = {}) {
  const query = { owner: ownerId };
  
  if (options.favorites) {
    query.isFavorite = true;
  }
  
  if (options.private !== undefined) {
    query.isPrivate = options.private;
  }
  
  let sortOptions = {};
  switch (options.sortBy) {
    case 'usage':
      sortOptions = { usageCount: -1, name: 1 };
      break;
    case 'recent':
      sortOptions = { lastUsedAt: -1, name: 1 };
      break;
    case 'alphabetical':
    default:
      sortOptions = { name: 1 };
      break;
  }
  
  return this.find(query).sort(sortOptions);
};

// Static method to find popular tags
tagSchema.statics.findPopularTags = function(ownerId, limit = 10) {
  return this.find({ owner: ownerId })
    .sort({ usageCount: -1, name: 1 })
    .limit(limit);
};

// Static method to find or create tag
tagSchema.statics.findOrCreate = async function(name, ownerId) {
  let tag = await this.findOne({ name: name.trim(), owner: ownerId });
  
  if (!tag) {
    tag = new this({
      name: name.trim(),
      owner: ownerId
    });
    await tag.save();
  }
  
  return tag;
};

// Static method to search tags
tagSchema.statics.searchTags = function(ownerId, searchTerm, limit = 20) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    owner: ownerId,
    name: { $regex: regex }
  })
  .sort({ usageCount: -1, name: 1 })
  .limit(limit);
};

// Instance method to increment usage
tagSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  await this.save();
};

// Instance method to decrement usage
tagSchema.methods.decrementUsage = async function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
    await this.save();
  }
};

// Instance method to toggle favorite
tagSchema.methods.toggleFavorite = async function() {
  this.isFavorite = !this.isFavorite;
  await this.save();
  return this.isFavorite;
};

// Static method to get tag suggestions based on content
tagSchema.statics.getSuggestions = async function(content, ownerId, limit = 5) {
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  if (words.length === 0) return [];
  
  const suggestions = await this.find({
    owner: ownerId,
    name: { $in: words }
  })
  .sort({ usageCount: -1 })
  .limit(limit);
  
  return suggestions;
};

// Static method to merge tags
tagSchema.statics.mergeTags = async function(sourceTagId, targetTagId, ownerId) {
  const sourceTag = await this.findOne({ _id: sourceTagId, owner: ownerId });
  const targetTag = await this.findOne({ _id: targetTagId, owner: ownerId });
  
  if (!sourceTag || !targetTag) {
    throw new Error('One or both tags not found');
  }
  
  // Update all notes that use the source tag to use the target tag
  const Note = mongoose.model('Note');
  await Note.updateMany(
    { tags: sourceTagId, author: ownerId },
    { $pull: { tags: sourceTagId }, $addToSet: { tags: targetTagId } }
  );
  
  // Update target tag usage count
  targetTag.usageCount += sourceTag.usageCount;
  await targetTag.save();
  
  // Remove source tag
  await sourceTag.remove();
  
  return targetTag;
};

// Pre-remove middleware to clean up references
tagSchema.pre('remove', async function(next) {
  try {
    // Remove tag from all notes
    const Note = mongoose.model('Note');
    await Note.updateMany(
      { tags: this._id },
      { $pull: { tags: this._id } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Tag', tagSchema);
