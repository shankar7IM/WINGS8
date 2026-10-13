const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { calculateOrderTotal, getProduct } = require('../lib/products');
const { verifyPaymentSignature, verifyWebhookSignature, createRazorpayOrder } = require('../lib/razorpay');
const db = require('../lib/db');

test('Product catalog identifies orderable and in-development devices', () => {
  const tv = getProduct('w8-tv');
  assert.ok(tv);
  assert.equal(tv.isOrderable, true);
  assert.equal(tv.currency, 'INR');

  const miniPc = getProduct('w8-mini-pc');
  assert.ok(miniPc);
  assert.equal(miniPc.isOrderable, false);
});

test('calculateOrderTotal computes verified totals strictly on the server', () => {
  const result = calculateOrderTotal([
    { id: 'w8-tv', qty: 2 },
    { id: 'w8-usb', qty: 1 }
  ]);

  // W8 TV: 999 * 2 = 1998 INR; W8 USB: 499 * 1 = 499 INR; Total = 2497 INR = 249700 paise
  assert.equal(result.totalInINR, 2497);
  assert.equal(result.totalInPaise, 249700);
  assert.equal(result.currency, 'INR');
  assert.equal(result.items.length, 2);
});

test('calculateOrderTotal rejects empty items or unorderable development products', () => {
  assert.throws(() => calculateOrderTotal([]), /Cart cannot be empty/);
  assert.throws(() => calculateOrderTotal([{ id: 'w8-mini-pc', qty: 1 }]), /currently in development/);
  assert.throws(() => calculateOrderTotal([{ id: 'non-existent', qty: 1 }]), /Product not found/);
});

test('Razorpay payment signature verification accepts valid HMAC and rejects forged signatures', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_DA291048123';
  const paymentId = 'pay_9821381249';

  // Generate valid HMAC
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(
    verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
      secret
    }),
    true
  );

  // Forged signature must be rejected
  assert.equal(
    verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: 'forged_tampered_signature_0123456789abcdef0123456789abcdef0123456789',
      secret
    }),
    false
  );
});

test('Razorpay webhook signature verification accepts valid HMAC and rejects tampering', () => {
  const secret = 'webhook_secret_abc';
  const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } });

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  assert.equal(
    verifyWebhookSignature({
      rawBody: payload,
      signature: validSignature,
      secret
    }),
    true
  );

  assert.equal(
    verifyWebhookSignature({
      rawBody: payload,
      signature: 'invalid_sig',
      secret
    }),
    false
  );
});

test('Database persists orders and transitions payment status accurately', () => {
  const customer = {
    name: 'Rohan Sharma',
    email: 'rohan.test@example.com',
    phone: '+91 9876543210',
    address: '42 MG Road',
    city: 'Bengaluru',
    postal: '560001',
    region: 'India'
  };

  const calculation = calculateOrderTotal([{ id: 'w8-tv', qty: 1 }]);
  const order = db.createOrder({
    customer,
    items: calculation.items,
    totalInPaise: calculation.totalInPaise,
    totalInINR: calculation.totalInINR,
    currency: 'INR',
    razorpayOrderId: 'order_test_db_1',
    isSimulated: true
  });

  assert.ok(order.orderRef.startsWith('W8-ORD-'));
  assert.equal(order.status, 'pending_payment');

  // Verify lookup
  const found = db.getOrderByRef(order.orderRef);
  assert.equal(found.customer.email, 'rohan.test@example.com');

  // Verify payment transition
  const paidOrder = db.recordVerifiedPayment({
    orderRef: order.orderRef,
    razorpayPaymentId: 'pay_test_verified_1',
    razorpaySignature: 'sim_sig_test_123'
  });

  assert.equal(paidOrder.status, 'paid');
  assert.equal(paidOrder.payment.razorpayPaymentId, 'pay_test_verified_1');

  // Verify customer tracking lookup
  const tracked = db.findOrderByEmailAndRef(order.orderRef, 'rohan.test@example.com');
  assert.ok(tracked);
  assert.equal(tracked.status, 'paid');
});
