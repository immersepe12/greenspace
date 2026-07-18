/* Home story — hydrogen-orbital electron cloud, centred on the mortar & pestle.
   Port of the user's "Particles Swarm Export" (n=3, l=2, |m|=1 d-orbital probability
   cloud: radial nodes, spherical-harmonic lobes, breathing, cloud jitter) adapted to
   the site: brand gold->green palette on cream, vine-gated ignition, IO/tab gating.
   Distribution: HIGHLY DENSE at the mortar, with a power-law tail that scatters the
   cloud across the entire story section (far particles fade toward the cream).
   Mouse-reactive like the hero swarm: eased cursor repel with an influence envelope.
   Reduced-motion users skip it entirely (the static SVG scene remains). */
import * as THREE from '/redesign/vendor/three.module.js';

(function () {
  if (!document.body.classList.contains('home-min')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const story = document.getElementById('story');
  const mortar = document.querySelector('.story-mortar');
  if (!story || !mortar) return;

  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 760;
  const COUNT = isMobile ? 2200 : 5000;
  const PARAMS = { n: 3, l: 2, m: 1, scale: 20, spin: 0.3, breathe: 0.4, jitter: 0.25 };
  const TAU = Math.PI * 2;
  const VIS_H = 2 * 100 * Math.tan(Math.PI / 6);   // world units visible at z=0 (fov 60, cam z=100)

  let canvas, renderer, scene, camera, mesh;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const target = new THREE.Vector3();
  const positions = [];
  let W = 0, H = 0, halfW = 60, spreadMax = 2.5;

  try {
    canvas = document.createElement('canvas');
    canvas.className = 'sm-orbital';
    canvas.setAttribute('aria-hidden', 'true');
    story.insertBefore(canvas, story.firstChild);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(isMobile ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
  } catch (e) {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.set(0, 0, 100);

  const geometry = new THREE.TetrahedronGeometry(0.2);
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.66, depthWrite: false });
  mesh = new THREE.InstancedMesh(geometry, material, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
  scene.add(mesh);

  for (let i = 0; i < COUNT; i++) {
    positions.push(new THREE.Vector3((Math.random() - 0.5) * 140, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 60));
  }

  // canvas covers the WHOLE story section; the cloud's origin sits on the mortar
  function size() {
    const sr = story.getBoundingClientRect();
    const mr = mortar.getBoundingClientRect();
    W = Math.max(320, sr.width); H = Math.max(320, sr.height);
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const upp = VIS_H / H;                                   // world units per px
    const dx = (mr.left + mr.width / 2) - (sr.left + sr.width / 2);
    const dy = (mr.top + mr.height / 2) - (sr.top + sr.height / 2);
    mesh.position.set(dx * upp, -dy * upp, 0);
    halfW = (VIS_H * camera.aspect) / 2;
    // how far the tail must reach so the cloud covers the full width from the mortar
    spreadMax = Math.max(1.6, (halfW + Math.abs(mesh.position.x)) / 40);
  }
  size();
  let lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; size();
  });

  // cursor — hero-style eased repel with influence envelope, tracked over the section
  let hasCur = false, tx = 0, ty = 0, mx = 0, my = 0, infl = 0;
  function onMove(e) {
    const sr = story.getBoundingClientRect();
    const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (cx === null) return;
    const x = cx - sr.left, y = cy - sr.top;
    if (x < 0 || x > sr.width || y < 0 || y > sr.height) { hasCur = false; return; }
    tx = (x / sr.width) * 2 - 1;
    ty = -((y / sr.height) * 2 - 1);
    hasCur = true;
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  story.addEventListener('pointerleave', function () { hasCur = false; });

  let visible = false;
  new IntersectionObserver(function (en) { visible = en.some(e => e.isIntersecting); }, { threshold: 0, rootMargin: '100px 0px' }).observe(story);

  // the user's orbital math (n/l/m fixed by PARAMS) + page-wide tail + cursor repel
  function updateInstances(time) {
    const n = PARAMS.n, lMax = Math.min(n - 1, PARAMS.l), mAbs = Math.min(lMax, PARAMS.m);
    const scale = PARAMS.scale, spin = PARAMS.spin, breathe = PARAMS.breathe, cloudJitter = PARAMS.jitter;
    const a0 = scale * 0.5;

    mx += (tx - mx) * 0.10;
    my += (ty - my) * 0.10;
    infl += ((hasCur ? 1 : 0) - infl) * 0.06;
    const cursorX = mx * halfW, cursorY = my * (VIS_H / 2);
    const REP = VIS_H * 0.38, REP2 = REP * REP;
    const STR = 16 * infl;
    const rotY = time * 0.25, cosR = Math.cos(rotY), sinR = Math.sin(rotY);

    for (let i = 0; i < COUNT; i++) {
      const h1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const rand1 = h1 - Math.floor(h1);
      const h2 = Math.sin(i * 39.3468 + 11.135) * 24634.6345;
      const rand2 = h2 - Math.floor(h2);
      const h3 = Math.sin(i * 93.9898 + 47.233) * 95734.5453;
      const rand3 = h3 - Math.floor(h3);
      const h4 = Math.sin(i * 57.3123 + 13.71) * 65731.7341;
      const rand4 = h4 - Math.floor(h4);

      const u = (i + 1) / COUNT;
      const baseR = -Math.log(1.0 - u * 0.999);
      const radialPower = (n * n) - (n - 1 - lMax);
      let r = baseR * a0 * (n * n) * 0.5 / Math.max(1, radialPower * 0.3);

      const nodeCount = n - lMax - 1;
      const nodeMod = nodeCount > 0
        ? Math.abs(Math.sin((r / (a0 * n)) * Math.PI * (nodeCount + 1)))
        : 1.0;
      r *= 0.6 + 0.8 * nodeMod;

      const phi = rand1 * TAU + time * spin;
      const theta = Math.acos(1.0 - 2.0 * rand2);
      const cosT = Math.cos(theta), sinT = Math.sin(theta);
      let lobe;
      if (lMax === 0) lobe = 1.0;
      else if (lMax === 1) {
        lobe = mAbs === 0 ? cosT * cosT : sinT * sinT * Math.cos(phi) * Math.cos(phi);
      } else if (lMax === 2) {
        if (mAbs === 0) { const c2 = 3.0 * cosT * cosT - 1.0; lobe = c2 * c2 * 0.25; }
        else if (mAbs === 1) lobe = sinT * sinT * cosT * cosT * 4.0;
        else lobe = sinT * sinT * sinT * sinT * Math.cos(2.0 * phi) * Math.cos(2.0 * phi);
      } else {
        const bands = Math.cos(theta * lMax); lobe = bands * bands;
        if (mAbs > 0) { const az = Math.cos(mAbs * phi); lobe *= az * az; }
      }

      const lobeWeight = 0.15 + 0.85 * Math.min(1.0, lobe);
      r *= lobeWeight;
      const breath = 1.0 + breathe * 0.15 * Math.sin(time * 1.2 + r * 0.05);
      r *= breath;
      const jitter = 1.0 + (rand3 - 0.5) * cloudJitter;
      r *= jitter;
      r += 7;                                          // hollow the immediate centre

      // PAGE-WIDE TAIL: most particles hug the core (dense centre); a power-law
      // minority is flung far across the section
      const tail = 1.0 + Math.pow(rand4, 1.7) * spreadMax;
      r *= tail;
      const far = Math.min(1.0, Math.max(0.0, (tail - 1.0) / spreadMax));

      const sinTheta = Math.sin(theta);
      let px = r * sinTheta * Math.cos(phi);
      let py = r * Math.cos(theta);
      let pz = r * sinTheta * Math.sin(phi);

      // world position (mesh rotates about Y, then is offset onto the mortar) —
      // compute the rotated world XY so the cursor repel matches what's on screen
      let wx = px * cosR + pz * sinR + mesh.position.x;
      let wy = py + mesh.position.y;
      if (infl > 0.001) {
        const dxc = wx - cursorX, dyc = wy - cursorY;
        const d2 = dxc * dxc + dyc * dyc;
        if (d2 < REP2 && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const f = 1 - d / REP;
          const push = f * f * STR;
          // push back in the mesh's local (unrotated) frame
          const pushX = (dxc / d) * push, pushY = (dyc / d) * push;
          px += pushX * cosR;            // inverse-rotate the XZ push
          pz += -pushX * sinR;
          py += pushY;
        }
      }

      target.set(px, py, pz);

      // brand palette: probability density -> gold..green; far particles fade to cream
      const phaseShift = mAbs > 0 ? 0.5 + 0.5 * Math.cos(mAbs * phi) : 1.0;
      const dens = Math.min(1.0, lobe) * phaseShift;
      const hue = 0.09 + 0.20 * dens;
      const nearCore = Math.max(0, 1 - r / 26);
      const saturation = (0.5 + 0.32 * nodeMod) * (1 - far * 0.55) * (1 - nearCore * 0.45);
      const lightness = (0.34 + 0.26 * dens) + far * 0.30 + nearCore * 0.24;
      color.setHSL(hue, saturation, Math.min(0.8, lightness));

      positions[i].lerp(target, 0.1);
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  const clock = new THREE.Clock();
  let alphaT = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const live = mortar.classList.contains('sm-live');
    alphaT += ((live ? 1 : 0) - alphaT) * 0.03;          // vine-gated fade-in
    canvas.style.opacity = alphaT.toFixed(3);
    if (alphaT < 0.01) return;
    const time = clock.getElapsedTime();
    updateInstances(time);
    mesh.rotation.y = time * 0.25;                        // the export's auto-spin
    mesh.rotation.x = Math.sin(time * 0.07) * 0.22;
    renderer.render(scene, camera);
  }
  frame();
})();
