const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'IEM ApplySphere',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);

// Global Error Handler - prevents leaking stack traces to clients
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
