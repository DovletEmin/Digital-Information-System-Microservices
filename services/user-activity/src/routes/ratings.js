const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Rating = require('../models/Rating');
const logger = require('../logger');

const router = express.Router();

// Валидаторы для повторного использования
const contentTypeValidator = param('contentType').isIn(['article', 'book', 'dissertation']);
const contentIdValidator = param('contentId').isInt({ min: 1 }).toInt();

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Вспомогательная функция для расчета среднего рейтинга
const calculateAverage = (ratings) => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return parseFloat((sum / ratings.length).toFixed(2));
};

// Получить рейтинги контента
router.get('/:contentType/:contentId',
  [contentTypeValidator, contentIdValidator],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { contentType, contentId } = req.params;

      const ratings = await Rating.find({
        contentType,
        contentId
      }).sort({ createdAt: -1 });

      res.json({
        ratings,
        average: calculateAverage(ratings),
        count: ratings.length
      });
    } catch (error) {
      logger.error('Get ratings error:', error);
      res.status(500).json({ error: 'Failed to fetch ratings' });
    }
  });

// Добавить/обновить рейтинг
router.post('/',
  requireAuth,
  [
    body('contentType').isIn(['article', 'book', 'dissertation']),
    body('contentId').isInt({ min: 1 }).toInt(),
    body('rating').isInt({ min: 1, max: 5 }).toInt(),
    body('comment').optional().isString().trim().isLength({ max: 1000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { contentType, contentId, rating, comment } = req.body;
      const userId = req.user.id;

      // Проверяем, существует ли рейтинг
      const existingRating = await Rating.findOne({ userId, contentType, contentId });
      const isUpdate = !!existingRating;

      // Upsert: обновить если существует, создать если нет
      const result = await Rating.findOneAndUpdate(
        { userId, contentType, contentId },
        { rating, comment, updatedAt: Date.now() },
        { upsert: true, new: true }
      );

      // Возвращаем правильный статус код
      res.status(isUpdate ? 200 : 201).json(result);
    } catch (error) {
      logger.error('Create/Update rating error:', error);
      res.status(500).json({ error: 'Failed to save rating' });
    }
  }
);

// Получить рейтинг пользователя для контента
router.get('/my/:contentType/:contentId',
  requireAuth,
  [contentTypeValidator, contentIdValidator],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.id;
      const { contentType, contentId } = req.params;

      const rating = await Rating.findOne({
        userId,
        contentType,
        contentId
      });

      if (!rating) {
        return res.status(404).json({ error: 'Rating not found' });
      }

      res.json(rating);
    } catch (error) {
      logger.error('Get user rating error:', error);
      res.status(500).json({ error: 'Failed to fetch rating' });
    }
  });

// Удалить рейтинг
router.delete('/:contentType/:contentId',
  requireAuth,
  [contentTypeValidator, contentIdValidator],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.id;
      const { contentType, contentId } = req.params;

      const result = await Rating.deleteOne({
        userId,
        contentType,
        contentId
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Rating not found' });
      }

      res.json({ message: 'Rating deleted successfully' });
    } catch (error) {
      logger.error('Delete rating error:', error);
      res.status(500).json({ error: 'Failed to delete rating' });
    }
  });

// Статистика рейтингов по типу контента
router.get('/stats/:contentType/:contentId',
  [contentTypeValidator, contentIdValidator],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { contentType, contentId } = req.params;

      // Используем агрегацию MongoDB для эффективного расчета
      const stats = await Rating.aggregate([
        {
          $match: {
            contentType,
            contentId
          }
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 },
            distribution: {
              $push: '$rating'
            }
          }
        }
      ]);

      if (stats.length === 0) {
        return res.json({
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }

      // Создаем распределение по звездам
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      stats[0].distribution.forEach(rating => {
        distribution[rating]++;
      });

      res.json({
        average: parseFloat(stats[0].average.toFixed(2)),
        count: stats[0].count,
        distribution
      });
    } catch (error) {
      logger.error('Get rating stats error:', error);
      res.status(500).json({ error: 'Failed to fetch rating stats' });
    }
  });

module.exports = router;
