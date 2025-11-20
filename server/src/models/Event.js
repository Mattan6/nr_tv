const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    eventTime: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['שמחה', 'שיעור', 'אבל', 'אירוע קהילתי', 'אחר'],
      default: 'אחר',
    },
    location: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying upcoming events
eventSchema.index({ eventDate: 1, isActive: 1 });

// Virtual to check if event is in the past
eventSchema.virtual('isPast').get(function () {
  return new Date() > this.eventDate;
});

module.exports = mongoose.model('Event', eventSchema);
