import { Request, Response } from 'express';
import { query } from '../db/connection.js';

export async function queueChange(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { planId, operation, data } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Verify plan ownership
  const existing = await query('SELECT id, user_id FROM plans WHERE id = $1', [planId]);
  if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
    res.status(403).json({ error: 'Not authorized for this plan' });
    return;
  }

  const result = await query(
    'INSERT INTO sync_queue (plan_id, operation, data_json) VALUES ($1, $2, $3) RETURNING id, created_at',
    [planId, operation, data]
  );

  res.status(201).json({ queued: result.rows[0] });
}

export async function syncChanges(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { planId, changes } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Verify plan ownership
  const existing = await query('SELECT id, user_id FROM plans WHERE id = $1', [planId]);
  if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
    res.status(403).json({ error: 'Not authorized for this plan' });
    return;
  }

  // Mark all changes as synced
  await query(
    'UPDATE sync_queue SET synced = TRUE WHERE plan_id = $1 AND synced = FALSE AND id = ANY($2::uuid[])',
    [planId, changes.map((c: any) => c.id)]
  );

  // Update plan data
  if (changes.length > 0) {
    const latestChange = changes[changes.length - 1];
    await query(
      'UPDATE plans SET data_json = $1, updated_at = NOW() WHERE id = $2',
      [latestChange.data, planId]
    );
  }

  res.json({ synced: changes.length });
}

export async function getSyncStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await query(
    'SELECT plan_id, COUNT(*) as pending, MAX(created_at) as last_change FROM sync_queue WHERE synced = FALSE GROUP BY plan_id',
    []
  );

  res.json({ pendingSyncs: result.rows });
}
