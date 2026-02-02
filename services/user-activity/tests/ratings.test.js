const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Rating = require('../src/models/Rating');
require('./setup');

describe('Ratings API', () => {
  let app;
  const testUserId = 1;
  const testContentId = 100;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.user = { id: testUserId };
      next();
    });

    app.post('/ratings', async (req, res) => {
      try {
        const { content_id, content_type, rating } = req.body;

        if (rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const existing = await Rating.findOne({
          user_id: req.user.id,
          content_id,
          content_type
        });

        if (existing) {
          existing.rating = rating;
          await existing.save();
          return res.json(existing);
        }

        const newRating = new Rating({
          user_id: req.user.id,
          content_id,
          content_type,
          rating
        });

        await newRating.save();
        res.status(201).json(newRating);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/ratings/content/:content_id', async (req, res) => {
      try {
        const ratings = await Rating.find({ content_id: req.params.content_id });
        
        if (ratings.length === 0) {
          return res.json({ average: 0, count: 0 });
        }

        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / ratings.length;

        res.json({
          average: Math.round(average * 10) / 10,
          count: ratings.length
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  test('should create a rating', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({
        content_id: testContentId,
        content_type: 'article',
        rating: 5
      });

    expect(response.status).toBe(201);
    expect(response.body.rating).toBe(5);
  });

  test('should reject invalid rating', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({
        content_id: testContentId,
        content_type: 'article',
        rating: 6
      });

    expect(response.status).toBe(400);
  });

  test('should update existing rating', async () => {
    await request(app)
      .post('/ratings')
      .send({
        content_id: testContentId,
        content_type: 'article',
        rating: 3
      });

    const response = await request(app)
      .post('/ratings')
      .send({
        content_id: testContentId,
        content_type: 'article',
        rating: 5
      });

    expect(response.status).toBe(200);
    expect(response.body.rating).toBe(5);
  });

  test('should calculate average rating', async () => {
    // Create ratings from different users
    const ratings = [5, 4, 3, 4, 5];
    
    for (let i = 0; i < ratings.length; i++) {
      await Rating.create({
        user_id: i + 1,
        content_id: testContentId,
        content_type: 'article',
        rating: ratings[i]
      });
    }

    const response = await request(app)
      .get(`/ratings/content/${testContentId}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(5);
    expect(response.body.average).toBeCloseTo(4.2, 1);
  });

  test('should return zero for content with no ratings', async () => {
    const response = await request(app)
      .get('/ratings/content/999');

    expect(response.status).toBe(200);
    expect(response.body.average).toBe(0);
    expect(response.body.count).toBe(0);
  });
});
