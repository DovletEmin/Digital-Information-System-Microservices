const express = require('express');
const { body, validationResult } = require('express-validator');
const Bookmark = require('../models/Bookmark');
const logger = require('../logger');

const router = express.Router();

// Получить все закладки пользователя
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentType, page = 1, limit = 20 } = req.query;

    const query = { userId };
    if (contentType) {
      query.contentType = contentType;
    }

    const bookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Bookmark.countDocuments(query);

    res.json({
      bookmarks,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Добавить закладку
router.post('/',
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
      const userId = req.user.id;

      const bookmark = new Bookmark({
        userId,
        contentType,
        contentId
      });

      await bookmark.save();

      res.status(201).json(bookmark);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Bookmark already exists' });
      }
      logger.error('Create bookmark error:', error);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  }
);

// Переключить закладку (добавить/удалить) - совместимо с монолитом
router.post('/toggle/:pk', async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.pk);
    const { content_type } = req.body; // article, book, dissertation

    if (!['article', 'book', 'dissertation'].includes(content_type)) {
      return res.status(400).json({ error: 'Invalid content_type' });
    }

    // Проверяем существует ли закладка
    const existingBookmark = await Bookmark.findOne({
      userId,
      contentType: content_type,
      contentId
    });

    if (existingBookmark) {
      // Удаляем закладку
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      res.json({ 
        message: 'Bookmark removed',
        bookmarked: false 
      });
    } else {
      // Создаем закладку
      const bookmark = new Bookmark({
        userId,
        contentType: content_type,
        contentId
      });
      await bookmark.save();
      res.status(201).json({ 
        message: 'Bookmark added',
        bookmarked: true 
      });
    }
  } catch (error) {
    logger.error('Toggle bookmark error:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Проверить наличие закладки
router.get('/check/:contentType/:contentId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentType, contentId } = req.params;

    const bookmark = await Bookmark.findOne({
      userId,
      contentType,
      contentId: parseInt(contentId)
    });

    res.json({ bookmarked: !!bookmark });
  } catch (error) {
    logger.error('Check bookmark error:', error);
    res.status(500).json({ error: 'Failed to check bookmark' });
  }
});

// Удалить закладку
router.delete('/:contentType/:contentId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentType, contentId } = req.params;

    const result = await Bookmark.deleteOne({
      userId,
      contentType,
      contentId: parseInt(contentId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    logger.error('Delete bookmark error:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

module.exports = router;
