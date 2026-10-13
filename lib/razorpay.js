const crypto = require('node:crypto');

/**
 * Razorpay API Integration and Cryptographic Verification Helpers.
 * Handles official order creation, payment signature verification, and webhook signatures.
 */

function getKeyId() {
  return process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
}

function getKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET || '';
}

function getWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET || '';
}

/**
 * Creates a Razorpay order via the official API endpoint.
 * In development or when keys are placeholders, supports test simulation mode.
 * @param {object} params
 * @param {number} params.amountInPaise
 * @param {string} params.currency
 * @param {string} params.receipt
 * @param {object} params.notes
 * @returns {Promise<{ id: string, amount: number, currency: string, receipt: string, status: string }>}
 */
async function createRazorpayOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
  const keyId = getKeyId();
  const keySecret = getKeySecret();

  // If live or test API keys are present, call the official Razorpay endpoint
  if (keyId && keySecret && !keyId.includes('placeholder') && !keySecret.includes('placeholder')) {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: Math.round(amountInPaise),
        currency: currency.toUpperCase(),
        receipt: receipt.slice(0, 40),
        notes
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errJson;
      try { errJson = JSON.parse(errBody); } catch {}
      const errMsg = errJson?.error?.description || `Razorpay order creation failed with status ${response.status}: ${errBody}`;
      throw new Error(errMsg);
    }

    const orderData = await response.json();
    return {
      id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: orderData.status,
      created_at: orderData.created_at
    };
  }

  // Simulated Test/Sandbox Mode for local automated testing and development without live credentials
  const mockOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
  return {
    id: mockOrderId,
    amount: Math.round(amountInPaise),
    currency: currency.toUpperCase(),
    receipt: receipt.slice(0, 40),
    status: 'created',
    is_simulated: true,
    created_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Verifies the Razorpay payment signature returned after checkout.
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 * @param {object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @param {string} [params.secret]
 * @returns {boolean}
 */
function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature, secret }) {
  const keySecret = secret || getKeySecret();
  if (!keySecret) {
    throw new Error('Razorpay Key Secret is required for payment verification.');
  }
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  // Use timingSafeEqual to avoid timing attack vulnerabilities
  try {
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(razorpaySignature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature using x-razorpay-signature header.
 * Algorithm: HMAC-SHA256(rawRequestBody, webhookSecret)
 * @param {object} params
 * @param {string|Buffer} params.rawBody
 * @param {string} params.signature
 * @param {string} [params.secret]
 * @returns {boolean}
 */
function verifyWebhookSignature({ rawBody, signature, secret }) {
  const webhookSecret = secret || getWebhookSecret();
  if (!webhookSecret) {
    throw new Error('Razorpay Webhook Secret is required for webhook signature verification.');
  }
  if (!rawBody || !signature) {
    return false;
  }

  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyString)
    .digest('hex');

  try {
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = {
  getKeyId,
  getKeySecret,
  getWebhookSecret,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature
};
