require('dotenv').config();
const express = require('express');
const http = require('http');
const morgan = require('morgan');
const helmet = require('helmet');
const connectDB = require('./config/connectDB');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json()); // must be before routes
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

// health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' }));

// Error handling middleware (register after routes)
app.use(errorHandler);

// Create HTTP server and attach Socket.IO to the same server used by Express
const server = http.createServer(app);

const io = new Server(server, {
  path: process.env.SOCKET_PATH || '/socket.io',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Optional: Redis adapter for horizontal scaling (only if REDIS_URL is configured)
(async () => {
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter connected');
    } catch (err) {
      console.error('⚠️ Failed to connect Redis adapter for Socket.IO:', err);
    }
  } else {
    console.log('⚠️ REDIS_URL not set — Socket.IO running without Redis adapter (single-node mode)');
  }
})();

// example socket handlers (keep small & auth via middleware if needed)
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('ping', () => socket.emit('pong'));
  socket.on('disconnect', (reason) => {
    // lightweight disconnect handling
  });
});

// Connect DB and start server
const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// graceful shutdown hooks
const shutdown = async () => {
  console.log('Shutdown initiated');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, server, io };
