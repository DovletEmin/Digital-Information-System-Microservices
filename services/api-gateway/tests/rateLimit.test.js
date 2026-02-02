const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

describe('Rate Limiting', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    const limiter = rateLimit({
      windowMs: 1000, // 1 second for testing
      max: 3,
      message: 'Too many requests'
    });
    
    app.use('/api', limiter);
    
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Success' });
    });
  });

  test('should allow requests under limit', async () => {
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(200);
  });

  test('should block requests over limit', async () => {
    // Make requests up to the limit
    await request(app).get('/api/test');
    await request(app).get('/api/test');
    await request(app).get('/api/test');
    
    // This should be blocked
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(429);
  });

  test('should reset after window expires', async () => {
    // Make requests up to the limit
    await request(app).get('/api/test');
    await request(app).get('/api/test');
    await request(app).get('/api/test');
    
    // Wait for window to reset
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should work again
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(200);
  });
});
