const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('⚠️  Server will start without database connection. Some features may not work.');
    console.log('💡 To use full features, please start MongoDB or use MongoDB Atlas.');
  }
};

module.exports = connectDB; 