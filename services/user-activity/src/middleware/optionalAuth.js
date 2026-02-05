const axios = require('axios');
const logger = require('../logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';

async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

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
    }
  } catch (error) {
    logger.error('Optional auth error:', error.message);
  }

  return next();
}

module.exports = optionalAuthMiddleware;
