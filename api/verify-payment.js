const { verifyPaymentSignature, getKeySecret } = require('../lib/razorpay');
const { getOrderByRef, recordVerifiedPayment } = require('../lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { orderRef, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDetails } = body || {};

    if (!orderRef || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required payment verification parameters (orderRef, razorpayOrderId, razorpayPaymentId, razorpaySignature).'
      });
    }

    const order = getOrderByRef(orderRef);
    if (!order) {
      return res.status(404).json({ ok: false, error: `Order not found with reference: ${orderRef}` });
    }

    // Verify order ID matches
    if (order.payment.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ ok: false, error: 'Razorpay order ID mismatch with stored order.' });
    }

    // Verify signature
    let isValid = false;
    if (order.payment.isSimulated) {
      // In simulated development mode, signature must match the simulation pattern
      isValid = Boolean(razorpaySignature && (razorpaySignature.startsWith('sim_sig_') || razorpaySignature.length === 64));
    } else {
      isValid = verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });
    }

    if (!isValid) {
      return res.status(400).json({
        ok: false,
        error: 'Payment signature verification failed. Potential payment tampering detected.'
      });
    }

    // Record verified payment in database
    const updatedOrder = recordVerifiedPayment({
      orderRef,
      razorpayPaymentId,
      razorpaySignature,
      paymentDetails: paymentDetails || {}
    });

    return res.status(200).json({
      ok: true,
      message: 'Payment verified and order confirmed successfully.',
      order: {
        orderRef: updatedOrder.orderRef,
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt,
        customer: updatedOrder.customer,
        items: updatedOrder.items,
        pricing: updatedOrder.pricing,
        payment: {
          gateway: 'razorpay',
          razorpayPaymentId: updatedOrder.payment.razorpayPaymentId,
          paidAt: updatedOrder.payment.paidAt
        },
        tracking: updatedOrder.tracking
      }
    });
  } catch (err) {
    console.error('Error in /api/verify-payment:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Payment verification failed.'
    });
  }
};
