export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  tier: string;
  expiresAt: string;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { email?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayClass {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayClass;
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

export function openRazorpayCheckout(
  order: RazorpayOrder,
  email: string | undefined,
  onSuccess: (response: RazorpayResponse) => void,
  onDismiss?: () => void
): void {
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout script is not loaded');
  }

  const razorpay = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: 'VastuPlan 2D',
    description: 'Pro Export Pack',
    prefill: email ? { email } : undefined,
    handler: onSuccess,
    modal: onDismiss ? { ondismiss: onDismiss } : undefined,
  });

  razorpay.open();
}
