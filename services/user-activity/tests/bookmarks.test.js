const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Bookmark = require('../src/models/Bookmark');
require('./setup');

describe('Bookmarks API', () => {
  let app;
  const testUserId = 1;
  const testContentId = 100;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: testUserId };
      next();
    });

    // Bookmark routes
    app.post('/bookmarks', async (req, res) => {
      try {
        const { content_id, content_type } = req.body;
        
        const existing = await Bookmark.findOne({
          user_id: req.user.id,
          content_id,
          content_type
        });

        if (existing) {
          return res.status(400).json({ error: 'Already bookmarked' });
        }

        const bookmark = new Bookmark({
          user_id: req.user.id,
          content_id,
          content_type
        });

        await bookmark.save();
        res.status(201).json(bookmark);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/bookmarks', async (req, res) => {
      try {
        const bookmarks = await Bookmark.find({ user_id: req.user.id });
        res.json(bookmarks);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/bookmarks/:id', async (req, res) => {
      try {
        const bookmark = await Bookmark.findOneAndDelete({
          _id: req.params.id,
          user_id: req.user.id
        });

        if (!bookmark) {
          return res.status(404).json({ error: 'Bookmark not found' });
        }

        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  test('should create a bookmark', async () => {
    const response = await request(app)
      .post('/bookmarks')
      .send({
        content_id: testContentId,
        content_type: 'article'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body.content_id).toBe(testContentId);
    expect(response.body.user_id).toBe(testUserId);
  });

  test('should not create duplicate bookmark', async () => {
    await request(app)
      .post('/bookmarks')
      .send({
        content_id: testContentId,
        content_type: 'article'
      });

    const response = await request(app)
      .post('/bookmarks')
      .send({
        content_id: testContentId,
        content_type: 'article'
      });

    expect(response.status).toBe(400);
  });

  test('should get user bookmarks', async () => {
    await request(app)
      .post('/bookmarks')
      .send({
        content_id: testContentId,
        content_type: 'article'
      });

    const response = await request(app).get('/bookmarks');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
  });

  test('should delete a bookmark', async () => {
    const createResponse = await request(app)
      .post('/bookmarks')
      .send({
        content_id: testContentId,
        content_type: 'article'
      });

    const bookmarkId = createResponse.body._id;

    const deleteResponse = await request(app)
      .delete(`/bookmarks/${bookmarkId}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get('/bookmarks');
    expect(getResponse.body.length).toBe(0);
  });

  test('should return 404 for non-existent bookmark', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .delete(`/bookmarks/${fakeId}`);

    expect(response.status).toBe(404);
  });
});
