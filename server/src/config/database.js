const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB not connected: ${error.message}`);
    console.warn('Server will keep running without a database. Admin/announcements/events features are unavailable until a valid MONGODB_URI is set in server/.env.');
  }
};

module.exports = connectDB;
