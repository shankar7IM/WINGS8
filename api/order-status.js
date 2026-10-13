const { findOrderByEmailAndRef, getOrderByRef } = require('../lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use GET.' });
  }

  const { orderRef, email } = req.query || {};

  if (!orderRef || typeof orderRef !== 'string') {
    return res.status(400).json({ ok: false, error: 'orderRef parameter is required.' });
  }

  let order = null;
  if (email && typeof email === 'string') {
    order = findOrderByEmailAndRef(orderRef, email);
  } else {
    order = getOrderByRef(orderRef.trim());
  }

  if (!order) {
    return res.status(404).json({
      ok: false,
      error: 'Order not found. Please verify the order reference and customer email.'
    });
  }

  // Return sanitized customer tracking view (do not expose internal cryptographic secrets)
  return res.status(200).json({
    ok: true,
    order: {
      orderRef: order.orderRef,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: {
        name: order.customer.name,
        city: order.customer.city,
        region: order.customer.region
      },
      items: order.items,
      pricing: order.pricing,
      payment: {
        status: order.status === 'paid' ? 'Paid & Verified' : order.status,
        paidAt: order.payment?.paidAt || null,
        method: order.payment?.method || 'Razorpay'
      },
      tracking: order.tracking,
      statusHistory: order.statusHistory
    }
  });
};
