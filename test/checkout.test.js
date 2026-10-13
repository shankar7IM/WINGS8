const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCheckout } = require('../script.js');

const valid = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+91 9876543210',
  address: '123 Tech Park',
  city: 'Bengaluru',
  postal: '560001',
  region: 'India'
};

test('accepts a complete checkout order', () => {
  assert.deepEqual(validateCheckout(valid), {});
});

test('flags all empty required checkout fields', () => {
  const errors = validateCheckout({ name: '', email: '', phone: '', address: '', city: '', postal: '', region: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['address', 'city', 'email', 'name', 'phone', 'postal', 'region']);
});

test('rejects malformed checkout emails', () => {
  for (const email of ['invalid', 'jane@', '@domain.com']) {
    assert.ok(validateCheckout({ ...valid, email }).email, `should reject ${email}`);
  }
});
