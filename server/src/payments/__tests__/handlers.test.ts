import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  createOrderHandler,
  verifyPaymentHandler,
  getEntitlementHandler,
  webhookHandler,
} from '../handlers.js';

const RAZORPAY_KEY_SECRET = 'rzp_test_secret';
const RAZORPAY_WEBHOOK_SECRET = 'whsec_test_secret';

vi.hoisted(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_secret';
  process.env.PRO_EXPORT_PRICE_PAISE = '49900';
  process.env.PRO_EXPORT_CURRENCY = 'INR';
  process.env.PRO_EXPORT_TIER = 'pro_export';
  process.env.PRO_EXPORT_DURATION_DAYS = '365';
});

const mockOrdersCreate = vi.fn();
vi.mock('../razorpay.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    getRazorpay: () => ({
      orders: { create: mockOrdersCreate },
    }),
    getRazorpayKeyId: () => 'rzp_test_key',
    getRazorpayKeySecret: () => RAZORPAY_KEY_SECRET,
  };
});

vi.mock('../db.js', () => ({
  createPaymentRecord: vi.fn(),
  markPaymentPaid: vi.fn(),
  getPaymentByOrderId: vi.fn(),
  upsertEntitlement: vi.fn(),
  getEntitlement: vi.fn(),
  recordWebhookEvent: vi.fn(),
}));

import {
  createPaymentRecord,
  markPaymentPaid,
  getPaymentByOrderId,
  upsertEntitlement,
  getEntitlement,
  recordWebhookEvent,
} from '../db.js';

function createMockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createAuthReq(body?: unknown, userId = '11111111-1111-1111-1111-111111111111'): Request {
  return {
    headers: {},
    body,
    user: { id: userId, email: 'test@example.com' },
  } as unknown as Request;
}

function signatureFor(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function webhookSignature(payload: unknown): string {
  const body = JSON.stringify(payload);
  return crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
}

describe('createOrderHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    const req = { headers: {}, body: {} } as Request;
    const res = createMockRes();

    await createOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('creates a Razorpay order and returns checkout details', async () => {
    const orderId = 'order_123';
    mockOrdersCreate.mockResolvedValueOnce({ id: orderId });
    vi.mocked(createPaymentRecord).mockResolvedValueOnce({
      id: 'pay-row-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      razorpay_order_id: orderId,
      razorpay_payment_id: null,
      razorpay_signature: null,
      amount_paise: 49900,
      currency: 'INR',
      status: 'created',
      tier: 'pro_export',
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const req = createAuthReq();
    const res = createMockRes();

    await createOrderHandler(req, res);

    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 49900,
        currency: 'INR',
        notes: { tier: 'pro_export', user_id: '11111111-1111-1111-1111-111111111111' },
      })
    );
    expect(createPaymentRecord).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order_123',
        amount: 49900,
        currency: 'INR',
        keyId: 'rzp_test_key',
        tier: 'pro_export',
      })
    );
  });

  it('returns 500 when Razorpay is not configured', async () => {
    vi.mocked(createPaymentRecord).mockReset();
    mockOrdersCreate.mockRejectedValueOnce(new Error('Razorpay keys are not configured'));

    const req = createAuthReq();
    const res = createMockRes();

    await createOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Razorpay keys are not configured' });
  });
});

describe('verifyPaymentHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when required fields are missing', async () => {
    const req = createAuthReq({});
    const res = createMockRes();

    await verifyPaymentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the signature is invalid', async () => {
    const req = createAuthReq({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'bad-signature',
    });
    const res = createMockRes();

    await verifyPaymentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payment signature' });
  });

  it('verifies a valid signature and grants the entitlement', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    const sig = signatureFor(orderId, paymentId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    vi.mocked(markPaymentPaid).mockResolvedValueOnce({
      id: 'pay-row-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
      amount_paise: 49900,
      currency: 'INR',
      status: 'paid',
      tier: 'pro_export',
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(upsertEntitlement).mockResolvedValueOnce({
      id: 'ent-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      tier: 'pro_export',
      source: 'razorpay',
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const req = createAuthReq({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
    });
    const res = createMockRes();

    await verifyPaymentHandler(req, res);

    expect(markPaymentPaid).toHaveBeenCalledWith(orderId, paymentId, sig);
    expect(upsertEntitlement).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        tier: 'pro_export',
      })
    );
  });

  it('returns 403 when the order belongs to another user', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    const sig = signatureFor(orderId, paymentId);

    vi.mocked(markPaymentPaid).mockResolvedValueOnce({
      id: 'pay-row-1',
      user_id: '99999999-9999-9999-9999-999999999999',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
      amount_paise: 49900,
      currency: 'INR',
      status: 'paid',
      tier: 'pro_export',
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const req = createAuthReq({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
    });
    const res = createMockRes();

    await verifyPaymentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('getEntitlementHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns free tier when no entitlement exists', async () => {
    vi.mocked(getEntitlement).mockResolvedValueOnce(null);

    const req = createAuthReq();
    const res = createMockRes();

    await getEntitlementHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ tier: 'free', expiresAt: null, isActive: false });
  });

  it('returns active pro tier when entitlement is valid', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 100);
    vi.mocked(getEntitlement).mockResolvedValueOnce({
      id: 'ent-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      tier: 'pro_export',
      source: 'razorpay',
      expires_at: future.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const req = createAuthReq();
    const res = createMockRes();

    await getEntitlementHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'pro_export',
        isActive: true,
      })
    );
  });
});

describe('webhookHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when the signature is missing', async () => {
    const req = { headers: {}, body: {} } as Request;
    const res = createMockRes();

    await webhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature' });
  });

  it('returns 400 when the signature is invalid', async () => {
    const payload = { id: 'evt_1', event: 'payment.captured' };
    const req = {
      headers: { 'x-razorpay-signature': 'bad-sig' },
      body: Buffer.from(JSON.stringify(payload)),
    } as unknown as Request;
    const res = createMockRes();

    await webhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid webhook signature' });
  });

  it('processes a payment.captured webhook and grants entitlement', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    const payload = {
      id: 'evt_2',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: { id: paymentId, order_id: orderId, status: 'captured' },
        },
      },
    };
    const sig = webhookSignature(payload);

    vi.mocked(recordWebhookEvent).mockResolvedValueOnce(true);
    vi.mocked(getPaymentByOrderId).mockResolvedValueOnce({
      id: 'pay-row-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      razorpay_order_id: orderId,
      razorpay_payment_id: null,
      razorpay_signature: null,
      amount_paise: 49900,
      currency: 'INR',
      status: 'created',
      tier: 'pro_export',
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(markPaymentPaid).mockResolvedValueOnce({
      id: 'pay-row-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
      amount_paise: 49900,
      currency: 'INR',
      status: 'paid',
      tier: 'pro_export',
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(upsertEntitlement).mockResolvedValueOnce({
      id: 'ent-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      tier: 'pro_export',
      source: 'razorpay_webhook',
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const req = {
      headers: { 'x-razorpay-signature': sig },
      body: Buffer.from(JSON.stringify(payload)),
    } as unknown as Request;
    const res = createMockRes();

    await webhookHandler(req, res);

    expect(recordWebhookEvent).toHaveBeenCalledWith(
      'evt_2',
      'razorpay',
      'payment.captured',
      payload
    );
    expect(getPaymentByOrderId).toHaveBeenCalledWith(orderId);
    expect(markPaymentPaid).toHaveBeenCalledWith(orderId, paymentId, sig);
    expect(upsertEntitlement).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true, processed: true });
  });
});
