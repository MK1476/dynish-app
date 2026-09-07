import Razorpay from 'razorpay';
import crypto from 'crypto';

export function getRazorpayClient() {
  const envKey = process.env.RAZORPAY_KEY_ID?.trim();
  const envPublicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();

  // Prefer live key if available, otherwise any provided key
  const keyId = (envKey?.startsWith('rzp_live') ? envKey : null) ||
    (envPublicKey?.startsWith('rzp_live') ? envPublicKey : null) ||
    envKey ||
    envPublicKey;

  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error('Missing Razorpay credentials. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
}
