const express = require('express');
const router = express.Router();
const View = require('../models/View');
const Rating = require('../models/Rating');

/**
 * GET /api/v1/analytics/popular
 * Top 10 most-viewed content items.
 * Query params: content_type (article|book|dissertation), limit (1-50, default 10)
 */
router.get('/popular', async (req, res) => {
  try {
    const { content_type, limit = 10 } = req.query;
    const clampedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const matchStage = content_type
      ? { $match: { contentType: content_type } }
      : { $match: {} };

    const pipeline = [
      matchStage,
      {
        $group: {
          _id: { contentType: '$contentType', contentId: '$contentId' },
          views: { $sum: 1 },
          lastViewed: { $max: '$createdAt' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: clampedLimit },
      {
        $project: {
          _id: 0,
          content_type: '$_id.contentType',
          content_id: '$_id.contentId',
          views: 1,
          last_viewed: '$lastViewed',
        },
      },
    ];

    const results = await View.aggregate(pipeline);
    res.json({ popular: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch popular content' });
  }
});

/**
 * GET /api/v1/analytics/trends
 * Daily view counts over the last 30 days.
 * Query params: content_type (optional)
 */
router.get('/trends', async (req, res) => {
  try {
    const { content_type } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const match = { createdAt: { $gte: since } };
    if (content_type) match.contentType = content_type;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
          },
          views: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          views: 1,
        },
      },
    ];

    const results = await View.aggregate(pipeline);
    res.json({ trends: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch view trends' });
  }
});

/**
 * GET /api/v1/analytics/summary
 * High-level totals: total views, total ratings, average rating.
 */
router.get('/summary', async (req, res) => {
  try {
    const [totalViews, ratingAgg] = await Promise.all([
      View.countDocuments(),
      Rating.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            average: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    const ratingStats = ratingAgg[0] || { total: 0, average: null };

    res.json({
      total_views: totalViews,
      total_ratings: ratingStats.total,
      average_rating: ratingStats.average
        ? Math.round(ratingStats.average * 100) / 100
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

module.exports = router;
