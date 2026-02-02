const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
// const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');
const authMiddleware = require('./middleware/auth');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (временно отключено)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 минут
//   max: 100, // максимум 100 запросов
//   message: 'Too many requests from this IP'
// });

// app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Service URLs
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:8001',
  content: process.env.CONTENT_SERVICE_URL || 'http://localhost:8002',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:8003',
  activity: process.env.USER_ACTIVITY_SERVICE_URL || 'http://localhost:8004',
  media: process.env.MEDIA_SERVICE_URL || 'http://localhost:8005'
};

logger.info('Service configuration:', services);

// Auth Service Routes (public) - /api/v1/auth/*
app.use('/api/v1/auth', createProxyMiddleware({
  target: services.auth,
  pathRewrite: { '^/api/v1/auth': '/api/v1' },
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Auth service error:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}));

// Content Service Routes - прямой проксинг без изменения пути
// /api/v1/articles, /api/v1/books, /api/v1/dissertations
app.use('/api/v1/articles', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  }
}));

app.use('/api/v1/books', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  }
}));

app.use('/api/v1/dissertations', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  }
}));

// Categories
app.use('/api/v1/article-categories', createProxyMiddleware({
  target: services.content,
  changeOrigin: true
}));

app.use('/api/v1/book-categories', createProxyMiddleware({
  target: services.content,
  changeOrigin: true
}));

app.use('/api/v1/dissertation-categories', createProxyMiddleware({
  target: services.content,
  changeOrigin: true
}));

// Search Service Routes - /api/v1/search
app.use('/api/v1/search', createProxyMiddleware({
  target: services.search,
  pathRewrite: { '^/api/v1/search': '/api/v1/search' },
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Search service error:', err.message);
    res.status(503).json({ error: 'Search service unavailable' });
  }
}));

// User Activity - /api/v1/bookmarks, /api/v1/rate, /api/v1/views
app.use('/api/v1/bookmarks', authMiddleware, createProxyMiddleware({
  target: services.activity,
  pathRewrite: { '^/api/v1/bookmarks': '/api/v1/bookmarks' },
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Activity service error:', err.message);
    res.status(503).json({ error: 'Activity service unavailable' });
  }
}));

app.use('/api/v1/rate', authMiddleware, createProxyMiddleware({
  target: services.activity,
  pathRewrite: { '^/api/v1/rate': '/api/v1/ratings' },
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Activity service error:', err.message);
    res.status(503).json({ error: 'Activity service unavailable' });
  }
}));

app.use('/api/v1/views', createProxyMiddleware({
  target: services.activity,
  pathRewrite: { '^/api/v1/views': '/api/v1/views' },
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Activity service error:', err.message);
    res.status(503).json({ error: 'Activity service unavailable' });
  }
}));

// Media Service Routes
app.use('/api/v1/media', createProxyMiddleware({
  target: services.media,
  pathRewrite: { '^/api/v1/media': '/api/v1' },
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Media service error:', err.message);
    res.status(503).json({ error: 'Media service unavailable' });
  }
}));

// Aggregation endpoint - комбинация данных из нескольких сервисов
app.get('/api/v1/dashboard', authMiddleware, async (req, res) => {
  try {
    const axios = require('axios');
    
    // Параллельные запросы к сервисам
    const [contentStats, activityStats] = await Promise.all([
      axios.get(`${services.content}/api/v1/stats`).catch(() => ({ data: {} })),
      axios.get(`${services.activity}/api/v1/user/stats`, {
        headers: { Authorization: req.headers.authorization }
      }).catch(() => ({ data: {} }))
    ]);
    
    res.json({
      content: contentStats.data,
      activity: activityStats.data
    });
  } catch (error) {
    logger.error('Dashboard aggregation error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Routes:');
  logger.info('  /api/v1/auth     -> Auth Service');
  logger.info('  /api/v1/content  -> Content Service');
  logger.info('  /api/v1/search   -> Search Service');
  logger.info('  /api/v1/activity -> Activity Service');
  logger.info('  /api/v1/media    -> Media Service');
});

module.exports = app;
