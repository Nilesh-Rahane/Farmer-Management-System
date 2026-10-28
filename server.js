require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection middleware for API requests
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in request:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please check MONGODB_URI environment variable and MongoDB Atlas network access.',
    });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/worker', require('./routes/worker'));
app.use('/api/seed', require('./routes/seed'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Farm Ledger Management System',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Fallback to index.html for SPA client navigation
app.use((req, res, next) => {
  // If request is for an API route that wasn't handled, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  // Otherwise serve SPA index.html
  if (req.method === 'GET') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `An account or record with this ${field} already exists.`,
    });
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for resource identifier: ${err.value}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Farm Ledger running on port ${PORT}`);
  });
}
module.exports = app;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
