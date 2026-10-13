const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnquiry } = require('../script.js');

const valid = { name: 'A. Tester', organisation: 'Example Ltd', email: 'a@example.com', region: 'Europe' };

test('accepts a complete enquiry', () => {
  assert.deepEqual(validateEnquiry(valid), {});
});

test('flags every empty required field', () => {
  const errors = validateEnquiry({ name: '', organisation: '', email: '', region: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'name', 'organisation', 'region']);
});

test('treats whitespace-only values as empty', () => {
  assert.ok(validateEnquiry({ ...valid, name: '   ' }).name);
});

test('rejects malformed emails', () => {
  for (const email of ['plain', 'a@b', 'a b@c.com', '@c.com', 'a@.com']) {
    assert.ok(validateEnquiry({ ...valid, email }).email, `should reject ${email}`);
  }
});

test('accepts normal emails', () => {
  for (const email of ['a@example.com', 'first.last@sub.example.co']) {
    assert.equal(validateEnquiry({ ...valid, email }).email, undefined);
  }
});

test('message is optional', () => {
  assert.deepEqual(validateEnquiry({ ...valid, message: '' }), {});
});

test('survives missing fields and non-string values', () => {
  assert.doesNotThrow(() => validateEnquiry({}));
  assert.ok(validateEnquiry({ ...valid, name: 42 }).name);
});
