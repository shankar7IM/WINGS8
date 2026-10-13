import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, damp, easeOutCubic, scrollProgress, wrapAngle } from '../motion.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('clamp limits to the range', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
});

test('damp moves toward the target without overshooting', () => {
  const next = damp(0, 10, 8, 1 / 60);
  assert.ok(next > 0 && next < 10);
});

test('damp is frame-rate independent', () => {
  // one 1/30s step must equal two 1/60s steps
  const one = damp(0, 1, 6, 1 / 30);
  const two = damp(damp(0, 1, 6, 1 / 60), 1, 6, 1 / 60);
  near(one, two);
});

test('damp with zero dt does not move; huge dt lands on target', () => {
  assert.equal(damp(3, 9, 5, 0), 3);
  near(damp(3, 9, 5, 1000), 9, 1e-6);
});

test('easeOutCubic hits the endpoints and is monotonic', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.25) < easeOutCubic(0.5));
  assert.ok(easeOutCubic(0.5) > 0.5, 'ease-out front-loads progress');
});

test('scrollProgress maps scroll position into 0..1 and clamps', () => {
  assert.equal(scrollProgress(0, 800), 0);
  assert.equal(scrollProgress(400, 800), 0.5);
  assert.equal(scrollProgress(2000, 800), 1);
  assert.equal(scrollProgress(-50, 800), 0);
  assert.equal(scrollProgress(100, 0), 0, 'zero height must not divide by zero');
});

test('wrapAngle keeps angles in (-PI, PI]', () => {
  near(wrapAngle(0), 0);
  near(wrapAngle(Math.PI * 2 + 0.5), 0.5);
  near(wrapAngle(-Math.PI * 2 - 0.5), -0.5);
  assert.ok(wrapAngle(Math.PI * 3) <= Math.PI && wrapAngle(Math.PI * 3) > -Math.PI);
});
