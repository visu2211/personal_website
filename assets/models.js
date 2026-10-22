// Spinnable 3D objects for the Beyond code hobby cards, built from primitives with three.js (no model files).
// await mountModel(canvas, 'bolt' | 'controller' | 'volleyball') → { reset }
// Drag in any direction to spin with momentum; it idles with a slow turn. Double-click or reset() eases it home.
// 'three' resolves through the import map in beyond.html (three@0.186.1 on jsDelivr).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/* ======================= shared viewer ======================= */
export async function mountModel(canvas, name, opts = {}) {
  const spec = { ...BUILDERS[name].view, ...opts };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  scene.add(new THREE.HemisphereLight('#f4ead6', '#0d1512', 0.6));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(3, 5, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 12 });
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ff9a5c', 1.2); rim.position.set(-4, 2, -3); scene.add(rim);

  // build, then center and scale it so every object frames the same way
  const obj = await BUILDERS[name].build();
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const k = spec.fit / Math.max(size.x, size.y, size.z);
  obj.scale.setScalar(k); obj.position.copy(center).multiplyScalar(-k);
  const pivot = new THREE.Group(); pivot.add(obj); scene.add(pivot);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(spec.fit * 0.95, 48), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // below the object's reach in any orientation, so spinning never passes through the shadow plane
  ground.position.y = -(size.length() * k) / 2 - 0.04;

  const home = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(obj.userData.home || spec.home)));
  pivot.quaternion.copy(home);

  /* free rotation: horizontal drags turn around the screen's vertical axis, vertical drags flip it over */
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), qy = new THREE.Quaternion();
  let wx = 0, wy = reduce ? 0 : spec.spin, drag = null, resetting = false;
  const turn = (dx, dy) => { q.setFromAxisAngle(AX, dx); qy.setFromAxisAngle(AY, dy); pivot.quaternion.premultiply(qy).premultiply(q); };
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => { resetting = false; drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    wy = (e.clientX - drag.x) * 0.01; wx = (e.clientY - drag.y) * 0.01;
    turn(wx, wy); drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { drag = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  const reset = () => { resetting = true; wx = 0; wy = 0; };
  canvas.addEventListener('dblclick', reset);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const z = spec.dist * (w / h < 1.2 ? 1.18 : 1);
    camera.position.set(0, z * 0.16, z); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (resetting && !drag) {
      pivot.quaternion.slerp(home, reduce ? 1 : 0.12);
      if (pivot.quaternion.angleTo(home) < 0.002) { pivot.quaternion.copy(home); resetting = false; wy = reduce ? 0 : spec.spin; }
    } else if (!drag) { wx *= 0.95; wy = wy * 0.95 + (reduce ? 0 : spec.spin) * 0.05; turn(wx, wy); }
    renderer.render(scene, camera);
  });
  canvas.__viewer = { pivot, obj, stop: () => { wx = 0; wy = 0; spec.spin = 0; } }; // handy for tuning angles in the console
  return { reset };
}

/* small helpers for builders */
function kit(group) {
  const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale);
    group.add(m); return m;
  };
  const tube = (pts, r, mat, seg = 48) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 10, false), mat);
  return { add, tube };
}
const std = (color, roughness = 0.5, metalness = 0.2, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

/* ======================= Yamaha Bolt R-Spec ======================= */
// x = forward, y = up, z = rider's left (exhaust and air cleaner on -z, the right side)
function buildBolt() {
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: '#1c1e20', roughness: 0.38, metalness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
    black: std('#141516', 0.55, 0.4), satin: std('#2a2c2e', 0.4, 0.7), metal: std('#b9bec2', 0.28, 0.95),
    rubber: std('#0b0b0b', 0.92, 0), seat: std('#3a2c24', 0.95, 0), spring: std('#c8a24a', 0.35, 0.8),
    lens: std('#fff6dc', 0.1, 0, { emissive: '#ffe9b0', emissiveIntensity: 1.4 }), tail: std('#ff3b2e', 0.4, 0, { emissive: '#ff2a1e', emissiveIntensity: 1.2 }),
  };
  const bike = new THREE.Group(); const { add, tube } = kit(bike);
  const R = 0.34;
  for (const [x, front] of [[0.82, true], [-0.78, false]]) {
    const g = new THREE.Group(); g.position.set(x, R, 0);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, front ? 0.07 : 0.085, 16, 48), M.rubber));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.018, 8, 48), M.black));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 20), M.satin); hub.rotation.x = Math.PI / 2; g.add(hub);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, R - 0.18, 0.02), M.black);
      const a = (i / 12) * Math.PI * 2; s.position.set(Math.cos(a) * (R - 0.04) / 2, Math.sin(a) * (R - 0.04) / 2, 0); s.rotation.z = a - Math.PI / 2; g.add(s);
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(front ? 0.15 : 0.12, front ? 0.15 : 0.12, 0.008, 32), M.metal);
    disc.rotation.x = Math.PI / 2; disc.position.z = front ? -0.07 : 0.07; g.add(disc);
    bike.add(g);
  }
  const head = [0.5, 0.98, 0];
  tube([head, [0.2, 0.9, 0], [-0.2, 0.82, 0], [-0.55, 0.72, 0]], 0.03, M.black);
  tube([head, [0.42, 0.6, 0], [0.3, 0.3, 0], [0.05, 0.22, 0]], 0.028, M.black);
  for (const z of [0.09, -0.09]) {
    tube([[-0.2, 0.36, z], [-0.5, 0.36, z], [-0.78, R, z]], 0.022, M.black, 24);
    const top = new THREE.Vector3(-0.42, 0.74, z * 1.2), bot = new THREE.Vector3(-0.68, 0.38, z * 1.2);
    const mid = top.clone().add(bot).multiplyScalar(0.5), dir = top.clone().sub(bot);
    const body = add(new THREE.CylinderGeometry(0.018, 0.018, dir.length(), 12), M.metal, [mid.x, mid.y, mid.z]);
    body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const coil = [];
    for (let t = 0; t <= 1; t += 0.01) { const a = t * Math.PI * 18; const p = bot.clone().lerp(top, 0.15 + t * 0.62); coil.push(new THREE.Vector3(p.x + Math.cos(a) * 0.035, p.y, p.z + Math.sin(a) * 0.035)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 300, 0.007, 6, false), M.spring);
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 14), M.satin, [top.x - 0.02, top.y - 0.08, top.z + Math.sign(z) * 0.05]).quaternion.copy(body.quaternion);
  }
  for (const z of [0.075, -0.075]) {
    add(new THREE.CylinderGeometry(0.03, 0.026, 0.72, 16), M.satin, [0.67, 0.66, z], [0, 0, 0.5]);
    add(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 16), M.black, [0.6, 0.86, z], [0, 0, 0.5]);
  }
  add(new THREE.BoxGeometry(0.06, 0.04, 0.2), M.black, [0.52, 1.0, 0], [0, 0, 0.5]);
  add(new THREE.BoxGeometry(0.42, 0.22, 0.24), M.black, [-0.02, 0.33, 0]);
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 32), M.metal, [-0.02, 0.33, 0.14], [Math.PI / 2, 0, 0]);
  for (const [ang, x] of [[-0.45, 0.12], [0.5, -0.16]]) {
    const cyl = new THREE.Group(); cyl.position.set(x, 0.52, 0); cyl.rotation.z = ang;
    for (let i = 0; i < 9; i++) { const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.1 - i * 0.002, 0.1 - i * 0.002, 0.012, 24), M.satin); fin.position.y = -0.1 + i * 0.026; cyl.add(fin); }
    cyl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.24, 20), M.black));
    const hc = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.17), M.satin); hc.position.y = 0.14; cyl.add(hc);
    bike.add(cyl);
  }
  add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 32), M.satin, [-0.02, 0.56, -0.16], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.065, 32), M.metal, [-0.02, 0.56, -0.17], [Math.PI / 2, 0, 0]);
  add(new THREE.SphereGeometry(0.5, 40, 24), M.paint, [0.2, 0.98, 0], [0, 0, -0.08], [0.62, 0.3, 0.38]);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), M.metal, [0.3, 1.13, 0]);
  add(new THREE.SphereGeometry(0.5, 32, 16), M.seat, [-0.28, 0.82, 0], [0, 0, 0.12], [0.44, 0.1, 0.32]);
  add(new THREE.TorusGeometry(R + 0.02, 0.06, 10, 32, Math.PI * 0.62), M.paint, [-0.78, R, 0], [0, 0, Math.PI * 0.25], [1, 1, 1.6]);
  add(new THREE.TorusGeometry(R + 0.03, 0.05, 10, 32, Math.PI * 0.4), M.paint, [0.82, R, 0], [0, 0, Math.PI * 0.32], [1, 1, 1.5]);
  add(new THREE.BoxGeometry(0.06, 0.03, 0.08), M.tail, [-1.08, 0.66, 0]);
  add(new THREE.BoxGeometry(0.16, 0.012, 0.11), M.black, [-1.08, 0.58, 0], [0, 0, 0.5]);
  add(new THREE.CylinderGeometry(0.1, 0.085, 0.12, 32), M.black, [0.66, 1.0, 0], [0, 0, Math.PI / 2]);
  add(new THREE.CircleGeometry(0.088, 32), M.lens, [0.725, 1.0, 0], [0, Math.PI / 2, 0]);
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), M.black, [0.48, 1.12, 0], [0, 0, 0.4]);
  tube([[0.42, 1.17, 0.36], [0.5, 1.16, 0.2], [0.52, 1.12, 0], [0.5, 1.16, -0.2], [0.42, 1.17, -0.36]], 0.016, M.black, 32);
  for (const z of [0.4, -0.4]) {
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 12), M.rubber, [0.42, 1.17, z], [Math.PI / 2, 0, 0]);
    tube([[0.46, 1.17, z * 0.75], [0.44, 1.32, z * 0.82]], 0.006, M.black, 6);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), M.black, [0.44, 1.34, z * 0.82], [0, 0, Math.PI / 2]);
  }
  tube([[0.18, 0.58, -0.08], [0.24, 0.4, -0.16], [0.08, 0.24, -0.2], [-0.3, 0.26, -0.21]], 0.026, M.black);
  tube([[-0.22, 0.66, -0.08], [-0.24, 0.48, -0.17], [-0.3, 0.3, -0.21]], 0.026, M.black);
  add(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 24), M.black, [-0.52, 0.29, -0.21], [0, 0, Math.PI / 2 + 0.06]);
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20), M.satin, [-0.735, 0.302, -0.21], [0, 0, Math.PI / 2]);
  for (const z of [0.2, -0.2]) add(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10), M.satin, [0.14, 0.26, z], [Math.PI / 2, 0, 0]);
  add(new THREE.BoxGeometry(0.62, 0.02, 0.025), M.black, [-0.42, 0.34, 0.14], [0, 0, 0.02]);
  return bike;
}

/* ======================= PS5 DualSense controller ======================= */
// Built lying flat: x = left/right, y = up (face side), z = toward you (grips point +z)
function buildController() {
  const M = {
    // Cosmic Red DualSense: red shell and touchpad, black core, red translucent buttons with pink glyphs
    white: std('#6a0c24', 0.82, 0),
    black: std('#141518', 0.55, 0.1), gloss: std('#0c0d0f', 0.22, 0.2), stick: std('#1c1d20', 0.8, 0.05),
    button: new THREE.MeshPhysicalMaterial({ color: '#7d0e2b', roughness: 0.2, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    glyph: std('#ff9db4', 0.4, 0), light: std('#4a6bff', 0.3, 0, { emissive: '#3f5cff', emissiveIntensity: 1.8 }),
    mute: std('#c9ccd1', 0.35, 0.3),
  };
  const pad = new THREE.Group(); const { add } = kit(pad);

  // main body seen from above (shape coords: x right, y toward the triggers); grips are added separately below
  const body = new THREE.Shape();
  body.moveTo(-0.9, 0.52);
  body.bezierCurveTo(-0.4, 0.62, 0.4, 0.62, 0.9, 0.52);                 // top edge
  body.bezierCurveTo(1.12, 0.48, 1.2, 0.2, 1.15, -0.1);                 // right shoulder
  body.bezierCurveTo(1.1, -0.34, 0.86, -0.42, 0.6, -0.4);               // into the right grip
  body.bezierCurveTo(0.36, -0.38, 0.2, -0.3, 0, -0.3);                  // bottom middle
  body.bezierCurveTo(-0.2, -0.3, -0.36, -0.38, -0.6, -0.4);
  body.bezierCurveTo(-0.86, -0.42, -1.1, -0.34, -1.15, -0.1);
  body.bezierCurveTo(-1.2, 0.2, -1.12, 0.48, -0.9, 0.52);
  // thick, heavily rounded shell (top face stays at y ≈ 0.29 where the buttons sit)
  const shell = new THREE.ExtrudeGeometry(body, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 10, curveSegments: 48 });
  shell.rotateX(-Math.PI / 2);                                           // lie flat: shape y → -z, extrusion → +y
  add(shell, M.white, [0, -0.05, 0], [0, 0, 0], [1, 0.82, 1]);

  // grips: rounded handles that sweep toward you, down, and out, like a DualSense
  for (const side of [-1, 1]) {
    const grip = new THREE.Group();
    const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.46, 10, 28), M.white);
    g.scale.set(1, 1, 0.82);
    grip.add(g);
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.32, 8, 24), M.black);  // dark inner face of each grip
    tip.position.set(-side * 0.1, -0.05, 0.02); tip.scale.set(0.7, 1, 0.75); grip.add(tip);
    grip.position.set(side * 0.72, 0.02, 0.38);
    grip.rotation.set(Math.PI / 2 - 0.32, 0, side * 0.36);              // toward +z, tipped down, splayed out
    pad.add(grip);
  }

  // black center deck between the grips (where the sticks and buttons sit)
  const deck = new THREE.Shape();
  deck.moveTo(-0.98, 0.18);
  deck.bezierCurveTo(-0.5, 0.26, 0.5, 0.26, 0.98, 0.18);
  deck.bezierCurveTo(1.02, -0.1, 0.9, -0.3, 0.6, -0.36);
  deck.bezierCurveTo(0.3, -0.42, 0.14, -0.3, 0, -0.3);
  deck.bezierCurveTo(-0.14, -0.3, -0.3, -0.42, -0.6, -0.36);
  deck.bezierCurveTo(-0.9, -0.3, -1.02, -0.1, -0.98, 0.18);
  const dg = new THREE.ExtrudeGeometry(deck, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 3, curveSegments: 30 });
  dg.rotateX(-Math.PI / 2);
  add(dg, M.black, [0, 0.285, 0]);

  // touchpad (white, slightly raised) with the light bar strips on either side
  add(new THREE.SphereGeometry(0.5, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.white, [0, 0.3, -0.36], [0, 0, 0], [0.74, 0.07, 0.44]);  // domed touchpad
  for (const x of [-0.39, 0.39]) add(new THREE.BoxGeometry(0.02, 0.012, 0.36), M.light, [x, 0.33, -0.36]);

  // analog sticks with domed, textured caps
  for (const x of [-0.3, 0.3]) {
    add(new THREE.CylinderGeometry(0.075, 0.12, 0.12, 32), M.black, [x, 0.35, 0.04]);              // stick shaft and well
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 36), M.stick, [x, 0.43, 0.04]);
    add(new THREE.TorusGeometry(0.115, 0.02, 12, 44), M.stick, [x, 0.455, 0.04], [Math.PI / 2, 0, 0]);  // raised rim of the cap
  }
  // D-pad (left)
  for (const [dx, dz] of [[0, -0.09], [0, 0.09], [-0.09, 0], [0.09, 0]]) {
    add(new THREE.BoxGeometry(dz ? 0.07 : 0.085, 0.03, dz ? 0.085 : 0.07), M.button, [-0.68 + dx, 0.315, -0.2 + dz]);
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 3), M.glyph, [-0.68 + dx * 1.15, 0.333, -0.2 + dz * 1.15], [0, Math.atan2(dx, dz) + Math.PI, 0]);  // little arrow
  }
  // face buttons (right): triangle, circle, cross, square with small glyphs
  const fb = [[0, -0.11, 'tri'], [0.11, 0, 'circle'], [0, 0.11, 'cross'], [-0.11, 0, 'square']];
  for (const [dx, dz, g] of fb) {
    const x = 0.68 + dx, z = -0.2 + dz;
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 28), M.button, [x, 0.32, z]);
    const gy = 0.34;
    if (g === 'circle') add(new THREE.TorusGeometry(0.022, 0.005, 6, 24), M.glyph, [x, gy, z], [Math.PI / 2, 0, 0]);
    if (g === 'square') add(new THREE.BoxGeometry(0.036, 0.004, 0.036), M.glyph, [x, gy, z]);
    if (g === 'cross') for (const r of [Math.PI / 4, -Math.PI / 4]) add(new THREE.BoxGeometry(0.05, 0.004, 0.008), M.glyph, [x, gy, z], [0, r, 0]);
    if (g === 'tri') add(new THREE.CylinderGeometry(0.026, 0.026, 0.004, 3), M.glyph, [x, gy, z], [0, Math.PI, 0]);
  }
  // PS button, mute button, create/options
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 24), M.gloss, [0, 0.31, 0.06]);                       // PS button
  add(new THREE.BoxGeometry(0.075, 0.012, 0.022), M.mute, [0, 0.302, 0.16]);                               // mute button
  for (let r = 0; r < 2; r++) for (let i = -3; i <= 3; i++) add(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), M.gloss, [i * 0.028, 0.303, -0.1 + r * 0.03]);  // speaker grille
  for (const x of [-0.45, 0.45]) add(new THREE.BoxGeometry(0.03, 0.02, 0.07), M.button, [x, 0.33, -0.48], [0, x > 0 ? -0.35 : 0.35, 0]); // create / options

  // shoulder buttons and triggers along the top edge
  for (const x of [-0.72, 0.72]) {
    add(new THREE.BoxGeometry(0.34, 0.06, 0.1), M.black, [x, 0.22, -0.6], [0, x > 0 ? -0.12 : 0.12, 0]);        // L1 / R1
    add(new THREE.CapsuleGeometry(0.07, 0.2, 6, 16), M.white, [x * 1.02, 0.02, -0.62], [0.6, 0, Math.PI / 2 + (x > 0 ? -0.12 : 0.12)], [1, 1, 1.4]);  // L2 / R2 triggers
  }
  // underside: dark grip texture strip and speaker grille dots
  add(new THREE.BoxGeometry(1.4, 0.01, 0.06), M.black, [0, -0.095, -0.1]);
  // matte plastics: keep studio reflections low so the red stays deep and the black stays black
  for (const [k, m] of Object.entries(M)) if (k !== 'light') m.envMapIntensity = k === 'button' ? 0.5 : 0.22;
  M.black.roughness = 0.8; M.stick.roughness = 0.9;
  return pad;
}

/* ======================= Volleyball (Molten FLISTATEC style) ======================= */
// Red, white and blue panels that swirl around the ball, dark seams between them, and a honeycomb
// surface texture. Painted into an equirectangular canvas and wrapped on a sphere.
function buildVolleyball() {
  // Molten FLISTATEC look: equal-width navy, white and red-orange bands in a deep S-swirl, honeycomb all over
  const W = 2048, H = 1024;
  const color = document.createElement('canvas'); color.width = W; color.height = H;
  const bump = document.createElement('canvas'); bump.width = W; bump.height = H;
  const cx = color.getContext('2d'), bx = bump.getContext('2d');
  const img = cx.createImageData(W, H), d = img.data;
  const seam = new Uint8Array(W * H);
  // one lap around the ball: navy, white, red, twice
  const bands = [['#1e2a8c', 1], ['#f4f3ef', 1], ['#e0341c', 1], ['#1e2a8c', 1], ['#f4f3ef', 1], ['#e0341c', 1]];
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const stops = []; let acc = 0; for (const [c, w] of bands) { stops.push([acc, rgb(c)]); acc += w; }
  const lap = acc;
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI;                       // +π/2 top … −π/2 bottom
    // the bands sweep one way above the equator and back below it, the Molten S-curve
    const twist = 1.5 * Math.sin(lat * 2);
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2;
      const t = (((lon + twist) / (Math.PI * 2)) % 1 + 1) % 1 * lap;
      let k = 0; while (k + 1 < stops.length && stops[k + 1][0] <= t) k++;
      const next = k + 1 < stops.length ? stops[k + 1][0] : lap;
      const edge = Math.min(t - stops[k][0], next - t) * (Math.PI * 2 / lap) * Math.cos(lat);   // distance to a seam
      let [r, g, b] = stops[k][1];
      if (edge < 0.012) { const f = 0.5 + (edge / 0.012) * 0.5; r *= f; g *= f; b *= f; if (edge < 0.006) seam[y * W + x] = 1; }
      const i = (y * W + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  // honeycomb, drawn faintly into the color and as raised ridges in the bump map
  const hexes = (ctx, R) => {
    const hw = Math.sqrt(3) * R;
    for (let row = 0, y = 0; y < H + R; row++, y += R * 1.5) {
      for (let x = (row % 2) * hw / 2; x < W + hw; x += hw) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; ctx.lineTo(x + R * Math.cos(a), y + R * Math.sin(a)); }
        ctx.closePath(); ctx.stroke();
      }
    }
  };
  cx.strokeStyle = 'rgba(0, 0, 0, 0.16)'; cx.lineWidth = 1.6; hexes(cx, 13);
  bx.fillStyle = '#808080'; bx.fillRect(0, 0, W, H);
  bx.strokeStyle = '#4e4e4e'; bx.lineWidth = 2.4; hexes(bx, 13);
  // press the panel seams into the surface
  const bd = bx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) if (seam[i]) { const j = i * 4; bd.data[j] = bd.data[j + 1] = bd.data[j + 2] = 16; }
  bx.putImageData(bd, 0, 0);
  const map = new THREE.CanvasTexture(color); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bump);
  const ball = new THREE.Group();
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshPhysicalMaterial({ map, bumpMap, bumpScale: 0.6, roughness: 0.6, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.6 })));
  return ball;
}

/* ======================= DualSense from a real model file ======================= */
// "Playstation 5 Dualsense" by AHarmlessPotato on Sketchfab, CC BY 4.0
// https://sketchfab.com/3d-models/playstation-5-dualsense-878c1f882808477ab81c2fe86d5a3936
// Falls back to the code-built controller if the file is missing or fails to load.
async function loadDualSense() {
  try {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('assets/models/dualsense.glb');
    const root = gltf.scene;
    // Cosmic Red: tint the white shell; multiplying keeps the black core and sticks black
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material.color?.set('#a3173c');
      o.material.envMapIntensity = 0.55;
      // the file marks two materials as see-through (alpha blend), which leaves holes at some angles; it's all solid plastic
      o.material.transparent = false; o.material.opacity = 1; o.material.alphaTest = 0; o.material.depthWrite = true;
      o.material.side = THREE.DoubleSide; o.material.needsUpdate = true;
    });
    // the file stands upright facing away; turn it to face the camera
    root.rotation.set(0, Math.PI, 0);
    root.userData.home = [0.18, 0, 0];   // slight forward tilt so the depth reads
    return root;
  } catch (e) {
    console.warn('DualSense model file unavailable, using the built-in controller.', e);
    return buildController();
  }
}

const BUILDERS = {
  bolt: { build: buildBolt, view: { fit: 2.4, dist: 4.9, home: [0, -0.6, 0], spin: 0.004 } },
  controller: { build: loadDualSense, view: { fit: 2.75, dist: 5.2, home: [1.42, 0, 0], spin: 0.0025 } },
  volleyball: { build: buildVolleyball, view: { fit: 2.0, dist: 5.2, home: [0.4, 0.6, 0.2], spin: 0.008 } },
};
