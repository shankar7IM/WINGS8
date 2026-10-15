const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'orders.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readAllOrders() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading orders DB file:', err);
    return [];
  }
}

function saveAllOrders(orders) {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(orders, null, 2), 'utf8');
  try {
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      fs.copyFileSync(tmpFile, DB_FILE);
      try { fs.unlinkSync(tmpFile); } catch {}
    } else {
      throw err;
    }
  }
}

/**
 * Creates and persists a new order in pending_payment state.
 */
function createOrder({ customer, items, totalInPaise, totalInINR, currency = 'INR', razorpayOrderId, isSimulated = false }) {
  const orders = readAllOrders();
  const timestamp = Date.now();
  const orderRef = `W8-ORD-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    orderRef,
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: {
      name: customer.name,
      email: customer.email.toLowerCase().trim(),
      phone: customer.phone.trim(),
      organisation: customer.organisation ? customer.organisation.trim() : '',
      address: customer.address.trim(),
      city: customer.city.trim(),
      postal: customer.postal.trim(),
      region: customer.region ? customer.region.trim() : 'India'
    },
    items,
    pricing: {
      totalInPaise,
      totalInINR,
      currency
    },
    payment: {
      gateway: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId: null,
      razorpaySignature: null,
      isSimulated: Boolean(isSimulated),
      paidAt: null
    },
    tracking: {
      stage: 'Order Placed',
      carrier: null,
      trackingNumber: null,
      estimatedDispatch: 'Q4 2026 (Commercial Launch Batch)',
      notes: 'Launch reservation allocation confirmed.'
    },
    statusHistory: [
      {
        status: 'pending_payment',
        timestamp: new Date().toISOString(),
        note: 'Order created, awaiting customer payment.'
      }
    ]
  };

  orders.push(newOrder);
  saveAllOrders(orders);
  return newOrder;
}

function getOrderByRef(orderRef) {
  const orders = readAllOrders();
  return orders.find((o) => o.orderRef === orderRef) || null;
}

function getOrderByRazorpayOrderId(razorpayOrderId) {
  const orders = readAllOrders();
  return orders.find((o) => o.payment && o.payment.razorpayOrderId === razorpayOrderId) || null;
}

function findOrderByEmailAndRef(orderRef, email) {
  const orders = readAllOrders();
  const cleanRef = (orderRef || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  return orders.find((o) => o.orderRef === cleanRef && o.customer.email === cleanEmail) || null;
}

/**
 * Updates order payment state upon verified payment completion.
 */
function recordVerifiedPayment({ orderRef, razorpayPaymentId, razorpaySignature, paymentDetails = {} }) {
  const orders = readAllOrders();
  const idx = orders.findIndex((o) => o.orderRef === orderRef);
  if (idx === -1) {
    throw new Error(`Order not found: ${orderRef}`);
  }

  const order = orders[idx];

  // Idempotency: if already paid with same payment ID, return without error
  if (order.status === 'paid' && order.payment.razorpayPaymentId === razorpayPaymentId) {
    return order;
  }

  order.status = 'paid';
  order.updatedAt = new Date().toISOString();
  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.razorpaySignature = razorpaySignature;
  order.payment.paidAt = new Date().toISOString();
  order.payment.method = paymentDetails.method || 'upi_card';
  order.payment.details = paymentDetails;

  order.tracking.stage = 'Payment Verified';
  order.tracking.notes = 'Launch allocation reserved. Our distribution team will contact you prior to shipment in Q4 2026.';

  order.statusHistory.push({
    status: 'paid',
    timestamp: new Date().toISOString(),
    note: `Payment verified via Razorpay (${razorpayPaymentId}).`
  });

  orders[idx] = order;
  saveAllOrders(orders);
  return order;
}

/**
 * Updates status (e.g. processing, shipped, delivered, cancelled)
 */
function updateOrderStatus({ orderRef, status, note, trackingNumber, carrier }) {
  const orders = readAllOrders();
  const idx = orders.findIndex((o) => o.orderRef === orderRef);
  if (idx === -1) {
    throw new Error(`Order not found: ${orderRef}`);
  }

  const order = orders[idx];
  order.status = status;
  order.updatedAt = new Date().toISOString();

  if (trackingNumber) order.tracking.trackingNumber = trackingNumber;
  if (carrier) order.tracking.carrier = carrier;
  if (note) order.tracking.notes = note;

  order.statusHistory.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Status updated to ${status}.`
  });

  orders[idx] = order;
  saveAllOrders(orders);
  return order;
}

function listOrders() {
  return readAllOrders();
}

module.exports = {
  createOrder,
  getOrderByRef,
  getOrderByRazorpayOrderId,
  findOrderByEmailAndRef,
  recordVerifiedPayment,
  updateOrderStatus,
  listOrders
};
