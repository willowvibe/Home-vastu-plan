import { Request, Response } from 'express';
import crypto from 'crypto';
import { SupabaseAuthRequest } from '../middleware/supabaseAuth.js';
import {
  getRazorpay,
  getRazorpayKeyId,
  getRazorpayKeySecret,
  PRO_EXPORT_PRICE_PAISE,
  PRO_EXPORT_CURRENCY,
  PRO_EXPORT_TIER,
  PRO_EXPORT_DURATION_DAYS,
} from './razorpay.js';
import {
  createPaymentRecord,
  getPaymentByOrderId,
  markPaymentPaid,
  upsertEntitlement,
  getEntitlement,
  recordWebhookEvent,
} from './db.js';

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

function computeExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PRO_EXPORT_DURATION_DAYS);
  return expiresAt;
}

function getUserId(req: Request): string | undefined {
  return (req as SupabaseAuthRequest).user?.id;
}

export async function createOrderHandler(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const razorpay = getRazorpay();
    const receipt = `pro_export_${userId.slice(0, 8)}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: PRO_EXPORT_PRICE_PAISE,
      currency: PRO_EXPORT_CURRENCY,
      receipt,
      notes: {
        tier: PRO_EXPORT_TIER,
        user_id: userId,
      },
    });

    const expiresAt = computeExpiryDate();
    await createPaymentRecord(
      userId,
      order.id,
      PRO_EXPORT_PRICE_PAISE,
      PRO_EXPORT_CURRENCY,
      PRO_EXPORT_TIER,
      expiresAt
    );

    res.json({
      orderId: order.id,
      amount: PRO_EXPORT_PRICE_PAISE,
      currency: PRO_EXPORT_CURRENCY,
      keyId: getRazorpayKeyId(),
      tier: PRO_EXPORT_TIER,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[payments] create-order error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    res.status(500).json({ error: message });
  }
}

export async function verifyPaymentHandler(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    res
      .status(400)
      .json({ error: 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required' });
    return;
  }

  const secret = getRazorpayKeySecret();
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expected.length !== razorpaySignature.length) {
    res.status(400).json({ error: 'Invalid payment signature' });
    return;
  }
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature))) {
    res.status(400).json({ error: 'Invalid payment signature' });
    return;
  }

  const payment = await markPaymentPaid(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!payment) {
    res.status(404).json({ error: 'Payment order not found' });
    return;
  }
  if (payment.user_id !== userId) {
    res.status(403).json({ error: 'Order does not belong to the authenticated user' });
    return;
  }

  const entitlement = await upsertEntitlement(
    userId,
    PRO_EXPORT_TIER,
    'razorpay',
    new Date(payment.expires_at || computeExpiryDate())
  );

  res.json({
    success: true,
    tier: entitlement.tier,
    expiresAt: entitlement.expires_at,
  });
}

export async function getEntitlementHandler(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const row = await getEntitlement(userId);
  const now = new Date();
  const isActive =
    !!row && row.tier !== 'free' && (!row.expires_at || new Date(row.expires_at) > now);

  res.json({
    tier: row?.tier || 'free',
    expiresAt: row?.expires_at || null,
    isActive,
  });
}

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error('[payments] RAZORPAY_WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  if (!signature) {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expected.length !== signature.length) {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  const payload = JSON.parse(rawBody);
  const eventId = payload?.id as string | undefined;
  const eventType = payload?.event as string | undefined;

  if (!eventId) {
    res.status(400).json({ error: 'Missing event id' });
    return;
  }

  const recorded = await recordWebhookEvent(eventId, 'razorpay', eventType, payload);
  if (!recorded) {
    res.status(200).json({ received: true, processed: false });
    return;
  }

  let orderId: string | undefined;
  let paymentId: string | undefined;
  let status: string | undefined;

  if (eventType === 'payment.captured' && payload.payload?.payment?.entity) {
    const entity = payload.payload.payment.entity;
    orderId = entity.order_id;
    paymentId = entity.id;
    status = entity.status;
  } else if (eventType === 'order.paid' && payload.payload?.order?.entity) {
    const entity = payload.payload.order.entity;
    orderId = entity.id;
    paymentId = entity.payment_id || payload.payload?.payment?.entity?.id;
    status = entity.status;
  }

  if (orderId && paymentId && status === 'captured') {
    const payment = await getPaymentByOrderId(orderId);
    if (payment) {
      await markPaymentPaid(orderId, paymentId, signature);
      await upsertEntitlement(
        payment.user_id,
        payment.tier,
        'razorpay_webhook',
        new Date(payment.expires_at || computeExpiryDate())
      );
    }
  }

  res.status(200).json({ received: true, processed: true });
}
