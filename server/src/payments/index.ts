import { Router } from 'express';
import { requireSupabaseAuth } from '../middleware/supabaseAuth.js';
import {
  createOrderHandler,
  verifyPaymentHandler,
  getEntitlementHandler,
  webhookHandler,
} from './handlers.js';

const router = Router();

router.post('/create-order', requireSupabaseAuth as any, createOrderHandler);
router.post('/verify', requireSupabaseAuth as any, verifyPaymentHandler);
router.get('/entitlement', requireSupabaseAuth as any, getEntitlementHandler);
router.post('/webhook', webhookHandler);

export default router;
