const { listOrders, updateOrderStatus, getOrderByRef } = require('../lib/db');

function isAuthorized(req) {
  const expectedKey = process.env.ADMIN_API_KEY || 'wings8_dev_admin_2026';
  const providedKey = req.headers['x-admin-key'] || req.query?.adminKey;
  return providedKey === expectedKey;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized. Provide valid x-admin-key header.' });
  }

  if (req.method === 'GET') {
    const orders = listOrders();
    const summary = {
      total: orders.length,
      paid: orders.filter((o) => o.status === 'paid').length,
      pending: orders.filter((o) => o.status === 'pending_payment').length,
      processing: orders.filter((o) => o.status === 'processing').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length
    };
    return res.status(200).json({ ok: true, summary, orders });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { orderRef, status, note, trackingNumber, carrier } = body || {};

    if (!orderRef || !status) {
      return res.status(400).json({ ok: false, error: 'orderRef and status are required.' });
    }

    try {
      const updated = updateOrderStatus({
        orderRef,
        status,
        note,
        trackingNumber,
        carrier
      });
      return res.status(200).json({ ok: true, order: updated });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed.' });
};
