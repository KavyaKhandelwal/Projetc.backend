const mongoose = require('mongoose');
const { extractKeywords, stripHtml, generateShareId } = require('../utils/helpers');

const noteSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Note content is required']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  
  // Content metadata
  contentType: {
    type: String,
    enum: ['text', 'markdown', 'html'],
    default: 'text'
  },
  wordCount: {
    type: Number,
    default: 0
  },
  readingTime: {
    type: Number, // in minutes
    default: 0
  },
  
  // Ownership and relationships
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  
  // Status and visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['private', 'public', 'shared'],
    default: 'private'
  },
  
  // Sharing
  shareSettings: {
    isShared: {
      type: Boolean,
      default: false
    },
    shareId: {
      type: String,
      unique: true,
      sparse: true
    },
    sharePermissions: {
      type: String,
      enum: ['view', 'edit', 'comment'],
      default: 'view'
    },
    shareExpiresAt: {
      type: Date,
      default: null
    },
    allowComments: {
      type: Boolean,
      default: false
    }
  },
  
  // Organization
  isPinned: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    title: String,
    content: String,
    modifiedAt: Date,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Search and indexing
  searchKeywords: [String],
  
  // Collaboration
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Activity tracking
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date,
    default: null
  },
  editCount: {
    type: Number,
    default: 0
  },
  
  // Reminders and scheduling
  reminder: {
    isSet: {
      type: Boolean,
      default: false
    },
    reminderAt: {
      type: Date,
      default: null
    },
    reminderType: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly'],
      default: 'once'
    }
  },
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for plain text content
noteSchema.virtual('plainTextContent').get(function() {
  return stripHtml(this.content);
});

// Virtual for formatted creation date
noteSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for share URL
noteSchema.virtual('shareUrl').get(function() {
  return this.shareSettings.shareId ? `/shared/${this.shareSettings.shareId}` : null;
});

// Indexes for performance
noteSchema.index({ author: 1, createdAt: -1 });
noteSchema.index({ author: 1, status: 1 });
noteSchema.index({ author: 1, category: 1 });
noteSchema.index({ author: 1, tags: 1 });
noteSchema.index({ author: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ author: 1, isFavorite: -1, createdAt: -1 });
noteSchema.index({ author: 1, isDeleted: 1 });
noteSchema.index({ 'shareSettings.shareId': 1 });
noteSchema.index({ searchKeywords: 1 });
noteSchema.index({ title: 'text', content: 'text' }); // Text search index

// Pre-save middleware
noteSchema.pre('save', function(next) {
  // Generate excerpt if not provided
  if (!this.excerpt && this.content) {
    const plainText = stripHtml(this.content);
    this.excerpt = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
  }
  
  // Calculate word count
  if (this.content) {
    const plainText = stripHtml(this.content);
    this.wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Calculate reading time (average 200 words per minute)
    this.readingTime = Math.ceil(this.wordCount / 200);
  }
  
  // Generate search keywords
  if (this.isModified('title') || this.isModified('content')) {
    const titleKeywords = extractKeywords(this.title);
    const contentKeywords = extractKeywords(stripHtml(this.content));
    this.searchKeywords = [...new Set([...titleKeywords, ...contentKeywords])];
  }
  
  // Increment version if content changed
  if (this.isModified('content') && !this.isNew) {
    this.version += 1;
    this.editCount += 1;
  }
  
  next();
});

// Static method to find user notes
noteSchema.statics.findByAuthor = function(authorId, options = {}) {
  const query = { author: authorId, isDeleted: false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  if (options.favorites) {
    query.isFavorite = true;
  }
  
  if (options.pinned) {
    query.isPinned = true;
  }
  
  let sortOptions = {};
  switch (options.sortBy) {
    case 'title':
      sortOptions = { title: 1 };
      break;
    case 'updated':
      sortOptions = { updatedAt: -1 };
      break;
    case 'created':
    default:
      sortOptions = { isPinned: -1, createdAt: -1 };
      break;
  }
  
  return this.find(query)
    .populate('category', 'name color')
    .populate('tags', 'name color')
    .sort(sortOptions);
};

// Static method for full-text search
noteSchema.statics.searchNotes = function(authorId, searchTerm, options = {}) {
  const query = {
    author: authorId,
    isDeleted: false,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { searchKeywords: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  return this.find(query)
    .populate('category', 'name color')
    .populate('tags', 'name color')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

// Static method to find shared note
noteSchema.statics.findByShareId = function(shareId) {
  return this.findOne({
    'shareSettings.shareId': shareId,
    'shareSettings.isShared': true,
    isDeleted: false
  })
  .populate('author', 'firstName lastName')
  .populate('category', 'name color')
  .populate('tags', 'name color');
};

// Instance method to create share link
noteSchema.methods.createShareLink = function(permissions = 'view', expiresIn = null) {
  this.shareSettings.isShared = true;
  this.shareSettings.shareId = generateShareId();
  this.shareSettings.sharePermissions = permissions;
  
  if (expiresIn) {
    this.shareSettings.shareExpiresAt = new Date(Date.now() + expiresIn);
  }
  
  return this.save();
};

// Instance method to revoke share link
noteSchema.methods.revokeShareLink = function() {
  this.shareSettings.isShared = false;
  this.shareSettings.shareId = undefined;
  this.shareSettings.shareExpiresAt = null;
  
  return this.save();
};

// Instance method to add collaborator
noteSchema.methods.addCollaborator = function(userId, permission = 'view') {
  const existingCollaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (existingCollaborator) {
    existingCollaborator.permission = permission;
  } else {
    this.collaborators.push({
      user: userId,
      permission: permission
    });
  }
  
  return this.save();
};

// Instance method to remove collaborator
noteSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Instance method to soft delete
noteSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Instance method to restore
noteSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

// Instance method to create version backup
noteSchema.methods.createVersionBackup = function() {
  if (this.isModified('content')) {
    this.previousVersions.push({
      version: this.version,
      title: this.title,
      content: this.content,
      modifiedAt: new Date(),
      modifiedBy: this.author
    });
    
    // Keep only last 10 versions
    if (this.previousVersions.length > 10) {
      this.previousVersions = this.previousVersions.slice(-10);
    }
  }
};

// Instance method to increment view count
noteSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Note', noteSchema);
