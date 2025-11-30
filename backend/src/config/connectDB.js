// src/config/mongodbConnect.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // optional: set small selection timeout for faster failure in dev
      serverSelectionTimeoutMS: 10000,
      // autoIndex false in production for performance
      autoIndex: process.env.NODE_ENV !== 'production'
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Helpful debug info (do not leak in prod)
    if (error.stack) console.error(error.stack);
    // If you want nodemon to keep running for rapid iteration, comment out exit
    process.exit(1);
  }
};

module.exports = connectDB;
