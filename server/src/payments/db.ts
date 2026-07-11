import { query } from '../db/connection.js';

export interface PaymentRow {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount_paise: number;
  currency: string;
  status: string;
  tier: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntitlementRow {
  id: string;
  user_id: string;
  tier: string;
  source: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPaymentRecord(
  userId: string,
  razorpayOrderId: string,
  amountPaise: number,
  currency: string,
  tier: string,
  expiresAt: Date
): Promise<PaymentRow> {
  const result = await query<PaymentRow>(
    `INSERT INTO public.payments
       (user_id, razorpay_order_id, amount_paise, currency, status, tier, expires_at)
     VALUES ($1, $2, $3, $4, 'created', $5, $6)
     ON CONFLICT (user_id, razorpay_order_id) DO UPDATE SET
       updated_at = NOW()
     RETURNING *`,
    [userId, razorpayOrderId, amountPaise, currency, tier, expiresAt.toISOString()]
  );
  return result.rows[0];
}

export async function markPaymentPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<PaymentRow | null> {
  const result = await query<PaymentRow>(
    `UPDATE public.payments
     SET status = 'paid',
         razorpay_payment_id = $2,
         razorpay_signature = $3,
         updated_at = NOW()
     WHERE razorpay_order_id = $1
     RETURNING *`,
    [razorpayOrderId, razorpayPaymentId, razorpaySignature]
  );
  return result.rows[0] || null;
}

export async function getPaymentByOrderId(razorpayOrderId: string): Promise<PaymentRow | null> {
  const result = await query<PaymentRow>(
    'SELECT * FROM public.payments WHERE razorpay_order_id = $1',
    [razorpayOrderId]
  );
  return result.rows[0] || null;
}

export async function upsertEntitlement(
  userId: string,
  tier: string,
  source: string,
  expiresAt: Date
): Promise<EntitlementRow> {
  const result = await query<EntitlementRow>(
    `INSERT INTO public.user_entitlements
       (user_id, tier, source, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       source = EXCLUDED.source,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING *`,
    [userId, tier, source, expiresAt.toISOString()]
  );
  return result.rows[0];
}

export async function getEntitlement(userId: string): Promise<EntitlementRow | null> {
  const result = await query<EntitlementRow>(
    'SELECT * FROM public.user_entitlements WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function recordWebhookEvent(
  eventId: string,
  source: string,
  eventType: string | undefined,
  payload: unknown
): Promise<boolean> {
  try {
    await query(
      `INSERT INTO public.webhook_events (event_id, source, event_type, payload, processed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, source, eventType || null, JSON.stringify(payload || {})]
    );
    return true;
  } catch (error) {
    console.error('[payments] Failed to record webhook event:', error);
    return false;
  }
}
