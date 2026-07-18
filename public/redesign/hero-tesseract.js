/* Home hero — Tesseract Observer particle swarm (experiment branch).
   Port of the React-Three-Fiber sketch (universe_through_tessaractb.jsx) to vanilla Three.js.
   The algorithm:
     - particles live on a 4D hypersphere shell
     - projected to 3D via stereographic projection from a moving w-axis viewpoint
     - layered with a quantum-chaos interference field
     - radial breathing (cosmic drift)
   Tuned here for a LIGHT cream hero background:
     - Transparent canvas (the hero's cream shows through)
     - Muted gold / sage / earth palette (no bright bloom)
     - Particles avoid the central logo zone via an inner radius mask
   The other sections get their own (lighter, 2D) swarms — see section-swarms.js. */
import * as THREE from '/redesign/vendor/three.module.js';

(function () {
  if (!document.body.classList.contains('home-min')) return;
  const hero = document.querySelector('.hero-min');
  if (!hero) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let canvas, renderer, scene, camera, mesh, animId;
  const dummy = new THREE.Object3D();
  const target = new THREE.Vector3();
  const pColor = new THREE.Color();

  // Cursor state — tracked in normalized device coords (-1..1) on the hero element.
  let hasCursor = false;
  let tx = 0, ty = 0;
  let mx = 0, my = 0;
  let influence = 0;

  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  const COUNT = isMobile ? 3200 : 7800;
  const PARAMS = { scale: 90, chaos: 1.1, fold: 1.45, drift: 0.35 };
  const positions = new Array(COUNT);
  for (let i = 0; i < COUNT; i++) positions[i] = new THREE.Vector3(
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100
  );

  function size() {
    const r = hero.getBoundingClientRect();
    const W = Math.max(320, r.width);
    const H = Math.max(320, r.height);
    if (renderer) renderer.setSize(W, H, false);
    if (camera) {
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    return { W, H };
  }

  function init() {
    canvas = document.createElement('canvas');
    canvas.className = 'hero-tesseract-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    const { W, H } = size();
    camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
    camera.position.set(0, 0, 110);
    renderer.setSize(W, H, false);

    const geometry = new THREE.TetrahedronGeometry(0.22);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: false,
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    });

    mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const colorArr = new Float32Array(COUNT * 3);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArr, 3);
    scene.add(mesh);

    window.addEventListener('resize', size);

    function onMove(e) {
      const r = hero.getBoundingClientRect();
      const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      if (cx === null || cy === null) return;
      const x = cx - r.left;
      const y = cy - r.top;
      if (x < 0 || x > r.width || y < 0 || y > r.height) { hasCursor = false; return; }
      tx = (x / r.width) * 2 - 1;
      ty = -((y / r.height) * 2 - 1);
      hasCursor = true;
    }
    function onLeave() { hasCursor = false; }
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
  }

  function paint(i, t, w4, r4, distNorm, psi) {
    const wNorm = (w4 / (r4 + 0.001)) * 0.5 + 0.5;
    const hue = 0.10 + 0.20 * wNorm + 0.025 * Math.sin(t * 0.2 + i * 0.0015);
    const sat = 0.35 + 0.20 * Math.abs(Math.sin(psi * 1.4 + t * 0.6));
    const interference = 0.5 + 0.5 * Math.sin(distNorm * 7.2 - t * 0.9);
    const lit = 0.42 + 0.18 * interference * (1.0 - distNorm * 0.35);
    pColor.setHSL(hue, sat, lit);
  }

  function updateInstances(time) {
    const t = time * 0.18;
    const scale = PARAMS.scale;
    const chaos = PARAMS.chaos;
    const fold = PARAMS.fold;
    const drift = PARAMS.drift;
    const viewW = scale * (1.2 + 0.4 * Math.sin(t * 0.5));
    const innerExclude = scale * 0.32;
    const innerExclude2 = innerExclude * innerExclude;

    mx += (tx - mx) * 0.10;
    my += (ty - my) * 0.10;
    influence += ((hasCursor ? 1 : 0) - influence) * 0.06;

    let cursorX = 0, cursorY = 0;
    if (camera) {
      const halfH = Math.abs(camera.position.z) * Math.tan((camera.fov * Math.PI) / 360);
      const halfW = halfH * camera.aspect;
      cursorX = mx * halfW;
      cursorY = my * halfH;
    }
    const CURSOR_RADIUS = scale * 0.28;
    const CURSOR_RADIUS2 = CURSOR_RADIUS * CURSOR_RADIUS;
    const CURSOR_STRENGTH = scale * 0.18 * influence;

    for (let i = 0; i < COUNT; i++) {
      const phi = (i / COUNT) * 6.2831853;
      const theta = Math.acos(1 - 2 * ((i * 1.6180339887) % 1));
      const layer = Math.floor(i / (COUNT * 0.25));
      const localT = (i % (COUNT * 0.25)) / (COUNT * 0.25);
      const psi = localT * 6.2831853 + t;
      const xi = phi + t * 0.07 * (layer + 1);

      const r4 = scale * (0.3 + 0.7 * (i / COUNT));
      const sinTh = Math.sin(theta);
      const cosTh = Math.cos(theta);
      const sinPhi = Math.sin(xi);
      const cosPhi = Math.cos(xi);
      const cosPsi = Math.cos(psi + fold);

      let x4 = r4 * sinTh * cosPhi;
      let y4 = r4 * sinTh * sinPhi;
      let z4 = r4 * cosTh;
      let w4 = r4 * cosPsi * 0.9;

      const wDenom = viewW - w4;
      const wSafe = wDenom + (Math.abs(wDenom) < 0.5 ? 0.5 : 0);
      const proj = viewW / wSafe;

      let px = x4 * proj;
      let py = y4 * proj;
      let pz = z4 * proj;

      const noiseFreq = 0.04 * chaos;
      const nx = Math.sin(px * noiseFreq + t * 1.3) * Math.cos(py * noiseFreq - t * 0.9);
      const ny = Math.sin(py * noiseFreq + t * 0.7) * Math.cos(pz * noiseFreq + t * 1.1);
      const nz = Math.sin(pz * noiseFreq - t * 1.5) * Math.cos(px * noiseFreq + t * 0.6);
      const noiseAmp = scale * 0.12 * chaos;
      px += nx * noiseAmp;
      py += ny * noiseAmp;
      pz += nz * noiseAmp;

      const breathe = 1.0 + drift * 0.15 * Math.sin(t * 0.4 + (i / COUNT) * 3.14159);
      px *= breathe;
      py *= breathe;
      pz *= breathe;

      if (influence > 0.001) {
        const cdx = px - cursorX;
        const cdy = py - cursorY;
        const cd2 = cdx * cdx + cdy * cdy;
        if (cd2 < CURSOR_RADIUS2 && cd2 > 0.001) {
          const cd = Math.sqrt(cd2);
          const f = 1 - cd / CURSOR_RADIUS;
          const push = f * f * CURSOR_STRENGTH;
          px += (cdx / cd) * push;
          py += (cdy / cd) * push;
        }
      }

      const r2 = px * px + py * py + pz * pz;
      if (r2 < innerExclude2 && r2 > 0.001) {
        const ratio = innerExclude / Math.sqrt(r2);
        px *= ratio;
        py *= ratio;
        pz *= ratio;
      }

      const maxCoord = 600;
      if (px < -maxCoord) px = -maxCoord; else if (px > maxCoord) px = maxCoord;
      if (py < -maxCoord) py = -maxCoord; else if (py > maxCoord) py = maxCoord;
      if (pz < -maxCoord) pz = -maxCoord; else if (pz > maxCoord) pz = maxCoord;

      target.set(px, py, pz);

      const dist = Math.sqrt(px * px + py * py + pz * pz);
      const distNorm = Math.min(dist / (scale * 2.5), 1.0);
      paint(i, t, w4, r4, distNorm, psi);

      positions[i].lerp(target, 0.08);
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, pColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  let visible = true;
  function setupVisibilityWatch() {
    const io = new IntersectionObserver((entries) => {
      visible = entries.some(e => e.isIntersecting);
    }, { threshold: 0 });
    io.observe(hero);
    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden && visible;
    });
  }

  const clock = new THREE.Clock();
  function frame() {
    animId = requestAnimationFrame(frame);
    if (!visible) return;
    const elapsed = clock.getElapsedTime();
    updateInstances(elapsed);
    mesh.rotation.y = elapsed * 0.06;
    mesh.rotation.x = Math.sin(elapsed * 0.04) * 0.18;
    renderer.render(scene, camera);
  }

  try {
    init();
    setupVisibilityWatch();
    if (reduce) {
      updateInstances(0);
      renderer.render(scene, camera);
    } else {
      frame();
    }
  } catch (e) {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    console.warn('[hero-tesseract] init failed:', e);
  }
})();
