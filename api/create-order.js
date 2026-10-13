const { calculateOrderTotal } = require('../lib/products');
const { createRazorpayOrder, getKeyId } = require('../lib/razorpay');
const { createOrder } = require('../lib/db');

module.exports = async function handler(req, res) {
  // Support CORS
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
    const { customer, items } = body || {};

    if (!customer || typeof customer !== 'object') {
      return res.status(400).json({ ok: false, error: 'Customer details are required.' });
    }

    // Required fields check
    const required = ['name', 'email', 'phone', 'address', 'city', 'postal'];
    for (const field of required) {
      if (!customer[field] || typeof customer[field] !== 'string' || !customer[field].trim()) {
        return res.status(400).json({ ok: false, error: `Customer field "${field}" is required.` });
      }
    }

    // Calculate verified totals on server (Never trust client prices)
    const calculation = calculateOrderTotal(items);

    // Create Razorpay Order
    const receipt = `rcpt_${Date.now()}`;
    const rzOrder = await createRazorpayOrder({
      amountInPaise: calculation.totalInPaise,
      currency: calculation.currency,
      receipt,
      notes: {
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        region: customer.region || 'India'
      }
    });

    // Save order in database
    const savedOrder = createOrder({
      customer,
      items: calculation.items,
      totalInPaise: calculation.totalInPaise,
      totalInINR: calculation.totalInINR,
      currency: calculation.currency,
      razorpayOrderId: rzOrder.id,
      isSimulated: rzOrder.is_simulated
    });

    return res.status(200).json({
      ok: true,
      orderRef: savedOrder.orderRef,
      razorpayOrderId: rzOrder.id,
      amountInPaise: rzOrder.amount,
      amountInINR: calculation.totalInINR,
      currency: calculation.currency,
      keyId: getKeyId(),
      isSimulated: Boolean(rzOrder.is_simulated),
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (err) {
    console.error('Error in /api/create-order:', err);
    return res.status(400).json({
      ok: false,
      error: err.message || 'Failed to process order creation.'
    });
  }
};
