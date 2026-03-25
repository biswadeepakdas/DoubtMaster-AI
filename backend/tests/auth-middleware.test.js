import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

jest.unstable_mockModule('../src/db/redis.js', () => ({
  getRedis: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }),
}));

jest.unstable_mockModule('../src/db/supabase.js', () => ({
  default: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null }),
        })),
      })),
    })),
  },
}));

const { authenticate, requirePro, requireTeacher, generateTokens } = await import('../src/middleware/auth.js');
const config = (await import('../src/config/index.js')).default;

function mockReq(headers = {}) {
  return { headers, user: null };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  it('should set req.user for valid token', (done) => {
    const token = jwt.sign({ id: 'user-1', email: 'a@b.com', plan: 'free', role: 'student' }, config.jwt.secret, { algorithm: 'HS256' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    authenticate(req, res, (err) => {
      expect(err).toBeUndefined();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-1');
      done();
    });
  });

  it('should call next with error for missing token', (done) => {
    const req = mockReq({});
    const res = mockRes();

    authenticate(req, res, (err) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      done();
    });
  });

  it('should call next with error for invalid token', (done) => {
    const req = mockReq({ authorization: 'Bearer invalid.token.here' });
    const res = mockRes();

    authenticate(req, res, (err) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('INVALID_TOKEN');
      done();
    });
  });

  it('should call next with error for expired token', (done) => {
    const token = jwt.sign({ id: 'user-1' }, config.jwt.secret, { expiresIn: '0s', algorithm: 'HS256' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    // Small delay to ensure token expires
    setTimeout(() => {
      authenticate(req, res, (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('TOKEN_EXPIRED');
        done();
      });
    }, 50);
  });

  it('should NOT crash the process on any error (BUG-006 regression)', (done) => {
    const req = mockReq({ authorization: 'Bearer malformed' });
    const res = mockRes();

    // If this throws synchronously instead of calling next(error), the test fails
    authenticate(req, res, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });
});

describe('requireTeacher middleware', () => {
  it('should pass for teacher role', (done) => {
    const req = { user: { id: 'u1', role: 'teacher' } };
    const res = mockRes();

    requireTeacher(req, res, (err) => {
      expect(err).toBeUndefined();
      done();
    });
  });

  it('should reject non-teacher role', (done) => {
    const req = { user: { id: 'u1', role: 'student' } };
    const res = mockRes();

    requireTeacher(req, res, (err) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(403);
      done();
    });
  });

  it('should NOT crash the process (BUG-007 regression)', (done) => {
    const req = { user: null };
    const res = mockRes();

    requireTeacher(req, res, (err) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(401);
      done();
    });
  });
});

describe('generateTokens', () => {
  it('should return accessToken, token, and refreshToken', () => {
    const tokens = generateTokens({ id: 'user-1', email: 'a@b.com', plan: 'free', role: 'student' });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.token).toBe(tokens.accessToken); // BUG-004 fix: both keys present
    expect(tokens.refreshToken).toBeDefined();

    // Verify token contents
    const decoded = jwt.verify(tokens.accessToken, config.jwt.secret);
    expect(decoded.id).toBe('user-1');
    expect(decoded.plan).toBe('free');
  });
});
