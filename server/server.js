// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/favorites', require('./routes/favorites'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'CineAI Backend is running!' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 CineAI Server running on port ${PORT}`);
  await testConnection();
});