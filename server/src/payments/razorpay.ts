import Razorpay from 'razorpay';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export const PRO_EXPORT_PRICE_PAISE = Number(process.env.PRO_EXPORT_PRICE_PAISE || '49900');
export const PRO_EXPORT_CURRENCY = process.env.PRO_EXPORT_CURRENCY || 'INR';
export const PRO_EXPORT_TIER = process.env.PRO_EXPORT_TIER || 'pro_export';
export const PRO_EXPORT_DURATION_DAYS = Number(process.env.PRO_EXPORT_DURATION_DAYS || '365');

export function getRazorpay(): Razorpay {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured');
  }
  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID;
}

export function getRazorpayKeySecret(): string {
  return RAZORPAY_KEY_SECRET;
}
