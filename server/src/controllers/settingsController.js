const Settings = require('../models/Settings');

// @desc    Get settings
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ isDefault: true });

    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        isDefault: true,
      });
    }

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ isDefault: true });

    if (!settings) {
      settings = await Settings.create({
        ...req.body,
        isDefault: true,
      });
    } else {
      const {
        synagogueName,
        location,
        nusach,
        prayerTimes,
        displaySettings,
      } = req.body;

      if (synagogueName) settings.synagogueName = synagogueName;
      if (location) settings.location = { ...settings.location, ...location };
      if (nusach) settings.nusach = nusach;
      if (prayerTimes) settings.prayerTimes = { ...settings.prayerTimes, ...prayerTimes };
      if (displaySettings) settings.displaySettings = { ...settings.displaySettings, ...displaySettings };

      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
