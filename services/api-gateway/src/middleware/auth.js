const axios = require('axios');
const logger = require('../logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';

async function authMiddleware(req, res, next) {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Валидация токена через Auth Service
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/v1/validate`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (response.data.valid) {
      req.user = {
        id: response.data.user_id,
        username: response.data.username
      };
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    
    if (error.response && error.response.status === 401) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(503).json({ error: 'Auth service unavailable' });
    }
  }
}

module.exports = authMiddleware;
