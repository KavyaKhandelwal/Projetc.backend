const Event = require('../models/Event');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/responseHandler');

// @desc    Get all events (public listing)
// @route   GET /api/events
// @access  Public
const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      status = 'published',
      pricing,
      dateFrom,
      dateTo,
      location,
      search,
      sortBy = 'dateTime.start',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status: 'published' };
    
    if (category) filter.category = category;
    if (pricing) filter['pricing.type'] = pricing;
    if (dateFrom) filter['dateTime.start'] = { $gte: new Date(dateFrom) };
    if (dateTo) {
      if (filter['dateTime.start']) {
        filter['dateTime.start'].$lte = new Date(dateTo);
      } else {
        filter['dateTime.start'] = { $lte: new Date(dateTo) };
      }
    }
    if (location) {
      filter.$or = [
        { 'venue.address.city': { $regex: location, $options: 'i' } },
        { 'venue.address.state': { $regex: location, $options: 'i' } },
        { 'venue.name': { $regex: location, $options: 'i' } }
      ];
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const events = await Event.find(filter)
      .populate('organizer', 'firstName lastName email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const result = {
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    };

    successResponse(res, result, 'Events retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get featured events
// @route   GET /api/events/featured
// @access  Public
const getFeaturedEvents = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const events = await Event.find({
      status: 'published',
      isFeatured: true,
      'dateTime.start': { $gte: new Date() }
    })
      .populate('organizer', 'firstName lastName')
      .sort({ 'dateTime.start': 1 })
      .limit(parseInt(limit));

    successResponse(res, events, 'Featured events retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get events by category
// @route   GET /api/events/category/:category
// @access  Public
const getEventsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, sortBy = 'dateTime.start', sortOrder = 'asc' } = req.query;

    const filter = {
      status: 'published',
      category,
      'dateTime.start': { $gte: new Date() }
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await Event.find(filter)
      .populate('organizer', 'firstName lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    const result = {
      events,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        limit: parseInt(limit)
      }
    };

    successResponse(res, result, `Events in ${category} category retrieved successfully`);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email phone')
      .populate('reviews.user', 'firstName lastName');

    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    // Increment view count
    event.views += 1;
    await event.save();

    successResponse(res, event, 'Event retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizers only)
const createEvent = async (req, res) => {
  try {
    // Add organizer to event data
    const eventData = {
      ...req.body,
      organizer: req.user._id
    };

    const event = await Event.create(eventData);
    
    // Populate organizer info
    await event.populate('organizer', 'firstName lastName email');

    successResponse(res, event, 'Event created successfully', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Event organizer only)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    // Check if user is the organizer
    if (!event.canEdit(req.user._id)) {
      return errorResponse(res, 'You can only edit your own events', 403);
    }

    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizer', 'firstName lastName email');

    successResponse(res, updatedEvent, 'Event updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Event organizer only)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    // Check if user is the organizer
    if (!event.canEdit(req.user._id)) {
      return errorResponse(res, 'You can only delete your own events', 403);
    }

    await Event.findByIdAndDelete(req.params.id);

    successResponse(res, null, 'Event deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get organizer's events
// @route   GET /api/events/organizer/my-events
// @access  Private (Organizers only)
const getMyEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { organizer: req.user._id };
    if (status) filter.status = status;

    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    const result = {
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        limit: parseInt(limit)
      }
    };

    successResponse(res, result, 'Your events retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Update event status
// @route   PATCH /api/events/:id/status
// @access  Private (Event organizer only)
const updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    // Check if user is the organizer
    if (!event.canEdit(req.user._id)) {
      return errorResponse(res, 'You can only update your own events', 403);
    }

    event.status = status;
    await event.save();

    successResponse(res, event, 'Event status updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Add event review
// @route   POST /api/events/:id/reviews
// @access  Private
const addEventReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    // Check if event is completed
    if (event.timeStatus !== 'past') {
      return errorResponse(res, 'You can only review completed events', 400);
    }

    // Check if user already reviewed this event
    const existingReview = event.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return errorResponse(res, 'You have already reviewed this event', 400);
    }

    // Add review
    event.reviews.push({
      user: req.user._id,
      rating,
      comment
    });

    await event.save();

    // Populate the new review with user info
    await event.populate('reviews.user', 'firstName lastName');

    successResponse(res, event, 'Review added successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Search events
// @route   GET /api/events/search
// @access  Public
const searchEvents = async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q) {
      return errorResponse(res, 'Search query is required', 400);
    }

    const filter = {
      status: 'published',
      $text: { $search: q }
    };

    const events = await Event.find(filter)
      .populate('organizer', 'firstName lastName')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    const result = {
      events,
      searchQuery: q,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        limit: parseInt(limit)
      }
    };

    successResponse(res, result, 'Search results retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
const getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const events = await Event.find({
      status: 'published',
      'dateTime.start': { $gte: new Date() }
    })
      .populate('organizer', 'firstName lastName')
      .sort({ 'dateTime.start': 1 })
      .limit(parseInt(limit));

    successResponse(res, events, 'Upcoming events retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Toggle event featured status (Admin only)
// @route   PATCH /api/events/:id/feature
// @access  Private (Admin only)
const toggleEventFeatured = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    event.isFeatured = !event.isFeatured;
    await event.save();

    successResponse(res, event, `Event ${event.isFeatured ? 'featured' : 'unfeatured'} successfully`);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

module.exports = {
  getAllEvents,
  getFeaturedEvents,
  getEventsByCategory,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  updateEventStatus,
  addEventReview,
  searchEvents,
  getUpcomingEvents,
  toggleEventFeatured
}; 