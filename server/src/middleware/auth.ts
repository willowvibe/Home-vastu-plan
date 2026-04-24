import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = 15 * 60; // 15 minutes in seconds

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export function generateToken(userId: string, email: string): { accessToken: string; refreshToken: string } {
  const options: SignOptions = { expiresIn: JWT_EXPIRY };
  const refreshOptions: SignOptions = { expiresIn: 7 * 24 * 60 * 60 }; // 7 days

  const accessToken = jwt.sign({ sub: userId, email }, JWT_SECRET, options);
  const refreshToken = jwt.sign({ sub: userId }, JWT_SECRET, refreshOptions);

  return { accessToken, refreshToken };
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    return { userId: decoded.sub, email: decoded.email };
  } catch (error) {
    return null;
  }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Verify user exists
  const result = await query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
  if (result.rows.length === 0) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = {
    id: decoded.userId,
    email: decoded.email,
  };
  next();
}

export function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
      };
    }
  }
  next();
}
