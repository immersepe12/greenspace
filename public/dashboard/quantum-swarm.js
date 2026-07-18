/* GreenSpace Command — Quantum Bloom Singularity backdrop.
   Adaptation of the user's ParticlesSwarm sketch (ai_look_2.js): folded
   toroidal manifold, golden-ratio packing, resonant turbulence — retuned to
   the HUD palette (quantum teal + brand gold), no post-processing (additive
   blending fakes the bloom), and wired for interaction:
     - pointer gravity well + camera parallax
     - click shockwave
     - scroll tilt (echoes the main site's scroll-mapped motion)
     - window.GSFX API: warp() on view changes, pulse() on approvals
   Follows the main site's hero conventions (vendor three.module.js,
   reduced-motion gate, mobile particle budget, DPR cap). */
import * as THREE from '/redesign/vendor/three.module.js';

(function () {
  const host = document.getElementById('fxSwarm');
  if (!host) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;                      // CSS grid backdrop still shows

  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  const COUNT = isMobile ? 800 : 2000;          // minimal: a constellation, not a storm
  const PARAMS = { scale: 74, flow: 0.8, fold: 7.2, turbulence: 0.85, resonance: 3.6, gravity: 1.4, bloom: 2.2 };

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030a09, 0.0085);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 132);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  // gentle entrance: the canvas fades in once the swarm is already formed
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 1.8s ease';
  host.appendChild(renderer.domElement);

  const geometry = new THREE.TetrahedronGeometry(0.28);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const target = new THREE.Vector3();
  const pColor = new THREE.Color();
  const goldColor = new THREE.Color(0xd9a23c);
  const positions = new Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i] = new THREE.Vector3();
    mesh.setColorAt(i, pColor.setHex(0x4de8c2));
  }
  let firstFrame = true;   // first pass snaps particles onto the manifold — no visible assembly

  /* ---- interaction state ---- */
  let mx = 0, my = 0;                       // pointer NDC, eased
  let tmx = 0, tmy = 0;
  const pointerWorld = new THREE.Vector3(9999, 9999, 0);
  let burst = 0;                            // click shockwave 0..1
  let flowBoost = 0;                        // GSFX.warp()
  let flash = 0;                            // GSFX.pulse() gold tint
  let foldTarget = PARAMS.fold;
  let scrollTilt = 0;

  addEventListener('pointermove', function (e) {
    tmx = (e.clientX / innerWidth) * 2 - 1;
    tmy = -(e.clientY / innerHeight) * 2 + 1;
  }, { passive: true });
  addEventListener('click', function () { burst = 1; }, { passive: true });
  addEventListener('scroll', function () {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollTilt = (scrollY / max);
  }, { passive: true });

  /* the interface talks to the swarm through this */
  window.GSFX = {
    warp: function () {
      flowBoost = 1;
      const folds = [5.2, 7.2, 9.6, 11.4];
      foldTarget = folds[Math.floor(Math.random() * folds.length)];
    },
    pulse: function () { flash = 1; },
    burst: function () { burst = 1; }
  };

  function projectPointer() {
    // pointer ray intersected with the z=0 plane, where the swarm lives
    const v = new THREE.Vector3(mx, my, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    if (Math.abs(dir.z) < 0.0001) return;
    const t = -camera.position.z / dir.z;
    pointerWorld.copy(camera.position).addScaledVector(dir, t);
  }

  const clock = new THREE.Clock();
  let paused = false;
  document.addEventListener('visibilitychange', function () { paused = document.hidden; });
  addEventListener('resize', function () {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const pi2 = Math.PI * 2, phi = 1.618033988749895;

  function animate() {
    requestAnimationFrame(animate);
    if (paused) return;

    // eased state
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;
    burst *= 0.94;
    flowBoost *= 0.965;
    flash *= 0.94;
    PARAMS.fold += (foldTarget - PARAMS.fold) * 0.03;
    projectPointer();

    // camera: parallax toward pointer + scroll dive (main-site scroll language)
    camera.position.x += (mx * 16 - camera.position.x) * 0.04;
    camera.position.y += (my * 10 - camera.position.y) * 0.04;
    camera.position.z += ((132 - scrollTilt * 34) - camera.position.z) * 0.03;
    camera.lookAt(0, 0, 0);
    mesh.rotation.y += 0.0005 + flowBoost * 0.003;
    mesh.rotation.x = scrollTilt * 0.3;

    const time = clock.getElapsedTime() * (1 + flowBoost * 1.8);
    const { scale, flow, fold, turbulence, resonance, gravity, bloom } = PARAMS;
    const t = time * flow;

    for (let i = 0; i < COUNT; i++) {
      const u = i / COUNT;
      const k = i + 1;
      const shellU = Math.floor(u * 64) / 64;

      const ga = k * 2.399963229728653;
      const h = -1 + 2 * u;
      const r = Math.sqrt(1 - h * h);
      const baseX = Math.cos(ga) * r, baseY = h, baseZ = Math.sin(ga) * r;

      const wave1 = Math.sin((u * fold + t * 0.7) * pi2);
      const wave2 = Math.cos((u * fold * 0.7 - t * 0.35) * pi2);
      const wave3 = Math.sin((baseX * baseZ * resonance + t) * pi2);

      const torusA = Math.atan2(baseZ, baseX);
      const torusR = scale * (0.42 + 0.16 * wave1 + 0.08 * wave2);
      const vortex = 1 / (0.15 + Math.abs(baseY) * gravity);

      const foldX = Math.cos(torusA * fold + t * 0.4) * torusR;
      const foldY = baseY * scale * 0.9 + Math.sin(torusA * resonance - t) * scale * 0.12;
      const foldZ = Math.sin(torusA * fold + t * 0.4) * torusR;

      const field1 = Math.sin(foldZ * 0.035 + t * 1.2);
      const field2 = Math.cos(foldX * 0.028 - t * 0.9);
      const field3 = Math.sin((foldX + foldY + foldZ) * 0.012 + t * 0.5);

      const qx = foldX + field1 * scale * 0.12 * vortex;
      const qy = foldY + field2 * scale * 0.1 * vortex;
      const qz = foldZ + field3 * scale * 0.14 * vortex;

      const spiral = turbulence * Math.sin(ga * phi + t * 2);
      const spiral2 = turbulence * Math.cos(ga * 0.7 - t * 1.6);

      const radial = Math.sqrt(qx * qx + qz * qz) + 0.0001;
      const lens = 1 + bloom * 0.18 / radial;

      let nx = qx * lens + spiral * scale * 0.06;
      let ny = qy * lens + spiral2 * scale * 0.05;
      let nz = qz * lens + Math.sin(radial * 0.08 - t * 1.5) * scale * 0.04;

      // click shockwave: radial impulse from the core
      if (burst > 0.02) {
        const rr = Math.sqrt(nx * nx + ny * ny + nz * nz) + 0.001;
        const push = burst * 26 * Math.sin(u * pi2 * 2 + rr * 0.05);
        nx += (nx / rr) * push; ny += (ny / rr) * push; nz += (nz / rr) * push;
      }
      // pointer gravity well: particles shy away from the cursor
      const pdx = nx - pointerWorld.x, pdy = ny - pointerWorld.y;
      const pd2 = pdx * pdx + pdy * pdy;
      if (pd2 < 900) {
        const f = (1 - pd2 / 900) * 14;
        const pd = Math.sqrt(pd2) + 0.001;
        nx += (pdx / pd) * f; ny += (pdy / pd) * f;
      }

      target.set(nx, ny, nz);
      if (firstFrame) positions[i].copy(target);
      else positions[i].lerp(target, 0.09);
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // palette: hushed teal band with a rare golden thread
      const energy = Math.sin(radial * 0.05 - t * 2);
      if (i % 28 === 0) {
        pColor.setHSL(0.105 + 0.02 * wave1, 0.75, 0.4 + 0.1 * energy);
      } else {
        const hue = 0.44 + 0.07 * Math.sin(u * pi2 * 3 + t * 0.3) + 0.045 * Math.sin(radial * 0.03 + wave3 * 2) + 0.03 * energy;
        const sat = Math.min(0.85, Math.max(0, 0.5 + 0.18 * Math.cos(radial * 0.025 - t * 0.6) + 0.08 * Math.sin(shellU * pi2 * 5)));
        const lit = Math.min(0.5, Math.max(0.05, 0.22 + 0.18 * Math.exp(-radial * 0.018) + 0.08 * Math.sin(radial * 0.04 + t * 1.3) + 0.05 * wave1));
        pColor.setHSL(hue - Math.floor(hue), sat, lit);
      }
      if (flash > 0.03) pColor.lerp(goldColor, flash * 0.65);
      mesh.setColorAt(i, pColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      requestAnimationFrame(function () { renderer.domElement.style.opacity = '1'; });
    }
  }
  animate();
})();
