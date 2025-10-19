require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const connectDB = require('./config/connectDB');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json()); // <--- Must be BEFORE routes
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(errorHandler);

// Connect DB and start server
const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
