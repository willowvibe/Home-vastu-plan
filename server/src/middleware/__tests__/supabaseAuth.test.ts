import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireSupabaseAuth, optionalSupabaseAuth, SupabaseAuthRequest } from '../supabaseAuth.js';

const TEST_SECRET = 'test-super-secret-key-must-be-at-least-32-characters';

vi.hoisted(() => {
  process.env.SUPABASE_JWT_SECRET = 'test-super-secret-key-must-be-at-least-32-characters';
});

vi.mock('../../db/connection.js', () => ({
  query: vi.fn(),
}));

import { query } from '../../db/connection.js';

function createMockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockReq(token?: string): SupabaseAuthRequest {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as SupabaseAuthRequest;
}

function createToken(payload: { sub: string; email: string; exp?: number }): string {
  return jwt.sign(payload, TEST_SECRET, { algorithm: 'HS256' });
}

describe('requireSupabaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('returns 401 when no authorization header is present', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await requireSupabaseAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is malformed', async () => {
    const req = createMockReq('not-a-valid-token');
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await requireSupabaseAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the user is not in the mirror table', async () => {
    const token = createToken({
      sub: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
    });
    vi.mocked(query).mockResolvedValueOnce({ rows: [] });

    const req = createMockReq(token);
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await requireSupabaseAuth(req, res, next);

    expect(query).toHaveBeenCalledWith('SELECT id, email FROM public.users WHERE id = $1', [
      '00000000-0000-0000-0000-000000000000',
    ]);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches req.user when token and user row are valid', async () => {
    const token = createToken({
      sub: '11111111-1111-1111-1111-111111111111',
      email: 'pro@example.com',
    });
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ id: '11111111-1111-1111-1111-111111111111', email: 'pro@example.com' }],
    });

    const req = createMockReq(token);
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await requireSupabaseAuth(req, res, next);

    expect(req.user).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'pro@example.com',
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is expired', async () => {
    const token = createToken({
      sub: '11111111-1111-1111-1111-111111111111',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    const req = createMockReq(token);
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await requireSupabaseAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalSupabaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('always calls next and leaves user undefined without a token', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await optionalSupabaseAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('attaches user and calls next when token is valid', async () => {
    const token = createToken({
      sub: '22222222-2222-2222-2222-222222222222',
      email: 'optional@example.com',
    });
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ id: '22222222-2222-2222-2222-222222222222', email: 'optional@example.com' }],
    });

    const req = createMockReq(token);
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    await optionalSupabaseAuth(req, res, next);

    expect(req.user).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'optional@example.com',
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
