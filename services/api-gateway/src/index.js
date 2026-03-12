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
const axios = require('axios');

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
// Disable Helmet policies that block embedding and COOP/COEP in our internal proxy responses.
// These headers interfere with embedding proxied media (PDF/EPUB) in iframes when frontend and
// gateway run on different origins during local/dev testing. For stricter production security,
// re-enable or tune these policies appropriately.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
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

// Admin user management - /api/v1/admin/*
app.use('/api/v1/admin', authMiddleware, createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Auth service error:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}));

// Content Service Routes - прямой проксинг без изменения пути
// /api/v1/articles, /api/v1/books, /api/v1/dissertations
// Special-case streaming endpoints for books (read/download) so we can
// control response headers (CSP / X-Frame-Options) and safely allow
// embedding via iframe from the frontend during development.
app.get('/api/v1/books/:bookId/read', async (req, res) => {
  try {
    const targetUrl = `${services.content}${req.originalUrl}`;
    logger.info(`Streaming READ from ${targetUrl}`);
    const upstream = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        Authorization: req.headers.authorization || undefined,
      },
      timeout: 60000,
      // allow non-2xx responses to be returned so we can forward the exact status/body
      validateStatus: () => true,
    });

    // Copy content-type and content-disposition if present
    if (upstream.headers['content-type']) res.setHeader('Content-Type', upstream.headers['content-type']);
    if (upstream.headers['content-disposition']) res.setHeader('Content-Disposition', upstream.headers['content-disposition']);

    // If upstream returned an error status (e.g. 404), forward that status and body
    if (upstream.status && upstream.status >= 400) {
      res.status(upstream.status);
      upstream.data.pipe(res);
      return;
    }

    // Allow framing by the requesting origin only
    const origin = req.headers.origin || req.headers.referer || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // Remove or override potentially dangerous headers
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origin}`);
    res.setHeader('X-Frame-Options', 'ALLOW-FROM ' + (origin === '*' ? ' ' : origin));

    upstream.data.pipe(res);
  } catch (err) {
    logger.error('Failed to stream read:', err.message || err);
    res.status(502).json({ error: 'Failed to fetch book content' });
  }
});

// Proxy EPUB files via gateway to avoid CORS and direct MinIO access
app.get('/api/v1/books/:bookId/epub', async (req, res) => {
  try {
    // First fetch book metadata from content service
    const metaUrl = `${services.content}/api/v1/books/${req.params.bookId}`;
    const metaResp = await axios.get(metaUrl, { timeout: 10000, validateStatus: () => true });
    if (!metaResp || metaResp.status >= 400) {
      logger.warn(`Failed to fetch book metadata: ${metaResp && metaResp.status}`);
      return res.status(502).json({ error: 'Failed to fetch book metadata' });
    }
    const book = metaResp.data;
    const epubUrl = book?.epub_file_url;
    if (!epubUrl) return res.status(404).json({ detail: 'EPUB file not found for this book' });

    const upstream = await axios.get(epubUrl, {
      responseType: 'stream',
      headers: { Authorization: req.headers.authorization || undefined },
      timeout: 60000,
      validateStatus: () => true,
    });

    if (upstream.status && upstream.status >= 400) {
      res.status(upstream.status);
      upstream.data.pipe(res);
      return;
    }

    if (upstream.headers['content-type']) res.setHeader('Content-Type', upstream.headers['content-type']);
    if (upstream.headers['content-disposition']) res.setHeader('Content-Disposition', upstream.headers['content-disposition']);

    const origin = req.headers.origin || req.headers.referer || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origin}`);
    res.setHeader('X-Frame-Options', 'ALLOW-FROM ' + (origin === '*' ? ' ' : origin));

    upstream.data.pipe(res);
  } catch (err) {
    logger.error('Failed to proxy EPUB:', err.message || err);
    res.status(502).json({ error: 'Failed to fetch EPUB' });
  }
});

app.get('/api/v1/books/:bookId/download', async (req, res) => {
  try {
    const targetUrl = `${services.content}${req.originalUrl}`;
    logger.info(`Streaming DOWNLOAD from ${targetUrl}`);
    const upstream = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        Authorization: req.headers.authorization || undefined,
      },
      timeout: 60000,
      validateStatus: () => true,
    });

    if (upstream.headers['content-type']) res.setHeader('Content-Type', upstream.headers['content-type']);
    if (upstream.headers['content-disposition']) res.setHeader('Content-Disposition', upstream.headers['content-disposition']);

    if (upstream.status && upstream.status >= 400) {
      res.status(upstream.status);
      upstream.data.pipe(res);
      return;
    }

    const origin = req.headers.origin || req.headers.referer || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origin}`);
    res.setHeader('X-Frame-Options', 'ALLOW-FROM ' + (origin === '*' ? ' ' : origin));

    upstream.data.pipe(res);
  } catch (err) {
    logger.error('Failed to stream download:', err.message || err);
    res.status(502).json({ error: 'Failed to fetch book content' });
  }
});
// Optional auth: validates token and sets req.user if present, never blocks the request
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.substring(7);
    const response = await axios.post(
      `${services.auth}/api/v1/validate`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.data.valid) {
      req.user = { id: response.data.user_id, username: response.data.username };
    }
  } catch {
    // Invalid token or auth service down — continue without user
  }
  next();
};

// Middleware that requires auth for mutations; for GET/HEAD optionally identifies user
const requireAuthForMutations = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return authMiddleware(req, res, next);
  }
  return optionalAuth(req, res, next);
};

app.use('/api/v1/articles', requireAuthForMutations, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
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

app.use('/api/v1/books', requireAuthForMutations, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
    if (req.user?.id) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are present for PDF endpoints
    if (req.path.includes('/read') || req.path.includes('/download')) {
      proxyRes.headers['access-control-allow-origin'] = '*';
      proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
      proxyRes.headers['access-control-allow-headers'] = 'Authorization, Content-Type';
      // Remove any framing / CSP / COOP headers from proxied responses so frontend can embed PDFs
      delete proxyRes.headers['content-security-policy-report-only'];
      delete proxyRes.headers['cross-origin-opener-policy'];
      delete proxyRes.headers['cross-origin-embedder-policy'];
      // Allow framing by the requesting origin (development only). Prefer explicit origin over wildcard.
      const origin = req.headers.origin || req.headers.referer || '';
      if (origin) {
        try {
          // Only allow the exact origin value to avoid open framing.
          const allowedOrigin = new URL(origin).origin || origin;
          proxyRes.headers['content-security-policy'] = `frame-ancestors 'self' ${allowedOrigin}`;
          proxyRes.headers['x-frame-options'] = 'ALLOW-FROM ' + allowedOrigin;
        } catch (e) {
          proxyRes.headers['content-security-policy'] = `frame-ancestors 'self'`;
          proxyRes.headers['x-frame-options'] = 'ALLOWALL';
        }
      } else {
        proxyRes.headers['content-security-policy'] = `frame-ancestors 'self'`;
        proxyRes.headers['x-frame-options'] = 'ALLOWALL';
      }
      logger.info(`PDF endpoint proxied: ${req.path}, status: ${proxyRes.statusCode}, content-type: ${proxyRes.headers['content-type']}`);
    }
  }
}));

app.use('/api/v1/dissertations', requireAuthForMutations, createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Content service error:', err.message);
    res.status(503).json({ error: 'Content service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.path} to ${services.content}`);
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

// Saved articles/books/dissertations
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
app.use('/api/v1/ratings', requireAuthForMutations, createProxyMiddleware({
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

// User Activity - analytics endpoints
app.use('/api/v1/analytics', authMiddleware, createProxyMiddleware({
  target: services.activity,
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
