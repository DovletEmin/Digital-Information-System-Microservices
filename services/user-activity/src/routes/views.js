const express = require('express');
const { body, validationResult } = require('express-validator');
const View = require('../models/View');
const logger = require('../logger');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

// Записать просмотр
router.post('/',
  optionalAuth,
  [
    body('contentType').isIn(['article', 'book', 'dissertation']),
    body('contentId').isInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { contentType, contentId } = req.body;
      
      // Получаем userId если пользователь авторизован
      const userId = req.user ? req.user.id : null;
      
      const view = new View({
        userId,
        contentType,
        contentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      await view.save();

      res.status(201).json({ message: 'View recorded' });
    } catch (error) {
      logger.error('Record view error:', error);
      res.status(500).json({ error: 'Failed to record view' });
    }
  }
);

// Общая статистика просмотров
router.get('/summary', async (req, res) => {
  try {
    const [total, authenticated, anonymous, byContentType] = await Promise.all([
      View.countDocuments({}),
      View.countDocuments({ userId: { $ne: null } }),
      View.countDocuments({ userId: null }),
      View.aggregate([
        {
          $group: {
            _id: '$contentType',
            total: { $sum: 1 },
            authenticated: {
              $sum: {
                $cond: [{ $ne: ['$userId', null] }, 1, 0]
              }
            },
            anonymous: {
              $sum: {
                $cond: [{ $eq: ['$userId', null] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    const normalized = {
      article: { total: 0, authenticated: 0, anonymous: 0 },
      book: { total: 0, authenticated: 0, anonymous: 0 },
      dissertation: { total: 0, authenticated: 0, anonymous: 0 }
    };

    byContentType.forEach((item) => {
      if (normalized[item._id]) {
        normalized[item._id] = {
          total: item.total || 0,
          authenticated: item.authenticated || 0,
          anonymous: item.anonymous || 0
        };
      }
    });

    res.json({
      total,
      authenticated,
      anonymous,
      byContentType: normalized
    });
  } catch (error) {
    logger.error('Get view summary error:', error);
    res.status(500).json({ error: 'Failed to fetch view summary' });
  }
});

// Получить статистику просмотров
router.get('/stats/:contentType/:contentId', async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    const totalViews = await View.countDocuments({
      contentType,
      contentId: parseInt(contentId)
    });

    const uniqueUsers = await View.distinct('userId', {
      contentType,
      contentId: parseInt(contentId),
      userId: { $ne: null }
    });

    // Просмотры за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentViews = await View.countDocuments({
      contentType,
      contentId: parseInt(contentId),
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      total: totalViews,
      uniqueUsers: uniqueUsers.length,
      last7Days: recentViews
    });
  } catch (error) {
    logger.error('Get view stats error:', error);
    res.status(500).json({ error: 'Failed to fetch view stats' });
  }
});

// Топ просматриваемого контента
router.get('/top/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const { limit = 10 } = req.query;

    const topViewed = await View.aggregate([
      { $match: { contentType } },
      { 
        $group: { 
          _id: '$contentId',
          views: { $sum: 1 }
        }
      },
      { $sort: { views: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(topViewed);
  } catch (error) {
    logger.error('Get top views error:', error);
    res.status(500).json({ error: 'Failed to fetch top views' });
  }
});

module.exports = router;
