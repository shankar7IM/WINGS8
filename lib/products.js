/**
 * WINGS8 Official Product Catalog & Server-Side Pricing Verification.
 * Prices and ordering eligibility are strictly enforced on the server.
 */

const PRODUCTS = {
  'w8-tv': {
    id: 'w8-tv',
    name: 'W8 TV',
    subtitle: 'HDMI stick that turns any smart TV into a personal computer',
    type: 'hardware',
    isOrderable: true,
    priceInPaise: 99900,
    priceInINR: 999,
    depositAmountInPaise: 99900,
    depositAmountInINR: 999,
    currency: 'INR',
    retailPricingNote: 'Full retail pricing confirmed prior to Q4 2026 launch in India',
    includes: ['W8 TV HDMI Stick', 'Wireless keyboard with integrated trackpad', 'Power cable & adapter', 'W8 OS Lifetime Licence (Hardware-bound)']
  },
  'w8-usb': {
    id: 'w8-usb',
    name: 'W8 USB',
    subtitle: 'One-time installation of W8 OS on any PC',
    type: 'hardware',
    isOrderable: true,
    priceInPaise: 49900,
    priceInINR: 499,
    depositAmountInPaise: 49900,
    depositAmountInINR: 499,
    currency: 'INR',
    retailPricingNote: 'Full retail pricing confirmed prior to Q4 2026 launch in India',
    includes: ['W8 USB Drive (Silver USB-A)', '3-step automated installer', 'Hardware-bound W8 OS licence key']
  },
  'w8-mini-pc': {
    id: 'w8-mini-pc',
    name: 'W8 Mini PC / Laptop',
    subtitle: 'Minimum-spec machines built to run W8 OS at the lowest cost',
    type: 'hardware',
    isOrderable: false,
    status: 'In Hardware Development',
    currency: 'INR',
    retailPricingNote: 'Awaiting commercial manufacturing rollout'
  },
  'ar-glasses-projector': {
    id: 'ar-glasses-projector',
    name: 'AR Glasses & Surface Projector',
    subtitle: 'Augmented reality display glasses and surface projection for W8 OS',
    type: 'r_and_d',
    isOrderable: false,
    status: 'In R&D',
    currency: 'INR',
    retailPricingNote: 'Next-generation R&D pipeline'
  },
  'w8-key': {
    id: 'w8-key',
    name: 'W8 Key',
    subtitle: 'Autonomous portable device, plug & play on any PC built since 2010',
    type: 'r_and_d',
    isOrderable: false,
    status: 'R&D · Planned 2027',
    currency: 'INR',
    retailPricingNote: 'Release planned for 2027'
  }
};

function getProduct(productId) {
  return PRODUCTS[productId] || null;
}

function getAllProducts() {
  return Object.values(PRODUCTS);
}

/**
 * Validates and calculates order totals strictly on the server.
 * Never trust quantities, prices, or product totals sent from browser!
 * @param {Array<{id: string, qty: number}>} items
 * @returns {{ items: Array, totalInPaise: number, totalInINR: number, currency: string }}
 */
function calculateOrderTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart cannot be empty for checkout.');
  }

  let totalInPaise = 0;
  const verifiedItems = [];

  for (const item of items) {
    if (!item || typeof item.id !== 'string') {
      throw new Error('Invalid item in order request.');
    }

    const product = getProduct(item.id);
    if (!product) {
      throw new Error(`Product not found: ${item.id}`);
    }

    if (!product.isOrderable) {
      throw new Error(`Product "${product.name}" is currently in development and cannot be ordered.`);
    }

    const qty = parseInt(item.qty, 10);
    if (isNaN(qty) || qty < 1 || qty > 99) {
      throw new Error(`Invalid quantity for "${product.name}". Must be between 1 and 99.`);
    }

    const itemTotalInPaise = product.depositAmountInPaise * qty;
    totalInPaise += itemTotalInPaise;

    verifiedItems.push({
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      qty,
      unitDepositInPaise: product.depositAmountInPaise,
      unitDepositInINR: product.depositAmountInINR,
      itemTotalInPaise,
      itemTotalInINR: itemTotalInPaise / 100,
      currency: product.currency
    });
  }

  return {
    items: verifiedItems,
    totalInPaise,
    totalInINR: totalInPaise / 100,
    currency: 'INR'
  };
}

module.exports = {
  PRODUCTS,
  getProduct,
  getAllProducts,
  calculateOrderTotal
};
