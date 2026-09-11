import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentAndRenew, verifyPaymentByPaymentId } from '@/actions/subscription';
import { cookies } from 'next/headers';
import { getRazorpayClient } from '@/lib/razorpay';
import { getAppBaseUrl } from '@/lib/utils';

/**
 * Handle POST redirect callbacks from Razorpay checkout.
 * Prevents 405 Method Not Allowed errors when mobile browsers/UPI apps POST to the application.
 */
export async function POST(req: NextRequest) {
  const baseUrl = getAppBaseUrl();

  try {
    let paymentId = '';
    let orderId = '';
    let signature = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      paymentId = (formData.get('razorpay_payment_id') as string) || '';
      orderId = (formData.get('razorpay_order_id') as string) || '';
      signature = (formData.get('razorpay_signature') as string) || '';
    } else {
      const json = await req.json().catch(() => ({}));
      paymentId = json.razorpay_payment_id || '';
      orderId = json.razorpay_order_id || '';
      signature = json.razorpay_signature || '';
    }

    if (!paymentId) {
      return NextResponse.redirect(`${baseUrl}/owner/subscription?error=missing_payment_id`, 303);
    }

    // Determine shop ID from cookies or order notes
    const cookieStore = cookies();
    let shopId = cookieStore.get('dynish_shop_id')?.value;

    if (!shopId && orderId) {
      try {
        const razorpay = getRazorpayClient();
        const order = await razorpay.orders.fetch(orderId);
        shopId = (order.notes as any)?.shop_id;
      } catch (e) {}
    }

    if (shopId) {
      // Auto verify and activate
      await verifyPaymentByPaymentId(shopId, paymentId);
      return NextResponse.redirect(`${baseUrl}/owner/subscription?payment=success&id=${paymentId}`, 303);
    }

    return NextResponse.redirect(`${baseUrl}/owner/subscription?payment_id=${paymentId}&status=unverified`, 303);
  } catch (err: any) {
    console.error('Razorpay callback route error:', err);
    return NextResponse.redirect(`${baseUrl}/owner/subscription?error=callback_failed`, 303);
  }
}
