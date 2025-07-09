const User = require('../models/User');
const Event = require('../models/Event');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/responseHandler');

// List all users with pagination and search
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(filter);
    successResponse(res, {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        limit: parseInt(limit)
      }
    }, 'Users retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFoundResponse(res, 'User not found');
    successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Update user by ID
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return notFoundResponse(res, 'User not found');
    successResponse(res, user, 'User updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Delete user by ID
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return notFoundResponse(res, 'User not found');
    successResponse(res, user, 'User deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// List all events with pagination and search
const getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) {
      filter.$text = { $search: search };
    }
    const events = await Event.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Event.countDocuments(filter);
    successResponse(res, {
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        limit: parseInt(limit)
      }
    }, 'Events retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Get single event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return notFoundResponse(res, 'Event not found');
    successResponse(res, event, 'Event retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Update event by ID
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return notFoundResponse(res, 'Event not found');
    successResponse(res, event, 'Event updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Delete event by ID
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return notFoundResponse(res, 'Event not found');
    successResponse(res, event, 'Event deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// --- Report management stubs ---
// List all reports (stub)
const getAllReports = async (req, res) => {
  return successResponse(res, [], 'Report management not implemented yet');
};
// Get single report (stub)
const getReportById = async (req, res) => {
  return successResponse(res, {}, 'Report management not implemented yet');
};
// Delete report (stub)
const deleteReport = async (req, res) => {
  return successResponse(res, {}, 'Report management not implemented yet');
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getAllReports,
  getReportById,
  deleteReport
}; 