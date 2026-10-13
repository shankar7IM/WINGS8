const { verifyWebhookSignature, getWebhookSecret } = require('../lib/razorpay');
const { getOrderByRazorpayOrderId, recordVerifiedPayment, updateOrderStatus } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = getWebhookSecret();

  // If a webhook secret is configured, strictly enforce signature verification
  if (webhookSecret) {
    if (!signature) {
      return res.status(400).json({ ok: false, error: 'Missing x-razorpay-signature header.' });
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const isValid = verifyWebhookSignature({ rawBody, signature, secret: webhookSecret });
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed.');
      return res.status(400).json({ ok: false, error: 'Invalid webhook signature.' });
    }
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (!razorpayOrderId) {
      return res.status(200).json({ status: 'ignored', reason: 'No order ID in webhook payload.' });
    }

    const order = getOrderByRazorpayOrderId(razorpayOrderId);
    if (!order) {
      // Order might belong to another system or test
      return res.status(200).json({ status: 'ignored', reason: 'Order not found in Wings8 database.' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentId = paymentEntity?.id || `pay_${Date.now()}`;
      recordVerifiedPayment({
        orderRef: order.orderRef,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature || 'verified_via_webhook',
        paymentDetails: {
          method: paymentEntity?.method || 'webhook_captured',
          amount: paymentEntity?.amount,
          email: paymentEntity?.email,
          contact: paymentEntity?.contact
        }
      });
      console.log(`Order ${order.orderRef} marked as PAID via webhook event: ${event}`);
    } else if (event === 'payment.failed') {
      updateOrderStatus({
        orderRef: order.orderRef,
        status: 'failed',
        note: `Payment failed: ${paymentEntity?.error_description || 'Transaction unsuccessful'}`
      });
      console.log(`Order ${order.orderRef} marked as FAILED via webhook event: ${event}`);
    }

    return res.status(200).json({ status: 'ok', processed: event });
  } catch (err) {
    console.error('Error handling Razorpay webhook:', err);
    return res.status(500).json({ ok: false, error: 'Webhook processing error.' });
  }
};
