import { Request, Response, Router } from 'express';
import { register, login, logout, refreshToken, getProfile } from './auth.js';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  createShare,
  getPlanByShare,
} from './plans.js';
import { queueChange, syncChanges, getSyncStatus } from './sync.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', authenticate, logout);
router.post('/auth/refresh', refreshToken);
router.get('/auth/profile', authenticate, getProfile);

// Plan routes
router.get('/plans', authenticate, getPlans);
router.get('/plans/:id', authenticate, getPlan);
router.post('/plans', authenticate, createPlan);
router.put('/plans/:id', authenticate, updatePlan);
router.delete('/plans/:id', authenticate, deletePlan);
router.post('/plans/:id/share', authenticate, createShare);

// Share routes
router.get('/share/:uuid', getPlanByShare);

// Sync routes
router.post('/sync/queue', authenticate, queueChange);
router.post('/sync/batch', authenticate, syncChanges);
router.get('/sync/status', authenticate, getSyncStatus);

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
