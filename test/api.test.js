const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const createOrderHandler = require('../api/create-order');
const verifyPaymentHandler = require('../api/verify-payment');
const orderStatusHandler = require('../api/order-status');
const webhookHandler = require('../api/webhook');
const adminOrdersHandler = require('../api/admin-orders');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.data = obj; return this; },
    end() { return this; }
  };
  return res;
}

test('POST /api/create-order creates an order with server-calculated price and returns order details', async () => {
  const req = {
    method: 'POST',
    body: {
      customer: {
        name: 'Priya Patel',
        email: 'priya@example.com',
        phone: '+91 9123456789',
        address: '10 Marine Drive',
        city: 'Mumbai',
        postal: '400020',
        region: 'Maharashtra'
      },
      items: [{ id: 'w8-tv', qty: 1 }]
    }
  };
  const res = createMockRes();

  await createOrderHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.data.ok, true);
  assert.ok(res.data.orderRef.startsWith('W8-ORD-'));
  assert.equal(res.data.amountInINR, 999);
  assert.equal(res.data.currency, 'INR');
});

test('POST /api/create-order validates required customer fields', async () => {
  const req = {
    method: 'POST',
    body: {
      customer: {
        name: '', // missing
        email: 'priya@example.com',
        phone: '+91 9123456789',
        address: '10 Marine Drive',
        city: 'Mumbai',
        postal: '400020'
      },
      items: [{ id: 'w8-tv', qty: 1 }]
    }
  };
  const res = createMockRes();

  await createOrderHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.data.ok, false);
  assert.match(res.data.error, /name/);
});

test('POST /api/verify-payment accepts valid signatures and confirms order', async () => {
  // First create order
  const createReq = {
    method: 'POST',
    body: {
      customer: {
        name: 'Arun Kumar',
        email: 'arun@example.com',
        phone: '+91 9888877777',
        address: '22 Indiranagar',
        city: 'Bengaluru',
        postal: '560038',
        region: 'Karnataka'
      },
      items: [{ id: 'w8-usb', qty: 2 }]
    }
  };
  const createRes = createMockRes();
  await createOrderHandler(createReq, createRes);
  const created = createRes.data;

  // Now verify payment with valid signature
  const verifyReq = {
    method: 'POST',
    body: {
      orderRef: created.orderRef,
      razorpayOrderId: created.razorpayOrderId,
      razorpayPaymentId: 'pay_test_arun_123',
      razorpaySignature: 'sim_sig_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
  };
  const verifyRes = createMockRes();
  await verifyPaymentHandler(verifyReq, verifyRes);

  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.data.ok, true);
  assert.equal(verifyRes.data.order.status, 'paid');

  // Verify lookup via /api/order-status
  const statusReq = {
    method: 'GET',
    query: { orderRef: created.orderRef, email: 'arun@example.com' }
  };
  const statusRes = createMockRes();
  await orderStatusHandler(statusReq, statusRes);

  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.data.ok, true);
  assert.equal(statusRes.data.order.status, 'paid');
  assert.equal(statusRes.data.order.customer.city, 'Bengaluru');
});

test('GET & POST /api/admin-orders authorizes access with admin key and updates status', async () => {
  const getReq = {
    method: 'GET',
    headers: { 'x-admin-key': 'wings8_dev_admin_2026' }
  };
  const getRes = createMockRes();
  await adminOrdersHandler(getReq, getRes);

  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.data.ok, true);
  assert.ok(getRes.data.summary);
  assert.ok(Array.isArray(getRes.data.orders));

  // Reject unauthorized request
  const unauthReq = {
    method: 'GET',
    headers: { 'x-admin-key': 'wrong_key' }
  };
  const unauthRes = createMockRes();
  await adminOrdersHandler(unauthReq, unauthRes);

  assert.equal(unauthRes.statusCode, 401);
});
