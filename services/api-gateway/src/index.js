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

const corsOriginsEnv = process.env.CORS_ORIGINS || '*';
let corsOptions;

if (!corsOriginsEnv || corsOriginsEnv.trim() === '*') {
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
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    logger.error('Auth service error:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.auth}`);
    
    // Fix for body forwarding issue
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));
 
// Users Service Routes - /api/v1/users/*
app.use('/api/v1/users', createProxyMiddleware({
  target: services.auth,
  pathRewrite: { '^/api/v1/users': '/api/v1/users' },
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
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/books', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/dissertations', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// Saved articles/books/dissertations + highlights (requires auth)
app.use('/api/v1/saved-articles', authMiddleware, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/highlights', authMiddleware, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/saved-books', authMiddleware, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/book-highlights', authMiddleware, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/saved-dissertations', authMiddleware, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/dissertation-highlights', authMiddleware, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// Categories
app.use('/api/v1/article-categories', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/book-categories', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.use('/api/v1/dissertation-categories', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
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

// Ratings - /api/v1/ratings
app.use('/api/v1/ratings', authMiddleware, createProxyMiddleware({
  target: services.activity,
  pathRewrite: { '^/api/v1/ratings': '/api/v1/ratings' },
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.activity}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    logger.error('Activity service error:', err.message);
    res.status(503).json({ error: 'Activity service unavailable' });
  }
}));

app.use('/api/v1/rate', authMiddleware, createProxyMiddleware({
  target: services.activity,
  pathRewrite: { '^/api/v1/rate': '/api/v1/ratings' },
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.activity}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    logger.error('Activity service error:', err.message);
    res.status(503).json({ error: 'Activity service unavailable' });
  }
}));

app.use('/api/v1/views', createProxyMiddleware({
  target: services.activity,
  pathRewrite: { '^/api/v1/views': '/api/v1/views' },
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.activity}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
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
