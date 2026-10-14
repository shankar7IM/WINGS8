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

test('accepts all 28 Indian States', () => {
  const { INDIAN_STATES } = require('../script.js');
  assert.equal(INDIAN_STATES.length, 28, 'Must include exactly 28 states');

  const expectedStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  assert.deepEqual(INDIAN_STATES, expectedStates, 'States must match exactly and be sorted alphabetically');

  for (const state of INDIAN_STATES) {
    const errors = validateCheckout({ ...valid, region: state });
    assert.equal(errors.region, undefined, `Should accept state: ${state}`);
  }
});

test('accepts all 8 Indian Union Territories including Puducherry, Delhi, Ladakh, and Jammu and Kashmir', () => {
  const { INDIAN_UNION_TERRITORIES } = require('../script.js');
  assert.equal(INDIAN_UNION_TERRITORIES.length, 8, 'Must include exactly 8 union territories');

  const expectedUTs = [
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ];

  assert.deepEqual(INDIAN_UNION_TERRITORIES, expectedUTs, 'UTs must match exactly and be sorted alphabetically');

  // Verify critical named UTs
  for (const specificUT of ['Puducherry', 'Delhi', 'Ladakh', 'Jammu and Kashmir']) {
    assert.ok(INDIAN_UNION_TERRITORIES.includes(specificUT), `Must include ${specificUT}`);
    const errors = validateCheckout({ ...valid, region: specificUT });
    assert.equal(errors.region, undefined, `Should accept UT: ${specificUT}`);
  }

  for (const ut of INDIAN_UNION_TERRITORIES) {
    const errors = validateCheckout({ ...valid, region: ut });
    assert.equal(errors.region, undefined, `Should accept union territory: ${ut}`);
  }
});

test('accepts diverse valid Indian city and town names', () => {
  const testCities = [
    { city: 'Bengaluru', region: 'Karnataka' },
    { city: 'Mumbai', region: 'Maharashtra' },
    { city: 'Kolkata', region: 'West Bengal' },
    { city: 'Chennai', region: 'Tamil Nadu' },
    { city: 'Jaipur', region: 'Rajasthan' },
    { city: 'Leh', region: 'Ladakh' },
    { city: 'Srinagar', region: 'Jammu and Kashmir' },
    { city: 'Panaji', region: 'Goa' },
    { city: 'Port Blair', region: 'Andaman and Nicobar Islands' },
    { city: 'Gangtok', region: 'Sikkim' },
    { city: 'Shillong', region: 'Meghalaya' },
    { city: 'Kochi', region: 'Kerala' },
    { city: 'Varanasi', region: 'Uttar Pradesh' }
  ];

  for (const { city, region } of testCities) {
    const errors = validateCheckout({ ...valid, city, region });
    assert.equal(errors.city, undefined, `Should accept valid city: ${city}`);
    assert.equal(errors.region, undefined, `Should accept region: ${region}`);
  }
});

test('rejects invalid or obsolete state names like Delhi NCR or Other State', () => {
  for (const invalidRegion of ['Delhi NCR', 'Other India State', 'Other State / UT (India)', 'FakeState']) {
    const errors = validateCheckout({ ...valid, region: invalidRegion });
    assert.ok(errors.region, `Should reject invalid region: ${invalidRegion}`);
  }
});

test('validates city length and empty values', () => {
  assert.ok(validateCheckout({ ...valid, city: '' }).city, 'Should flag empty city');
  assert.ok(validateCheckout({ ...valid, city: ' ' }).city, 'Should flag whitespace city');
  assert.ok(validateCheckout({ ...valid, city: 'A' }).city, 'Should flag 1-character city');
});
