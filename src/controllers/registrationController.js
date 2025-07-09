const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/responseHandler');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private
const registerForEvent = async (req, res) => {
  try {
    const {
      eventId,
      ticketType,
      quantity,
      paymentMethod = 'free',
      attendeeInfo,
      registrationNotes,
      promotionalCode
    } = req.body;

    // Check if user can register for this event
    await EventRegistration.canUserRegister(req.user._id, eventId, quantity);

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    // Validate ticket type exists in event
    const validTicketType = event.pricing.tickets.find(
      ticket => ticket.name === ticketType.name && ticket.price === ticketType.price
    );

    if (!validTicketType) {
      return errorResponse(res, 'Invalid ticket type selected', 400);
    }

    // Check ticket availability
    if (validTicketType.sold + quantity > validTicketType.quantity) {
      return errorResponse(res, 'Not enough tickets available', 400);
    }

    // Calculate total amount
    let totalAmount = ticketType.price * quantity;
    let discountAmount = 0;

    // Apply promotional code if provided
    if (promotionalCode) {
      // TODO: Implement promotional code validation
      console.log('Promotional code applied:', promotionalCode);
    }

    // Create registration data
    const registrationData = {
      event: eventId,
      user: req.user._id,
      ticketType: {
        name: ticketType.name,
        price: ticketType.price - (discountAmount / quantity),
        originalPrice: ticketType.price
      },
      quantity,
      paymentMethod,
      paymentDetails: {
        amount: totalAmount - discountAmount,
        currency: event.pricing.currency || 'USD'
      },
      attendeeInfo,
      registrationNotes,
      promotionalCode: promotionalCode ? {
        code: promotionalCode,
        discount: discountAmount,
        appliedAt: new Date()
      } : undefined
    };

    // Create registration
    const registration = await EventRegistration.create(registrationData);

    // Update event ticket sales
    validTicketType.sold += quantity;
    await event.save();

    // Populate references
    await registration.populate([
      { path: 'event', select: 'title dateTime venue' },
      { path: 'user', select: 'firstName lastName email' }
    ]);

    successResponse(res, registration, 'Registration successful! Check your email for confirmation.', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get user's registrations
// @route   GET /api/registrations/my-registrations
// @access  Private
const getMyRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const registrations = await EventRegistration.find(filter)
      .populate('event', 'title dateTime venue images category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EventRegistration.countDocuments(filter);

    const result = {
      registrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRegistrations: total,
        limit: parseInt(limit)
      }
    };

    successResponse(res, result, 'Your registrations retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get single registration
// @route   GET /api/registrations/:id
// @access  Private
const getRegistrationById = async (req, res) => {
  try {
    const registration = await EventRegistration.findById(req.params.id)
      .populate('event', 'title dateTime venue images category organizer')
      .populate('user', 'firstName lastName email')
      .populate('checkInBy', 'firstName lastName');

    if (!registration) {
      return notFoundResponse(res, 'Registration not found');
    }

    // Check if user can access this registration
    if (registration.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'organizer') {
      return errorResponse(res, 'Access denied', 403);
    }

    successResponse(res, registration, 'Registration retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Cancel registration
// @route   PATCH /api/registrations/:id/cancel
// @access  Private
const cancelRegistration = async (req, res) => {
  try {
    const { reason } = req.body;
    const registration = await EventRegistration.findById(req.params.id);

    if (!registration) {
      return notFoundResponse(res, 'Registration not found');
    }

    // Check if user can cancel this registration
    if (registration.user.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'organizer') {
      return errorResponse(res, 'You can only cancel your own registrations', 403);
    }

    // Check if registration can be cancelled
    if (!registration.canBeCancelled) {
      return errorResponse(res, 'This registration cannot be cancelled', 400);
    }

    // Update registration
    registration.status = 'cancelled';
    registration.cancellationReason = reason;
    await registration.save();

    // Update event ticket sales
    const event = await Event.findById(registration.event);
    if (event) {
      const ticketType = event.pricing.tickets.find(
        ticket => ticket.name === registration.ticketType.name
      );
      if (ticketType) {
        ticketType.sold = Math.max(0, ticketType.sold - registration.quantity);
        await event.save();
      }
    }

    successResponse(res, registration, 'Registration cancelled successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Update registration
// @route   PUT /api/registrations/:id
// @access  Private
const updateRegistration = async (req, res) => {
  try {
    const registration = await EventRegistration.findById(req.params.id);

    if (!registration) {
      return notFoundResponse(res, 'Registration not found');
    }

    // Check if user can update this registration
    if (registration.user.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'organizer') {
      return errorResponse(res, 'You can only update your own registrations', 403);
    }

    // Check if registration can be updated
    if (!['pending', 'confirmed'].includes(registration.status)) {
      return errorResponse(res, 'This registration cannot be updated', 400);
    }

    // Update registration
    const updatedRegistration = await EventRegistration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'event', select: 'title dateTime venue' },
      { path: 'user', select: 'firstName lastName email' }
    ]);

    successResponse(res, updatedRegistration, 'Registration updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get event registrations (Organizer/Admin only)
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer/Admin)
const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20, status, paymentStatus, checkInStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if user is organizer or admin
    const event = await Event.findById(eventId);
    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied', 403);
    }

    // Build filter
    const filter = { event: eventId };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (checkInStatus) filter.checkInStatus = checkInStatus;

    // Build sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const registrations = await EventRegistration.find(filter)
      .populate('user', 'firstName lastName email phone')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EventRegistration.countDocuments(filter);

    // Get statistics
    const stats = await EventRegistration.getEventStats(eventId);

    const result = {
      registrations,
      stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRegistrations: total,
        limit: parseInt(limit)
      }
    };

    successResponse(res, result, 'Event registrations retrieved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Check-in attendee
// @route   PATCH /api/registrations/:id/check-in
// @access  Private (Organizer/Admin)
const checkInAttendee = async (req, res) => {
  try {
    const { checkInStatus, notes } = req.body;
    const registration = await EventRegistration.findById(req.params.id);

    if (!registration) {
      return notFoundResponse(res, 'Registration not found');
    }

    // Check if user can check-in this registration
    const event = await Event.findById(registration.event);
    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied', 403);
    }

    // Update check-in status
    registration.checkInStatus = checkInStatus;
    registration.checkInTime = new Date();
    registration.checkInBy = req.user._id;
    if (notes) {
      registration.registrationNotes = notes;
    }
    await registration.save();

    successResponse(res, registration, 'Check-in status updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Process refund
// @route   PATCH /api/registrations/:id/refund
// @access  Private (Organizer/Admin)
const processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const registration = await EventRegistration.findById(req.params.id);

    if (!registration) {
      return notFoundResponse(res, 'Registration not found');
    }

    // Check if user can process refund
    const event = await Event.findById(registration.event);
    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied', 403);
    }

    // Check if registration can be refunded
    if (!registration.canBeRefunded) {
      return errorResponse(res, 'This registration cannot be refunded', 400);
    }

    // Process refund
    registration.status = 'refunded';
    registration.paymentStatus = 'refunded';
    registration.refundAmount = amount;
    registration.refundReason = reason;
    registration.paymentDetails.refundedAt = new Date();
    await registration.save();

    successResponse(res, registration, 'Refund processed successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Bulk operations on registrations
// @route   POST /api/registrations/bulk
// @access  Private (Organizer/Admin)
const bulkOperations = async (req, res) => {
  try {
    const { registrationIds, action, notes } = req.body;

    // Validate all registrations belong to events organized by user
    const registrations = await EventRegistration.find({
      _id: { $in: registrationIds }
    }).populate('event');

    if (registrations.length !== registrationIds.length) {
      return errorResponse(res, 'Some registrations not found', 400);
    }

    // Check permissions
    for (const registration of registrations) {
      if (registration.event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return errorResponse(res, 'Access denied for some registrations', 403);
      }
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'confirm':
        updateData = { status: 'confirmed' };
        message = 'Registrations confirmed successfully';
        break;
      case 'cancel':
        updateData = { 
          status: 'cancelled',
          cancellationReason: notes || 'Bulk cancellation'
        };
        message = 'Registrations cancelled successfully';
        break;
      case 'check_in':
        updateData = { 
          checkInStatus: 'checked_in',
          checkInTime: new Date(),
          checkInBy: req.user._id
        };
        message = 'Attendees checked in successfully';
        break;
      case 'mark_no_show':
        updateData = { 
          checkInStatus: 'no_show',
          checkInTime: new Date(),
          checkInBy: req.user._id
        };
        message = 'Attendees marked as no-show successfully';
        break;
      default:
        return errorResponse(res, 'Invalid action', 400);
    }

    const result = await EventRegistration.updateMany(
      { _id: { $in: registrationIds } },
      updateData
    );

    successResponse(res, { updatedCount: result.modifiedCount }, message);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Export registrations to CSV
// @route   GET /api/registrations/event/:eventId/export
// @access  Private (Organizer/Admin)
const exportRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { format = 'csv' } = req.query;

    // Check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return notFoundResponse(res, 'Event not found');
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied', 403);
    }

    const registrations = await EventRegistration.find({ event: eventId })
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: 1 });

    // TODO: Implement CSV export
    // For now, return the data as JSON
    successResponse(res, registrations, 'Registrations exported successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  getRegistrationById,
  cancelRegistration,
  updateRegistration,
  getEventRegistrations,
  checkInAttendee,
  processRefund,
  bulkOperations,
  exportRegistrations
}; 