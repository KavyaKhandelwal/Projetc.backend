require('dotenv').config();

const config = {
 
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://manthan120105:7rGd66T8W8FRlX4h@cluster0.azanj5t.mongodb.net/?retryWrites=true',
  

  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
 
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

module.exports = config; 