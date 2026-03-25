import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Supabase before importing app
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  maybeSingle: jest.fn(),
  single: jest.fn(),
};

jest.unstable_mockModule('../src/db/supabase.js', () => ({
  default: mockSupabase,
  testConnection: jest.fn(),
}));

jest.unstable_mockModule('../src/db/redis.js', () => ({
  getRedis: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
  }),
}));

const { default: app } = await import('../src/server.js');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user with phone and send OTP', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null }); // no existing user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'user-1', phone: '+911234567890', name: 'Test', plan: 'free' },
        error: null,
      });
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null }); // OTP upsert

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          method: 'phone',
          identifier: '+911234567890',
          name: 'Test Student',
          class: 10,
          board: 'CBSE',
        });

      expect(res.status).toBe(201);
      expect(res.body.requiresVerification).toBe(true);
    });

    it('should create a new user with email and return tokens', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null }); // no existing user
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'user-2', email: 'test@example.com', name: 'Test', plan: 'free' },
        error: null,
      });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          method: 'email',
          identifier: 'test@example.com',
          name: 'Test Student',
          class: 10,
          board: 'CBSE',
          password: 'securepass123',
        });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject duplicate user', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing' } });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          method: 'email',
          identifier: 'existing@example.com',
          name: 'Dup User',
          class: 10,
          board: 'CBSE',
        });

      expect(res.status).toBe(409);
    });

    it('should reject missing identifier', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ name: 'No ID' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login/otp', () => {
    it('should send OTP for existing phone user', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'user-1', phone: '+911234567890' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login/otp')
        .send({ phone: '+911234567890' });

      expect(res.status).toBe(200);
      expect(res.body.requiresVerification).toBe(true);
    });

    it('should return 404 for unknown phone', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null });

      const res = await request(app)
        .post('/api/v1/auth/login/otp')
        .send({ phone: '+919999999999' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for missing phone', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login/otp')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login (email + password)', () => {
    it('should return tokens for valid credentials', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('correctpassword', 12);

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'user-3', email: 'login@test.com', password_hash: hash, plan: 'free' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com', password: 'correctpassword' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('correctpassword', 12);

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'user-3', email: 'login@test.com', password_hash: hash, plan: 'free' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should reject missing password for email login', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'user-3', email: 'login@test.com', password_hash: 'some_hash', plan: 'free' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com' });

      expect(res.status).toBe(400);
    });
  });
});
