const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  ticketType: {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Maximum 10 tickets per registration']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'expired'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'free'],
    default: 'free'
  },
  paymentDetails: {
    transactionId: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paidAt: Date,
    refundedAt: Date
  },
  attendeeInfo: [{
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    dietaryRestrictions: String,
    specialRequirements: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  }],
  registrationNotes: {
    type: String,
    maxlength: [500, 'Registration notes cannot exceed 500 characters']
  },
  checkInStatus: {
    type: String,
    enum: ['not_checked_in', 'checked_in', 'no_show'],
    default: 'not_checked_in'
  },
  checkInTime: Date,
  checkInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    maxlength: [200, 'Refund reason cannot exceed 200 characters']
  },
  registrationSource: {
    type: String,
    enum: ['website', 'mobile_app', 'admin', 'api'],
    default: 'website'
  },
  promotionalCode: {
    code: String,
    discount: { type: Number, default: 0 },
    appliedAt: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: Date,
  lastReminderSent: Date,
  reminderCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });
eventRegistrationSchema.index({ event: 1, status: 1 });
eventRegistrationSchema.index({ user: 1, status: 1 });
eventRegistrationSchema.index({ 'paymentStatus': 1 });
eventRegistrationSchema.index({ 'checkInStatus': 1 });
eventRegistrationSchema.index({ createdAt: 1 });

// Virtual for total amount
eventRegistrationSchema.virtual('totalAmount').get(function() {
  return this.ticketType.price * this.quantity;
});

// Virtual for is active registration
eventRegistrationSchema.virtual('isActive').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

// Virtual for can be cancelled
eventRegistrationSchema.virtual('canBeCancelled').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

// Virtual for can be refunded
eventRegistrationSchema.virtual('canBeRefunded').get(function() {
  return this.paymentStatus === 'paid' && this.status === 'confirmed';
});

// Ensure virtual fields are serialized
eventRegistrationSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to validate capacity
eventRegistrationSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('quantity')) {
    const Event = require('./Event');
    const event = await Event.findById(this.event);
    
    if (!event) {
      return next(new Error('Event not found'));
    }

    // Check if event is published
    if (event.status !== 'published') {
      return next(new Error('Cannot register for unpublished event'));
    }

    // Check if event is in the future
    if (new Date() >= event.dateTime.start) {
      return next(new Error('Cannot register for past or ongoing event'));
    }

    // Check capacity
    const existingRegistrations = await this.constructor.find({
      event: this.event,
      status: { $in: ['pending', 'confirmed'] }
    });

    const totalRegistered = existingRegistrations.reduce((sum, reg) => {
      return reg._id.toString() === this._id.toString() 
        ? sum + this.quantity 
        : sum + reg.quantity;
    }, 0);

    if (totalRegistered > event.capacity) {
      return next(new Error('Event is at full capacity'));
    }
  }
  next();
});

// Method to check if user can register for this event
eventRegistrationSchema.statics.canUserRegister = async function(userId, eventId, quantity = 1) {
  const Event = require('./Event');
  const event = await Event.findById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'published') {
    throw new Error('Event is not available for registration');
  }

  if (new Date() >= event.dateTime.start) {
    throw new Error('Registration is closed for this event');
  }

  // Check if user already registered
  const existingRegistration = await this.findOne({
    event: eventId,
    user: userId,
    status: { $in: ['pending', 'confirmed'] }
  });

  if (existingRegistration) {
    throw new Error('You have already registered for this event');
  }

  // Check capacity
  const totalRegistered = await this.aggregate([
    {
      $match: {
        event: new mongoose.Types.ObjectId(eventId),
        status: { $in: ['pending', 'confirmed'] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$quantity' }
      }
    }
  ]);

  const currentCapacity = totalRegistered.length > 0 ? totalRegistered[0].total : 0;
  
  if (currentCapacity + quantity > event.capacity) {
    throw new Error('Not enough capacity available');
  }

  return true;
};

// Method to get registration statistics
eventRegistrationSchema.statics.getEventStats = async function(eventId) {
  const stats = await this.aggregate([
    {
      $match: { event: new mongoose.Types.ObjectId(eventId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalRevenue: { $sum: '$paymentDetails.amount' }
      }
    }
  ]);

  const result = {
    totalRegistrations: 0,
    confirmedRegistrations: 0,
    pendingRegistrations: 0,
    cancelledRegistrations: 0,
    totalAttendees: 0,
    totalRevenue: 0
  };

  stats.forEach(stat => {
    result.totalRegistrations += stat.count;
    result.totalAttendees += stat.totalQuantity;
    result.totalRevenue += stat.totalRevenue;

    switch (stat._id) {
      case 'confirmed':
        result.confirmedRegistrations = stat.count;
        break;
      case 'pending':
        result.pendingRegistrations = stat.count;
        break;
      case 'cancelled':
        result.cancelledRegistrations = stat.count;
        break;
    }
  });

  return result;
};

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema); 