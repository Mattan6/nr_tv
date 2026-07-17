const mongoose = require('mongoose');

const prayerTimesSchema = new mongoose.Schema({
  shacharit: { type: String, default: '' },
  mincha: { type: String, default: '' },
  arvit: { type: String, default: '' },
});

const settingsSchema = new mongoose.Schema(
  {
    synagogueName: {
      type: String,
      default: 'בית הכנסת נווה רחמים',
    },
    location: {
      city: {
        type: String,
        default: 'ניצן',
      },
      latitude: {
        type: Number,
        default: 31.7575,
      },
      longitude: {
        type: Number,
        default: 34.5569,
      },
    },
    nusach: {
      type: String,
      enum: ['אשכנז', 'ספרד', 'עדות המזרח'],
      default: 'עדות המזרח',
    },
    prayerTimes: {
      weekday: prayerTimesSchema,
      shabbat: {
        shacharit: { type: String, default: '' },
        mincha: { type: String, default: '' },
      },
    },
    displaySettings: {
      refreshInterval: {
        type: Number,
        default: 60000, // 1 minute in milliseconds
      },
      announcementDuration: {
        type: Number,
        default: 10000, // 10 seconds per announcement
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one default settings document
settingsSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await mongoose.model('Settings').updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
