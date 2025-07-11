const mongoose = require('mongoose');
const { generateRandomColor } = require('../utils/helpers');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  color: {
    type: String,
    default: generateRandomColor,
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    default: 'folder'
  },
  
  // Hierarchical structure
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Settings
  isDefault: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for notes count
categorySchema.virtual('notesCount', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for full path (for nested categories)
categorySchema.virtual('fullPath').get(function() {
  // This would need to be populated with parent data
  return this.name;
});

// Indexes
categorySchema.index({ owner: 1, name: 1 }, { unique: true });
categorySchema.index({ owner: 1, parent: 1 });
categorySchema.index({ owner: 1, isArchived: 1 });
categorySchema.index({ owner: 1, sortOrder: 1 });

// Pre-save middleware
categorySchema.pre('save', function(next) {
  // Ensure color is set
  if (!this.color) {
    this.color = generateRandomColor();
  }
  next();
});

// Static method to find user categories
categorySchema.statics.findByOwner = function(ownerId, includeArchived = false) {
  const query = { owner: ownerId };
  if (!includeArchived) {
    query.isArchived = false;
  }
  return this.find(query).sort({ sortOrder: 1, name: 1 });
};

// Static method to find root categories (no parent)
categorySchema.statics.findRootCategories = function(ownerId) {
  return this.find({
    owner: ownerId,
    parent: null,
    isArchived: false
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find subcategories
categorySchema.statics.findSubcategories = function(parentId, ownerId) {
  return this.find({
    parent: parentId,
    owner: ownerId,
    isArchived: false
  }).sort({ sortOrder: 1, name: 1 });
};

// Instance method to get full category path
categorySchema.methods.getFullPath = async function() {
  let path = [this.name];
  let current = this;
  
  while (current.parent) {
    current = await this.constructor.findById(current.parent);
    if (current) {
      path.unshift(current.name);
    } else {
      break;
    }
  }
  
  return path.join(' > ');
};

// Instance method to check if category has subcategories
categorySchema.methods.hasSubcategories = async function() {
  const count = await this.constructor.countDocuments({
    parent: this._id,
    isArchived: false
  });
  return count > 0;
};

// Instance method to get all descendant categories
categorySchema.methods.getDescendants = async function() {
  const descendants = [];
  
  const findChildren = async (parentId) => {
    const children = await this.constructor.find({
      parent: parentId,
      isArchived: false
    });
    
    for (const child of children) {
      descendants.push(child);
      await findChildren(child._id);
    }
  };
  
  await findChildren(this._id);
  return descendants;
};

// Pre-remove middleware to handle cascading deletes
categorySchema.pre('remove', async function(next) {
  try {
    // Move notes to default category or uncategorized
    const Note = mongoose.model('Note');
    await Note.updateMany(
      { category: this._id },
      { $unset: { category: 1 } }
    );
    
    // Move subcategories to parent or root level
    await this.constructor.updateMany(
      { parent: this._id },
      { parent: this.parent }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Category', categorySchema);
