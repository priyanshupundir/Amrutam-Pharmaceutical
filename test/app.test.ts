import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Application Bootstrap', () => {
  const app = createApp();

  it('GET /health/live returns UP status and 200 OK', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET / returns operational service metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('Amrutam Telemedicine Backend');
    expect(res.body.status).toBe('operational');
  });

  it('GET /non-existent-route returns RFC 7807 404 response', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.correlationId).toBeDefined();
  });
});
