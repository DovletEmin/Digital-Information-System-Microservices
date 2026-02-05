const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./logger');

require('dotenv').config();

const bookmarkRoutes = require('./routes/bookmarks');
const ratingRoutes = require('./routes/ratings');
const viewRoutes = require('./routes/views');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8004;

const corsOriginsEnv = process.env.CORS_ORIGINS || '*';
let corsOptions;

if (!corsOriginsEnv || corsOriginsEnv.trim() === '*' ) {
  corsOptions = { origin: true, credentials: true };
} else {
  const allowedOrigins = corsOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  };
}

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/activity_db';

mongoose.connect(MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Health check
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    service: 'user-activity',
    mongodb: mongoStatus
  });
});

// Routes
app.use('/api/v1/bookmarks', authMiddleware, bookmarkRoutes);
app.use('/api/v1/ratings', authMiddleware, ratingRoutes);
app.use('/api/v1/views', viewRoutes);

// User stats endpoint
app.get('/api/v1/user/stats', authMiddleware, async (req, res) => {
  try {
    const Bookmark = require('./models/Bookmark');
    const Rating = require('./models/Rating');
    const View = require('./models/View');

    const userId = req.user.id;

    const [bookmarkCount, ratingCount, viewCount] = await Promise.all([
      Bookmark.countDocuments({ userId }),
      Rating.countDocuments({ userId }),
      View.countDocuments({ userId })
    ]);

    res.json({
      bookmarks: bookmarkCount,
      ratings: ratingCount,
      views: viewCount
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`User Activity Service running on port ${PORT}`);
});

module.exports = app;
