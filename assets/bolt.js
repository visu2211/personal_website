// Stylized Yamaha Bolt R-Spec, built from primitives with three.js (no model file).
// Drag to rotate it in any direction with momentum; it idles with a slow turn, like the old Rubik's cube card.
// x = forward, y = up, z = rider's left (so the exhaust and air cleaner sit on -z, the right side).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// 'three' resolves through the import map in beyond.html (three@0.186.1 on jsDelivr).

export const PAINTS = {
  'Matte Gray': '#5b6064',
  'Liquid Metal': '#9aa3ab',
  'Raven': '#1c1e20',
  'Ember': '#ff7b3a',
};

export function mountBolt(canvas, { paint = 'Raven' } = {}) { // paint: a PAINTS name or any CSS color
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.25, 5.6);
  camera.lookAt(0, 0.62, 0);

  scene.add(new THREE.HemisphereLight('#f4ead6', '#0d1512', 0.6));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(3, 5, 3); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 12 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ff9a5c', 1.4); rim.position.set(-4, 2, -3); scene.add(rim);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  /* ---------- materials ---------- */
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: PAINTS[paint] || paint, roughness: 0.38, metalness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35 }),  // glossy black by default
    black: new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.55, metalness: 0.4 }),
    satin: new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 0.4, metalness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b9bec2', roughness: 0.28, metalness: 0.95 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.92, metalness: 0 }),
    seat: new THREE.MeshStandardMaterial({ color: '#3a2c24', roughness: 0.95, metalness: 0 }),
    spring: new THREE.MeshStandardMaterial({ color: '#c8a24a', roughness: 0.35, metalness: 0.8 }),
    lens: new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffe9b0', emissiveIntensity: 1.4, roughness: 0.1 }),
    tail: new THREE.MeshStandardMaterial({ color: '#ff3b2e', emissive: '#ff2a1e', emissiveIntensity: 1.2 }),
  };

  const bike = new THREE.Group();
  const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true; bike.add(m); return m;
  };
  const tube = (pts, r, mat, seg = 48) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 10, false), mat);

  /* ---------- wheels: tire + rim + 12-spoke cast wheel + disc ---------- */
  const R = 0.34;
  function wheel(x, front) {
    const g = new THREE.Group(); g.position.set(x, R, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, front ? 0.07 : 0.085, 16, 48), M.rubber);
    const rimM = new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.018, 8, 48), M.black);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 20), M.satin); hub.rotation.x = Math.PI / 2;
    g.add(tire, rimM, hub);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, R - 0.18, 0.02), M.black);
      const a = (i / 12) * Math.PI * 2; s.position.set(Math.cos(a) * (R - 0.04) / 2, Math.sin(a) * (R - 0.04) / 2, 0); s.rotation.z = a - Math.PI / 2;
      g.add(s);
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(front ? 0.15 : 0.12, front ? 0.15 : 0.12, 0.008, 32), M.metal);
    disc.rotation.x = Math.PI / 2; disc.position.z = front ? -0.07 : 0.07; g.add(disc);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    bike.add(g); return g;
  }
  const wf = wheel(0.82, true), wr = wheel(-0.78, false);

  /* ---------- frame, swingarm, forks ---------- */
  const head = [0.5, 0.98, 0];
  tube([head, [0.2, 0.9, 0], [-0.2, 0.82, 0], [-0.55, 0.72, 0]], 0.03, M.black);           // backbone
  tube([head, [0.42, 0.6, 0], [0.3, 0.3, 0], [0.05, 0.22, 0]], 0.028, M.black);             // down tube
  for (const z of [0.09, -0.09]) {
    tube([[-0.2, 0.36, z], [-0.5, 0.36, z], [-0.78, R, z]], 0.022, M.black, 24);           // swingarm
    // R-Spec piggyback rear shocks: body, gold spring, reservoir
    const top = new THREE.Vector3(-0.42, 0.74, z * 1.2), bot = new THREE.Vector3(-0.68, 0.38, z * 1.2);
    const mid = top.clone().add(bot).multiplyScalar(0.5), dir = top.clone().sub(bot), len = dir.length();
    const body = add(new THREE.CylinderGeometry(0.018, 0.018, len, 12), M.metal, [mid.x, mid.y, mid.z]);
    body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const coil = [];
    for (let t = 0; t <= 1; t += 0.01) { const a = t * Math.PI * 2 * 9; const p = bot.clone().lerp(top, 0.15 + t * 0.62); coil.push(new THREE.Vector3(p.x + Math.cos(a) * 0.035, p.y, p.z + Math.sin(a) * 0.035)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 300, 0.007, 6, false), M.spring);
    const res = add(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 14), M.satin, [top.x - 0.02, top.y - 0.08, top.z + Math.sign(z) * 0.05]);
    res.quaternion.copy(body.quaternion);
  }
  const rake = 0.5;                                                                        // ~29° fork rake
  for (const z of [0.075, -0.075]) {
    const f = add(new THREE.CylinderGeometry(0.03, 0.026, 0.72, 16), M.satin, [0.67, 0.66, z], [0, 0, rake]);
    add(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 16), M.black, [0.6, 0.86, z], [0, 0, rake]);  // fork covers
    void f;
  }
  add(new THREE.BoxGeometry(0.06, 0.04, 0.2), M.black, [0.52, 1.0, 0], [0, 0, rake]);       // triple clamp

  /* ---------- V-twin with fins, crankcase, air cleaner ---------- */
  add(new THREE.BoxGeometry(0.42, 0.22, 0.24), M.black, [-0.02, 0.33, 0]);                 // crankcase
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 32), M.metal, [-0.02, 0.33, 0.14], [Math.PI / 2, 0, 0]); // left case cover
  for (const [ang, x] of [[-0.45, 0.12], [0.5, -0.16]]) {
    const cyl = new THREE.Group(); cyl.position.set(x, 0.52, 0); cyl.rotation.z = ang;
    for (let i = 0; i < 9; i++) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.1 - i * 0.002, 0.1 - i * 0.002, 0.012, 24), M.satin);
      fin.position.y = -0.1 + i * 0.026; cyl.add(fin);
    }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.24, 20), M.black); cyl.add(core);
    const headC = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.17), M.satin); headC.position.y = 0.14; cyl.add(headC);
    cyl.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    bike.add(cyl);
  }
  add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 32), M.satin, [-0.02, 0.56, -0.16], [Math.PI / 2, 0, 0]); // round air cleaner (right)
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.065, 32), M.metal, [-0.02, 0.56, -0.17], [Math.PI / 2, 0, 0]);

  /* ---------- tank, seat, fenders ---------- */
  const tank = add(new THREE.SphereGeometry(0.5, 40, 24), M.paint, [0.2, 0.98, 0], [0, 0, -0.08], [0.62, 0.3, 0.38]);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), M.metal, [0.3, 1.13, 0]);         // fuel cap
  add(new THREE.SphereGeometry(0.5, 32, 16), M.seat, [-0.28, 0.82, 0], [0, 0, 0.12], [0.44, 0.1, 0.32]);
  add(new THREE.TorusGeometry(R + 0.02, 0.06, 10, 32, Math.PI * 0.62), M.paint, [-0.78, R, 0], [0, 0, Math.PI * 0.25], [1, 1, 1.6]); // rear fender
  add(new THREE.TorusGeometry(R + 0.03, 0.05, 10, 32, Math.PI * 0.4), M.paint, [0.82, R, 0], [0, 0, Math.PI * 0.32], [1, 1, 1.5]);  // front fender
  add(new THREE.BoxGeometry(0.06, 0.03, 0.08), M.tail, [-1.08, 0.66, 0]);                 // taillight
  add(new THREE.BoxGeometry(0.16, 0.012, 0.11), M.black, [-1.08, 0.58, 0], [0, 0, 0.5]);  // plate bracket

  /* ---------- headlight, bars, mirrors, speedo ---------- */
  add(new THREE.CylinderGeometry(0.1, 0.085, 0.12, 32), M.black, [0.66, 1.0, 0], [0, 0, Math.PI / 2]);
  add(new THREE.CircleGeometry(0.088, 32), M.lens, [0.725, 1.0, 0], [0, Math.PI / 2, 0]);
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), M.black, [0.48, 1.12, 0], [0, 0, 0.4]); // speedo pod
  tube([[0.42, 1.17, 0.36], [0.5, 1.16, 0.2], [0.52, 1.12, 0], [0.5, 1.16, -0.2], [0.42, 1.17, -0.36]], 0.016, M.black, 32);
  for (const z of [0.4, -0.4]) {
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 12), M.rubber, [0.42, 1.17, z], [Math.PI / 2, 0, 0]);  // grips
    tube([[0.46, 1.17, z * 0.75], [0.44, 1.32, z * 0.82]], 0.006, M.black, 6);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), M.black, [0.44, 1.34, z * 0.82], [0, 0, Math.PI / 2]);
  }

  /* ---------- 2-into-1 exhaust (right side) ---------- */
  tube([[0.18, 0.58, -0.08], [0.24, 0.4, -0.16], [0.08, 0.24, -0.2], [-0.3, 0.26, -0.21]], 0.026, M.black);
  tube([[-0.22, 0.66, -0.08], [-0.24, 0.48, -0.17], [-0.3, 0.3, -0.21]], 0.026, M.black);
  add(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 24), M.black, [-0.52, 0.29, -0.21], [0, 0, Math.PI / 2 + 0.06]);
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20), M.satin, [-0.735, 0.302, -0.21], [0, 0, Math.PI / 2]);
  // footpegs, kickstand, belt
  for (const z of [0.2, -0.2]) add(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10), M.satin, [0.14, 0.26, z], [Math.PI / 2, 0, 0]);
  add(new THREE.BoxGeometry(0.62, 0.02, 0.025), M.black, [-0.42, 0.34, 0.14], [0, 0, 0.02]);

  // rotate around the bike's center, not its contact patch
  bike.position.set(0.04, -0.6, 0);
  const pivot = new THREE.Group(); pivot.position.y = 0.6; pivot.add(bike); scene.add(pivot);
  pivot.rotation.y = -0.6;

  /* ---------- free rotation: drag any direction, with momentum ---------- */
  // Horizontal drags turn it around the screen's vertical axis, vertical drags flip it around the
  // screen's horizontal axis, so it can go end over end or upside down.
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), qy = new THREE.Quaternion();
  let wx = 0, wy = reduce ? 0 : 0.004, drag = null;
  const turn = (dx, dy) => { q.setFromAxisAngle(AX, dx); qy.setFromAxisAngle(AY, dy); pivot.quaternion.premultiply(qy).premultiply(q); };
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => { resetting = false; drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    wy = (e.clientX - drag.x) * 0.01; wx = (e.clientY - drag.y) * 0.01;
    turn(wx, wy); drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { drag = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  // reset: ease back to the starting pose
  const home = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.6, 0));
  let resetting = false;
  const reset = () => { resetting = true; wx = 0; wy = 0; };
  canvas.addEventListener('dblclick', reset);
  canvas.style.cursor = 'grab';

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 1.2 ? 6.6 : 5.6; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const spin = 0.004;
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (resetting && !drag) {
      pivot.quaternion.slerp(home, reduce ? 1 : 0.12);
      if (pivot.quaternion.angleTo(home) < 0.002) { pivot.quaternion.copy(home); resetting = false; wy = reduce ? 0 : spin; }
    } else if (!drag) { wx *= 0.95; wy = wy * 0.95 + (reduce ? 0 : spin) * 0.05; turn(wx, wy); }
    renderer.render(scene, camera);
  });

  return { reset };
}
