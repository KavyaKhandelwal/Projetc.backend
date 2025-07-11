const Category = require('../models/Category');
const Note = require('../models/Note');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Get all categories for authenticated user
 * @route   GET /api/categories
 * @access  Private
 */
const getCategories = asyncHandler(async (req, res) => {
  const { includeArchived = false, parent } = req.query;

  let categories;

  if (parent === 'null' || parent === '') {
    // Get root categories (no parent)
    categories = await Category.findRootCategories(req.user._id);
  } else if (parent) {
    // Get subcategories of specific parent
    categories = await Category.findSubcategories(parent, req.user._id);
  } else {
    // Get all categories
    categories = await Category.findByOwner(req.user._id, includeArchived === 'true');
  }

  // Populate notes count for each category
  await Category.populate(categories, {
    path: 'notesCount'
  });

  res.json({
    success: true,
    data: {
      categories
    }
  });
});

/**
 * @desc    Get single category
 * @route   GET /api/categories/:id
 * @access  Private
 */
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    owner: req.user._id
  })
  .populate('parent', 'name color')
  .populate('subcategories')
  .populate('notesCount');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Get full path
  const fullPath = await category.getFullPath();

  res.json({
    success: true,
    data: {
      category: {
        ...category.toObject(),
        fullPath
      }
    }
  });
});

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private
 */
const createCategory = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    color,
    icon,
    parent,
    sortOrder = 0
  } = req.body;

  // Check if category name already exists for this user
  const existingCategory = await Category.findOne({
    name,
    owner: req.user._id,
    parent: parent || null
  });

  if (existingCategory) {
    throw new AppError('Category with this name already exists', 400);
  }

  // Validate parent category if provided
  if (parent) {
    const parentCategory = await Category.findOne({
      _id: parent,
      owner: req.user._id,
      isArchived: false
    });

    if (!parentCategory) {
      throw new AppError('Parent category not found', 404);
    }
  }

  // Create category
  const category = await Category.create({
    name,
    description,
    color,
    icon,
    parent: parent || undefined,
    owner: req.user._id,
    sortOrder
  });

  // Populate parent if exists
  if (category.parent) {
    await category.populate('parent', 'name color');
  }

  logger.info(`Category created: ${name} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: {
      category
    }
  });
});

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const {
    name,
    description,
    color,
    icon,
    parent,
    sortOrder,
    isArchived
  } = req.body;

  // Check if new name conflicts with existing categories
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name,
      owner: req.user._id,
      parent: parent !== undefined ? (parent || null) : category.parent,
      _id: { $ne: category._id }
    });

    if (existingCategory) {
      throw new AppError('Category with this name already exists', 400);
    }
  }

  // Validate parent category if provided
  if (parent !== undefined && parent) {
    // Check if parent exists
    const parentCategory = await Category.findOne({
      _id: parent,
      owner: req.user._id,
      isArchived: false
    });

    if (!parentCategory) {
      throw new AppError('Parent category not found', 404);
    }

    // Prevent circular reference
    if (parent === category._id.toString()) {
      throw new AppError('Category cannot be its own parent', 400);
    }

    // Check if the new parent is not a descendant of this category
    const descendants = await category.getDescendants();
    const descendantIds = descendants.map(desc => desc._id.toString());
    
    if (descendantIds.includes(parent)) {
      throw new AppError('Cannot move category to its own descendant', 400);
    }
  }

  // Update fields
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (color !== undefined) category.color = color;
  if (icon !== undefined) category.icon = icon;
  if (parent !== undefined) category.parent = parent || undefined;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isArchived !== undefined) category.isArchived = isArchived;

  await category.save();

  // Populate parent if exists
  if (category.parent) {
    await category.populate('parent', 'name color');
  }

  logger.info(`Category updated: ${category.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: {
      category
    }
  });
});

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category has subcategories
  const hasSubcategories = await category.hasSubcategories();
  if (hasSubcategories) {
    throw new AppError('Cannot delete category with subcategories. Please delete or move subcategories first.', 400);
  }

  // Get notes count in this category
  const notesCount = await Note.countDocuments({
    category: category._id,
    author: req.user._id,
    isDeleted: false
  });

  if (notesCount > 0) {
    // Move notes to uncategorized (remove category reference)
    await Note.updateMany(
      { category: category._id, author: req.user._id },
      { $unset: { category: 1 } }
    );
  }

  await Category.findByIdAndDelete(category._id);

  logger.info(`Category deleted: ${category.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: `Category deleted successfully. ${notesCount} notes moved to uncategorized.`
  });
});

/**
 * @desc    Archive/Unarchive category
 * @route   PUT /api/categories/:id/archive
 * @access  Private
 */
const toggleArchiveCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  category.isArchived = !category.isArchived;
  await category.save();

  const action = category.isArchived ? 'archived' : 'unarchived';
  logger.info(`Category ${action}: ${category.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: `Category ${action} successfully`,
    data: {
      category
    }
  });
});

/**
 * @desc    Get category hierarchy (tree structure)
 * @route   GET /api/categories/hierarchy
 * @access  Private
 */
const getCategoryHierarchy = asyncHandler(async (req, res) => {
  // Get all categories for the user
  const categories = await Category.findByOwner(req.user._id, false);

  // Build hierarchy tree
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => {
        if (parentId === null) {
          return !cat.parent;
        }
        return cat.parent && cat.parent.toString() === parentId.toString();
      })
      .map(cat => ({
        ...cat.toObject(),
        children: buildTree(cat._id)
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  };

  const hierarchy = buildTree();

  res.json({
    success: true,
    data: {
      hierarchy
    }
  });
});

/**
 * @desc    Move category to different parent
 * @route   PUT /api/categories/:id/move
 * @access  Private
 */
const moveCategory = asyncHandler(async (req, res) => {
  const { newParent, sortOrder } = req.body;

  const category = await Category.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Validate new parent if provided
  if (newParent) {
    const parentCategory = await Category.findOne({
      _id: newParent,
      owner: req.user._id,
      isArchived: false
    });

    if (!parentCategory) {
      throw new AppError('New parent category not found', 404);
    }

    // Prevent circular reference
    if (newParent === category._id.toString()) {
      throw new AppError('Category cannot be its own parent', 400);
    }

    // Check if the new parent is not a descendant of this category
    const descendants = await category.getDescendants();
    const descendantIds = descendants.map(desc => desc._id.toString());
    
    if (descendantIds.includes(newParent)) {
      throw new AppError('Cannot move category to its own descendant', 400);
    }
  }

  // Update category
  category.parent = newParent || undefined;
  if (sortOrder !== undefined) {
    category.sortOrder = sortOrder;
  }

  await category.save();

  // Populate parent if exists
  if (category.parent) {
    await category.populate('parent', 'name color');
  }

  logger.info(`Category moved: ${category.name} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Category moved successfully',
    data: {
      category
    }
  });
});

/**
 * @desc    Get category statistics
 * @route   GET /api/categories/stats
 * @access  Private
 */
const getCategoryStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get category counts
  const totalCategories = await Category.countDocuments({
    owner: userId,
    isArchived: false
  });

  const archivedCategories = await Category.countDocuments({
    owner: userId,
    isArchived: true
  });

  // Get categories with note counts
  const categoriesWithNotes = await Category.aggregate([
    {
      $match: {
        owner: userId,
        isArchived: false
      }
    },
    {
      $lookup: {
        from: 'notes',
        localField: '_id',
        foreignField: 'category',
        as: 'notes'
      }
    },
    {
      $addFields: {
        notesCount: {
          $size: {
            $filter: {
              input: '$notes',
              cond: { $eq: ['$$this.isDeleted', false] }
            }
          }
        }
      }
    },
    {
      $project: {
        name: 1,
        color: 1,
        notesCount: 1
      }
    },
    {
      $sort: { notesCount: -1 }
    },
    {
      $limit: 10
    }
  ]);

  // Get uncategorized notes count
  const uncategorizedNotes = await Note.countDocuments({
    author: userId,
    category: { $exists: false },
    isDeleted: false
  });

  res.json({
    success: true,
    data: {
      stats: {
        totalCategories,
        archivedCategories,
        uncategorizedNotes
      },
      topCategories: categoriesWithNotes
    }
  });
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleArchiveCategory,
  getCategoryHierarchy,
  moveCategory,
  getCategoryStats
};
