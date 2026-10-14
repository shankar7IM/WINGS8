/* Interactive 3D model of the W8 TV stick, modelled from the deck's slide-8 photo.
   Loaded lazily by script.js; any failure leaves the photo fallback in place. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { clamp, damp, easeOutCubic, scrollProgress, wrapAngle } from './motion.js';

const INTRO_SECONDS = 1.8;
const SWAP_MS = 900;
const MAX_PITCH = 0.9;

/* ---------- geometry helpers ---------- */
function roundedRect(w, h, r) {
  const x = -w / 2, y = -h / 2, s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);         s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);     s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);         s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);             s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Bevelled rounded slab, w x h in the XY plane and `depth` thick along Z, centred on the origin. */
function slab(w, h, depth, radius, bevel) {
  const geo = new THREE.ExtrudeGeometry(
    roundedRect(w - 2 * bevel, h - 2 * bevel, Math.max(radius - bevel, 0.1)),
    { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 18 }
  );
  geo.center();
  return geo;
}

/* ---------- textures ---------- */
function carbonTexture() {
  const size = 128, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b0d';
  g.fillRect(0, 0, size, size);
  const cell = size / 8;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const lit = (i + j) % 2 === 0;
      const grad = g.createLinearGradient(i * cell, j * cell, (i + 1) * cell, (j + 1) * cell);
      grad.addColorStop(0, lit ? '#26262b' : '#101012');
      grad.addColorStop(1, lit ? '#0e0e10' : '#222226');
      g.fillStyle = grad;
      g.fillRect(i * cell + 0.5, j * cell + 0.5, cell - 1, cell - 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 5, 1 / 5);
  t.rotation = Math.PI / 4;
  t.center.set(0.5, 0.5);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

async function decalTexture(logoUrl) {
  const img = new Image();
  img.src = logoUrl;
  await img.decode();
  if (document.fonts && document.fonts.load) {
    await document.fonts.load('800 100px "Plus Jakarta Sans"').catch(() => {});
    await document.fonts.load('700 100px Carlito').catch(() => {});
  }

  const size = 512, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const w = 330, h = (w * img.naturalHeight) / img.naturalWidth;
  g.shadowColor = 'rgba(255,255,255,0.55)';   // faint rim so the black heart reads on black carbon
  g.shadowBlur = 6;
  g.save();
  g.translate(size / 2, 40 + h / 2);
  g.rotate(Math.PI);
  g.drawImage(img, -w / 2, -h / 2, w, h);
  g.restore();
  g.shadowBlur = 0;

  g.font = '800 116px "Plus Jakarta Sans", Carlito, Calibri, Arial, sans-serif';
  g.textBaseline = 'alphabetic';
  const left = 'WINGS', right = '8';
  const total = g.measureText(left).width + g.measureText(right).width;
  const x = (size - total) / 2, y = 40 + h + 120;
  g.fillStyle = '#ffffff';
  g.fillText(left, x, y);
  g.fillStyle = '#e0161c';
  g.fillText(right, x + g.measureText(left).width, y);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function verticalRibbedTexture() {
  const width = 128, height = 128;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0a0c';
  g.fillRect(0, 0, width, height);

  const ribW = 32; // 4 distinct ribs per 128px tile
  for (let x = 0; x < width; x += ribW) {
    const grad = g.createLinearGradient(x, 0, x + ribW, 0);
    grad.addColorStop(0, '#121216');
    grad.addColorStop(0.3, '#32323c'); // crisp specular micro-ridge
    grad.addColorStop(0.6, '#18181e');
    grad.addColorStop(1, '#060608');   // groove shadow
    g.fillStyle = grad;
    g.fillRect(x + 0.5, 0, ribW - 1, height);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.5, 0.02); // ~44 distinct ribs across the 22-unit face
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

/** Hollow HDMI Type-A shell with realistic trapezoidal cross-section. */
function hdmiShellGeometry() {
  const wTop = 14.0;
  const wBot = 9.8;
  const th = 4.6;
  const wall = 0.44;
  const len = 12.6;
  const rad = 0.5;

  function makeTrapezoidShape(wt, wb, t, r) {
    const s = new THREE.Shape();
    const halfWt = wt / 2;
    const halfWb = wb / 2;
    const yFront = -t / 2;
    const yBack = t / 2;
    const yTaper = -0.15;

    s.moveTo(-halfWt + r, yFront);
    s.lineTo(halfWt - r, yFront);
    s.absarc(halfWt - r, yFront + r, r, -Math.PI / 2, 0, false);
    s.lineTo(halfWt, yTaper);
    s.lineTo(halfWb, yBack - r);
    s.absarc(halfWb - r, yBack - r, r, 0, Math.PI / 2, false);
    s.lineTo(-halfWb + r, yBack);
    s.absarc(-halfWb + r, yBack - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(-halfWt, yTaper);
    s.lineTo(-halfWt, yFront + r);
    s.absarc(-halfWt + r, yFront + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }

  const outer = makeTrapezoidShape(wTop, wBot, th, rad);
  const inner = makeTrapezoidShape(wTop - 2 * wall, wBot - 2 * wall, th - 2 * wall, Math.max(0.1, rad - wall));
  outer.holes.push(inner);
  return new THREE.ExtrudeGeometry(outer, { depth: len, bevelEnabled: false, curveSegments: 16 });
}

function loadTexture(url) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.anisotropy = 16;
        resolve(t);
      },
      undefined,
      (err) => {
        console.warn('Failed to load texture:', url, err);
        resolve(null);
      }
    );
  });
}

function createContactShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Hollow USB-A shell: a rounded rectangle tube, open at the tip. Extruded along +Z (rotated onto +Y by the caller). */
function usbShellGeometry(w = 12.8, th = 4.4, len = 11.4) {
  const wall = 0.42;
  const r = 0.7;
  const outer = roundedRect(w, th, r);
  outer.holes.push(roundedRect(w - 2 * wall, th - 2 * wall, Math.max(0.1, r - wall)));
  return new THREE.ExtrudeGeometry(outer, { depth: len, bevelEnabled: false, curveSegments: 12 });
}

/* ---------- the model ---------- */
function buildStick(decalMap, usbTexture) {
  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    parent.add(m);
    return m;
  };
  const flat = (parent, w, h, mat, x, y, z) => add(parent, new THREE.PlaneGeometry(w, h), mat, x, y, z);

  // ==========================================
  // W8 USB (pen drive) — photorealistic reference model
  // ==========================================
  const usb = new THREE.Group();
  usb.position.y = 7.0; // aligns visual mass with viewport center

  const usbShellMat = new THREE.MeshStandardMaterial({
    color: 0xe2e2e8,
    roughness: 0.24,
    metalness: 0.95,
    envMapIntensity: 1.8,
  });
  const usbBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0c0e,
    roughness: 0.35,
    metalness: 0.25,
    clearcoat: 0.55,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.0,
  });
  const usbCapMat = new THREE.MeshPhysicalMaterial({
    color: 0x060608,
    roughness: 0.18,
    metalness: 0.35,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.25,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd470,
    emissive: 0x5a3b00,
    emissiveIntensity: 0.55,
    roughness: 0.16,
    metalness: 1,
    envMapIntensity: 2.4,
  });
  const usbDarkCore = new THREE.MeshStandardMaterial({
    color: 0x121216,
    roughness: 0.8,
    metalness: 0.1,
  });

  // A. 3D Body depth casing
  add(usb, slab(20.4, 38.3, 7.6, 3.2, 1.0), usbBodyMat, 0, 3.65, 0);

  // B. 3D Cap depth casing
  add(usb, slab(20.8, 16.4, 8.0, 3.4, 1.1), usbCapMat, 0, -25.6, 0);

  // C. 3D USB Type-A connector shell & interior
  add(usb, usbShellGeometry(12.8, 4.4, 11.4), usbShellMat, 0, 22.8, 0, -Math.PI / 2);
  add(usb, new THREE.BoxGeometry(11.0, 9.8, 1.3), usbDarkCore, 0, 28.1, -0.45);
  [-3.7, -1.25, 1.25, 3.7].forEach((x) => add(usb, new THREE.BoxGeometry(1.0, 3.8, 0.2), gold, x, 31.0, 0.38));
  [-2.8, 2.8].forEach((x) => flat(usb, 2.4, 2.2, new THREE.MeshBasicMaterial({ color: 0x111114 }), x, 28.5, -2.21));

  // D. Front photographic face using reference texture (682x1024, aspect ratio 0.666015625)
  if (usbTexture) {
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: usbTexture,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.3,
      metalness: 0.15,
      clearcoat: 0.75,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.95,
      reflectivity: 0.5,
      side: THREE.FrontSide,
    });
    const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(51.95, 78.0), frontMat);
    frontMesh.position.set(0, 0, 4.02);
    usb.add(frontMesh);
  }

  // E. Soft contact shadow on ground beneath cap
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), contactShadowMat);
  contactShadow.position.set(0, -34.2, 0);
  contactShadow.rotation.x = -Math.PI / 2;
  usb.add(contactShadow);

  // ==========================================
  // W8 TV (HDMI stick) — realistic adaptation
  // ==========================================
  const tv = new THREE.Group();
  const tvRibbed = verticalRibbedTexture();
  const tvBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x111114, map: tvRibbed, bumpMap: tvRibbed, bumpScale: 0.35,
    roughness: 0.36, metalness: 0.28, clearcoat: 0.45, clearcoatRoughness: 0.16, envMapIntensity: 1.0,
  });
  const tvChinMat = new THREE.MeshPhysicalMaterial({
    color: 0x070709, roughness: 0.22, metalness: 0.42, clearcoat: 0.85, clearcoatRoughness: 0.14, envMapIntensity: 0.7,
  });
  const tvLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.1,
  });
  const hdmiGold = new THREE.MeshPhysicalMaterial({
    color: 0xecd086, roughness: 0.18, metalness: 0.98, clearcoat: 0.45, clearcoatRoughness: 0.12, envMapIntensity: 2.2,
  });
  const goldPinMat = new THREE.MeshStandardMaterial({
    color: 0xffd700, roughness: 0.1, metalness: 1, emissive: 0x5a3e00, emissiveIntensity: 0.45,
  });
  const darkCore = new THREE.MeshStandardMaterial({
    color: 0x121215, roughness: 0.85, metalness: 0.1,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x141418, roughness: 0.35, metalness: 0.4,
  });
  const holeRimMat = new THREE.MeshStandardMaterial({
    color: 0x9e8548, roughness: 0.3, metalness: 1,
  });
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x050507 });

  // A. Main body casing: ribbed upper section + glossy chin + LED + WINGS8 decal
  add(tv, slab(22, 42, 8.8, 3.4, 1.1), tvBodyMat, 0, 7, 0);
  add(tv, slab(22.4, 18, 9.4, 3.8, 1.2), tvChinMat, 0, -22, 0);
  add(tv, slab(3.8, 1.2, 0.4, 0.55, 0.1), tvLedMat, 0, -27, 4.75); // pill LED
  const tvDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 15),
    new THREE.MeshBasicMaterial({ map: decalMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  tvDecal.position.set(0, 9.5, 4.55);
  tv.add(tvDecal);

  // B. Collar joining HDMI plug to body
  add(tv, slab(15.2, 2.0, 5.4, 0.8, 0.2), collarMat, 0, 27.2, 0);

  // C. Gold HDMI Type-A connector shell
  add(tv, hdmiShellGeometry(), hdmiGold, 0, 27.4, 0, -Math.PI / 2);

  // D. Dark interior tongue / core inside shell
  add(tv, new THREE.BoxGeometry(11.8, 10.8, 1.3), darkCore, 0, 33.5, 0.0);

  // E. Visible 19 gold contact pins inside the mouth
  const pins = [-5.1, -4.53, -3.97, -3.4, -2.83, -2.27, -1.7, -1.13, -0.57, 0, 0.57, 1.13, 1.7, 2.27, 2.83, 3.4, 3.97, 4.53, 5.1];
  pins.forEach((px) => {
    add(tv, new THREE.BoxGeometry(0.32, 3.2, 0.16), goldPinMat, px, 37.0, 0.82);
  });

  // F. Two rectangular detent latch windows on front face (matching the reference photo)
  [-2.8, 2.8].forEach((hx) => {
    flat(tv, 2.8, 2.4, holeRimMat, hx, 34.6, 2.305); // beveled brass rim
    flat(tv, 2.3, 1.9, voidMat, hx, 34.6, 2.31);    // dark latch hole
  });
  // Matching subtle detent indents on the back face
  [-2.2, 2.2].forEach((hx) => {
    flat(tv, 2.2, 1.8, holeRimMat, hx, 34.6, -2.305);
    flat(tv, 1.8, 1.4, voidMat, hx, 34.6, -2.31);
  });

  const root = new THREE.Group();
  root.add(usb, tv);
  return { root, tv, usb };
}

/* ---------- mount ---------- */
export async function mountStick(host, { logoUrl, reduceMotion = false, model: startModel = 'usb' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label', 'Interactive 3D model of the W8 TV stick. Drag, or use the arrow keys, to rotate it.');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-40, 60, 80);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 600);
  camera.position.set(0, 0, 176);

  // pivot (user yaw/pitch) > lean (screen-space tilt) > tilt (top face toward viewer) > stick
  const pivot = new THREE.Group();
  const lean = new THREE.Group();
  const tilt = new THREE.Group();
  const usbTexture = await loadTexture('assets/w8-usb-upright.png');
  const parts = buildStick(await decalTexture(logoUrl), usbTexture);
  const stick = parts.root;
  let current = startModel === 'tv' ? 'tv' : 'usb';
  lean.rotation.z = current === 'tv' ? -0.44 : 0;
  tilt.rotation.x = current === 'tv' ? -0.62 : -0.04;
  const showModel = (name) => {
    parts.tv.visible = name === 'tv';
    parts.usb.visible = name === 'usb';
    current = name;
    canvas.setAttribute('aria-label', name === 'tv'
      ? 'Interactive 3D model of the W8 TV HDMI stick. Drag, or use arrow keys, to rotate.'
      : 'Interactive 3D model of the WINGS8 USB drive. Drag, or use arrow keys, to rotate.');
  };
  showModel(current);
  let swap = null;
  stick.position.y = -8;               // centre the visual mass with generous connector headroom
  tilt.add(stick); lean.add(tilt); pivot.add(lean); scene.add(pivot);

  const shadow = host.querySelector('.stage__shadow');

  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  /* state */
  let yaw = 0, pitch = 0, yawTarget = 0, pitchTarget = 0, velocity = 0;
  let dragging = false, lastX = 0, lastY = 0, lastInput = -Infinity;
  let visible = true, running = false, last = performance.now(), t0 = last;
  const heroH = () => (host.closest('.hero') || host).offsetHeight;

  const wake = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } };

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; velocity = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is a nicety; dragging still works without it */ }
    canvas.style.cursor = 'grabbing'; wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    yawTarget += dx * 0.009;
    pitchTarget = clamp(pitchTarget + dy * 0.006, -MAX_PITCH, MAX_PITCH);
    velocity = dx * 0.009 * 60;
    lastInput = performance.now();
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false; canvas.style.cursor = ''; lastInput = performance.now();
    try { if (e && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-0.35, 0], ArrowRight: [0.35, 0], ArrowUp: [0, -0.2], ArrowDown: [0, 0.2] }[e.key];
    if (!step) return;
    e.preventDefault();
    yawTarget += step[0]; pitchTarget = clamp(pitchTarget + step[1], -MAX_PITCH, MAX_PITCH);
    lastInput = performance.now(); wake();
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); host.classList.remove('is-3d'); running = false; visible = false; });
  window.addEventListener('scroll', wake, { passive: true });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(host);
  document.addEventListener('visibilitychange', wake);

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const time = (now - t0) / 1000;
    const settling = !dragging && now - lastInput > 1800;

    if (!dragging) { yawTarget += velocity * dt; velocity *= Math.exp(-3 * dt); }
    if (settling) {                                  // drift back to the showcase pose
      yawTarget = damp(wrapAngle(yawTarget), 0, 0.7, dt);
      pitchTarget = damp(pitchTarget, 0, 0.9, dt);
    }
    yaw = damp(yaw, yawTarget, 9, dt);
    pitch = damp(pitch, pitchTarget, 9, dt);

    const intro = reduceMotion ? 1 : easeOutCubic(time / INTRO_SECONDS);
    const scrollTurn = scrollProgress(window.scrollY, heroH()) * 0.9;

    // Distinctive animations per product:
    // W8 TV: HDMI media-device floating motion with gentle wave & golden key highlight
    // WINGS8 USB: Upright photorealistic product display with smooth floating and slow side-profile reveal
    let sway = 0;
    let bob = 0;
    let targetLeanZ = 0;
    let targetTiltX = 0;

    if (current === 'tv') {
      key.color.setHex(0xfff7e8);
      key.intensity = 1.65;
      const baseLeanZ = -0.44;
      const baseTiltX = -0.62;
      if (!reduceMotion) {
        sway = Math.sin(time * 0.6) * 0.28 * (settling ? 1 : 0.35);
        bob = Math.sin(time * 1.05) * 1.6;
        const pitchDrift = Math.cos(time * 0.5) * 0.07 * (settling ? 1 : 0.2);
        const rollDrift = Math.sin(time * 0.35) * 0.05;
        targetLeanZ = baseLeanZ + rollDrift;
        targetTiltX = baseTiltX + pitchDrift;
      } else {
        targetLeanZ = baseLeanZ;
        targetTiltX = baseTiltX;
      }
    } else {
      // WINGS8 USB (pen drive) — Upright, smooth float & gentle side-profile rotation
      key.color.setHex(0xffffff);
      key.intensity = 1.5;
      const baseLeanZ = 0;
      const baseTiltX = -0.04;
      if (!reduceMotion) {
        // Slow, gentle 3D-style rotation around the vertical axis, revealing side profile and returning
        sway = Math.sin(time * 0.55) * 0.20 * (settling ? 1 : 0.3);
        // Smooth floating animation with subtle vertical movement
        bob = Math.sin(time * 1.0) * 1.2;
        const pitchDrift = Math.cos(time * 0.45) * 0.02 * (settling ? 1 : 0.2);
        const rollDrift = Math.sin(time * 0.35) * 0.015 * (settling ? 1 : 0.2);
        targetLeanZ = baseLeanZ + rollDrift;
        targetTiltX = baseTiltX + pitchDrift;
      } else {
        targetLeanZ = 0;
        targetTiltX = 0;
      }
    }

    if (reduceMotion) {
      lean.rotation.z = targetLeanZ;
      tilt.rotation.x = targetTiltX;
    } else {
      lean.rotation.z = damp(lean.rotation.z, targetLeanZ, 5, dt);
      tilt.rotation.x = damp(tilt.rotation.x, targetTiltX, 5, dt);
    }

    // switching device: dip and swing out, swap the model at the midpoint, swing back in
    let swapYaw = 0, swapScale = 1;
    if (swap) {
      const p = clamp((now - swap.start) / SWAP_MS, 0, 1);
      if (p >= 0.5 && !swap.done) {
        showModel(swap.to);
        swap.done = true;
      }
      swapYaw = Math.sin(p * Math.PI) * 1.25;
      swapScale = 1 - 0.26 * Math.sin(p * Math.PI);
      if (p >= 1) swap = null;
    }

    const introYaw = (1 - intro) * (current === 'usb' ? 0.6 : 1.7);
    pivot.rotation.y = yaw + sway + scrollTurn + introYaw + swapYaw;
    pivot.rotation.x = pitch;
    pivot.position.y = bob * 1.3;
    pivot.scale.setScalar((0.82 + 0.18 * intro) * swapScale);
    if (shadow) {
      const sf = current === 'usb' ? (1 - bob * 0.04) : (1 - bob * 0.05);
      shadow.style.transform = `translateX(-50%) scaleX(${sf}) scaleY(${sf})`;
    }

    renderer.render(scene, camera);
    host.classList.add('is-3d');

    const idle = reduceMotion && !dragging && !swap && Math.abs(yawTarget - yaw) < 1e-3 && Math.abs(pitchTarget - pitch) < 1e-3 && Math.abs(velocity) < 1e-3 && time > INTRO_SECONDS;
    if (idle) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function setModel(name) {
    if ((name !== 'tv' && name !== 'usb') || (name === current && !swap)) return false;
    if (reduceMotion) {
      showModel(name);
    } else {
      swap = { to: name, start: performance.now(), done: false };
    }
    wake();
    return true;
  }

  wake();
  return { setModel, get model() { return current; } };
}
