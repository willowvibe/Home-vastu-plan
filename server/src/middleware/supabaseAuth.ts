import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { query } from '../db/connection.js';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

export interface SupabaseAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

function isTokenExpiredError(error: unknown): boolean {
  return error instanceof jwt.TokenExpiredError;
}

function isJsonWebTokenError(error: unknown): boolean {
  return error instanceof jwt.JsonWebTokenError;
}

/**
 * Verify a Supabase access token issued by GoTrue.
 *
 * Supabase JWTs are RS256-signed by the project's JWT secret. They contain
 * `sub` (user UUID) and `email` claims. We verify the signature, then ensure
 * the user exists in public.users so downstream code can rely on FKs to that
 * mirror table.
 */
async function verifySupabaseToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  if (!SUPABASE_JWT_SECRET) {
    console.warn('[supabaseAuth] SUPABASE_JWT_SECRET is not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload & { sub: string; email?: string };

    if (!decoded.sub) {
      return null;
    }

    // Mirror table sanity check: the client uses supabase auth.users, but the
    // server schema references public.users(id). Make sure the row exists so
    // FK inserts (e.g. ai_usage, user_entitlements) don't fail.
    const result = await query<{ id: string; email: string }>(
      'SELECT id, email FROM public.users WHERE id = $1',
      [decoded.sub]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      userId: result.rows[0].id,
      email: result.rows[0].email,
    };
  } catch (error) {
    if (isTokenExpiredError(error)) {
      console.warn('[supabaseAuth] Token expired');
    } else if (isJsonWebTokenError(error)) {
      console.warn('[supabaseAuth] Invalid token:', (error as Error).message);
    } else {
      console.error('[supabaseAuth] Unexpected verification error:', error);
    }
    return null;
  }
}

/**
 * Express middleware that requires a valid Supabase Bearer token.
 *
 * On success attaches `req.user` with `id` and `email`. Returns 401 otherwise.
 */
export async function requireSupabaseAuth(
  req: SupabaseAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = await verifySupabaseToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = {
    id: decoded.userId,
    email: decoded.email,
  };
  next();
}

/**
 * Optional variant: attaches `req.user` when a valid token is present,
 * but never rejects the request.
 */
export async function optionalSupabaseAuth(
  req: SupabaseAuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = await verifySupabaseToken(token);

    if (decoded) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
      };
    }
  }
  next();
}
