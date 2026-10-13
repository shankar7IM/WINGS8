/* Pure motion maths shared by the 3D scene. No DOM, no three.js, so it is unit tested. */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Frame-rate independent ease toward a target (exponential smoothing). */
export const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** How far through `height` the scroll position is, clamped to 0..1. */
export const scrollProgress = (scrollY, height) =>
  height > 0 ? clamp(scrollY / height, 0, 1) : 0;

/** Wrap an angle into (-PI, PI]. */
export const wrapAngle = (a) => {
  const twoPi = Math.PI * 2;
  let r = ((a % twoPi) + twoPi) % twoPi;
  if (r > Math.PI) r -= twoPi;
  return r;
};
