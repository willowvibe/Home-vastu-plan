import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection.js';
import { hashPassword, verifyPassword } from '../utils/helpers.js';
import { generateToken } from '../middleware/auth.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Check if user exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email, passwordHash, name || email.split('@')[0]]
  );

  const user = result.rows[0];
  const { accessToken, refreshToken } = generateToken(user.id, user.email);

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [
    email,
  ]);

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const user = result.rows[0];
  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const { accessToken, refreshToken } = generateToken(user.id, user.email);

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  // In a real implementation, add token to blacklist
  res.json({ message: 'Logged out successfully' });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  let decoded: { sub: string };
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'secret') as { sub: string };
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const { accessToken, refreshToken: newRefreshToken } = generateToken(decoded.sub, '');

  res.json({ tokens: { accessToken, refreshToken: newRefreshToken } });
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await query(
    'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
    [userId]
  );
  res.json(result.rows[0]);
}
