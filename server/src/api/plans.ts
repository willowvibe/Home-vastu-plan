import { Request, Response } from 'express';
import { query } from '../db/connection.js';
import { generateUUID } from '../utils/helpers.js';

export async function getPlans(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await query(
    'SELECT id, name, data_json, is_public, created_at, updated_at FROM plans WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );

  res.json({ plans: result.rows });
}

export async function getPlan(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = (req as any).user?.id;

  // Check if plan is public
  const publicPlan = await query(
    'SELECT plans.id, plans.name, plans.data_json, plans.is_public, plans.created_at, plans.updated_at, users.email as owner_email ' +
      'FROM plans JOIN users ON plans.user_id = users.id ' +
      'WHERE plans.id = $1 AND plans.is_public = true',
    [id]
  );

  if (publicPlan.rows.length > 0) {
    res.json(publicPlan.rows[0]);
    return;
  }

  // Check if user owns plan
  if (userId) {
    const ownedPlan = await query(
      'SELECT id, name, data_json, is_public, created_at, updated_at FROM plans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (ownedPlan.rows.length > 0) {
      res.json(ownedPlan.rows[0]);
      return;
    }
  }

  // Check if user has access via share
  const sharedPlan = await query(
    'SELECT plans.id, plans.name, plans.data_json, plans.is_public, plans.created_at, plans.updated_at ' +
      'FROM plans JOIN plan_shares ON plans.id = plan_shares.plan_id ' +
      'WHERE plans.id = $1 AND plan_shares.share_uuid = $2',
    [id, req.headers['x-share-uuid'] as string]
  );

  if (sharedPlan.rows.length > 0) {
    res.json(sharedPlan.rows[0]);
    return;
  }

  res.status(404).json({ error: 'Plan not found' });
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  const { name, data } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!name) {
    res.status(400).json({ error: 'Plan name is required' });
    return;
  }

  const result = await query(
    'INSERT INTO plans (user_id, name, data_json) VALUES ($1, $2, $3) RETURNING id, name, data_json, created_at',
    [userId, name, data || {}]
  );

  res.status(201).json({ plan: result.rows[0] });
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { name, data, isPublic } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Verify ownership
  const existing = await query('SELECT id, user_id FROM plans WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  if (existing.rows[0].user_id !== userId) {
    res.status(403).json({ error: 'Not authorized to update this plan' });
    return;
  }

  const updated = await query(
    'UPDATE plans SET name = COALESCE($1, name), data_json = COALESCE($2, data_json), is_public = COALESCE($3, is_public), updated_at = NOW() RETURNING id, name, data_json, is_public, updated_at',
    [name, data, isPublic]
  );

  res.json({ plan: updated.rows[0] });
}

export async function deletePlan(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const existing = await query('SELECT id, user_id FROM plans WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  if (existing.rows[0].user_id !== userId) {
    res.status(403).json({ error: 'Not authorized to delete this plan' });
    return;
  }

  await query('DELETE FROM plans WHERE id = $1', [id]);
  res.status(204).send();
}

export async function createShare(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { permissions, expiresAt } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const existing = await query('SELECT id, user_id FROM plans WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  if (existing.rows[0].user_id !== userId) {
    res.status(403).json({ error: 'Not authorized to share this plan' });
    return;
  }

  const shareUUID = generateUUID();
  const result = await query(
    'INSERT INTO plan_shares (plan_id, share_uuid, permissions, expires_at) VALUES ($1, $2, $3, $4) RETURNING id, share_uuid, permissions, expires_at',
    [id, shareUUID, permissions || 'read', expiresAt || null]
  );

  res.status(201).json({ share: result.rows[0] });
}

export async function getPlanByShare(req: Request, res: Response): Promise<void> {
  const { uuid } = req.params;

  const result = await query(
    'SELECT plans.id, plans.name, plans.data_json, plans.is_public, plans.created_at, plans.updated_at, users.email as owner_email ' +
      'FROM plans JOIN plan_shares ON plans.id = plan_shares.plan_id JOIN users ON plans.user_id = users.id ' +
      'WHERE plan_shares.share_uuid = $1 AND (plan_shares.expires_at IS NULL OR plan_shares.expires_at > NOW())',
    [uuid]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Share link not found or expired' });
    return;
  }

  res.json({ plan: result.rows[0] });
}
