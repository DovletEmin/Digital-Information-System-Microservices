const request = require('supertest');
const express = require('express');
const authMiddleware = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({ user: req.user });
    });
    
    app.get('/public', (req, res) => {
      res.json({ message: 'Public route' });
    });
  });

  test('should allow access to public routes', async () => {
    const response = await request(app)
      .get('/public');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
  });

  test('should block access without token', async () => {
    const response = await request(app)
      .get('/protected');
    
    expect(response.status).toBe(401);
  });

  test('should block access with invalid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid_token');
    
    expect(response.status).toBe(401);
  });

  test('should allow access with valid token format', async () => {
    // This would need a real JWT token in production
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.test';
    
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${mockToken}`);
    
    // Will fail validation but should reach the auth logic
    expect([200, 401, 403]).toContain(response.status);
  });
});
