const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Event title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [2000, 'Event description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['music', 'sports', 'business', 'technology', 'arts', 'food', 'education', 'health', 'entertainment', 'other'],
    default: 'other'
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  venue: {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true
    },
    address: {
      street: { type: String, required: [true, 'Street address is required'] },
      city: { type: String, required: [true, 'City is required'] },
      state: { type: String, required: [true, 'State is required'] },
      zipCode: { type: String, required: [true, 'Zip code is required'] },
      country: { type: String, required: [true, 'Country is required'] }
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  dateTime: {
    start: {
      type: Date,
      required: [true, 'Event start date and time is required']
    },
    end: {
      type: Date,
      required: [true, 'Event end date and time is required']
    }
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid', 'donation'],
      default: 'free'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    tickets: [{
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      sold: { type: Number, default: 0 },
      description: String,
      benefits: [String]
    }]
  },
  capacity: {
    type: Number,
    required: [true, 'Event capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  images: [{
    url: { type: String, required: true },
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'public'
  },
  features: {
    hasParking: { type: Boolean, default: false },
    isWheelchairAccessible: { type: Boolean, default: false },
    hasFood: { type: Boolean, default: false },
    hasDrinks: { type: Boolean, default: false },
    isFamilyFriendly: { type: Boolean, default: false },
    hasLiveMusic: { type: Boolean, default: false },
    hasSpeakers: { type: Boolean, default: false },
    hasWorkshops: { type: Boolean, default: false }
  },
  socialLinks: {
    website: String,
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  highlights: [{
    title: String,
    description: String,
    icon: String
  }],
  faq: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  cancellationPolicy: {
    type: String,
    maxlength: 1000
  },
  refundPolicy: {
    type: String,
    maxlength: 1000
  },
  termsAndConditions: {
    type: String,
    maxlength: 2000
  }
}, {
  timestamps: true
});

// Indexes for better performance
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ 'dateTime.start': 1 });
eventSchema.index({ 'venue.city': 1, 'venue.state': 1 });
eventSchema.index({ isFeatured: 1, status: 1 });
eventSchema.index({ 'dateTime.start': 1, status: 1 });

// Virtual for event duration in hours
eventSchema.virtual('duration').get(function() {
  if (!this.dateTime.start || !this.dateTime.end) return null;
  return Math.round((this.dateTime.end - this.dateTime.start) / (1000 * 60 * 60));
});

// Virtual for remaining capacity
eventSchema.virtual('remainingCapacity').get(function() {
  return this.capacity - this.currentAttendees;
});

// Virtual for is sold out
eventSchema.virtual('isSoldOut').get(function() {
  return this.currentAttendees >= this.capacity;
});

// Virtual for days until event
eventSchema.virtual('daysUntilEvent').get(function() {
  if (!this.dateTime.start) return null;
  const now = new Date();
  const eventDate = new Date(this.dateTime.start);
  const diffTime = eventDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for event status based on date
eventSchema.virtual('timeStatus').get(function() {
  if (!this.dateTime.start) return 'unknown';
  const now = new Date();
  const eventDate = new Date(this.dateTime.start);
  
  if (now > eventDate) return 'past';
  if (now < eventDate) return 'upcoming';
  return 'ongoing';
});

// Ensure virtual fields are serialized
eventSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to update average rating
eventSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = totalRating / this.reviews.length;
    this.totalReviews = this.reviews.length;
  }
  next();
});

// Method to check if user can edit event
eventSchema.methods.canEdit = function(userId) {
  return this.organizer.toString() === userId.toString();
};

// Method to check if event is published
eventSchema.methods.isPublished = function() {
  return this.status === 'published';
};

// Method to check if event is in the future
eventSchema.methods.isUpcoming = function() {
  return new Date() < this.dateTime.start;
};

module.exports = mongoose.model('Event', eventSchema); 