const express = require('express');
const cors = require('cors');

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

module.exports = app;
