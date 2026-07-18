/* Homepage hero — contained WebGL scene (shared qascene), idle-energized,
   with mouse parallax and a graceful fade as you scroll into the content. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildQAScene } from './qascene.js';

const mount = document.getElementById('hero3d');
const heroEl = document.getElementById('home-hero');
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function fail() { document.documentElement.classList.add('no-webgl'); }

if (mount && heroEl) {
  try { runHero(); } catch (e) { console.error('hero3d error', e); fail(); }
}

function runHero() {
  const W = () => mount.clientWidth, H = () => mount.clientHeight || window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x04140d, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04140d, 0.05);
  const camera = new THREE.PerspectiveCamera(44, W() / H(), 0.1, 100);
  camera.position.set(0, 0.2, 9.4);
  scene.add(new THREE.AmbientLight(0x88aa99, 0.65));
  const key = new THREE.PointLight(0xffe6ad, 20, 60); key.position.set(5, 5, 8); scene.add(key);
  const rim = new THREE.PointLight(0x3fae74, 12, 60); rim.position.set(-6, -2, 4); scene.add(rim);

  const qa = buildQAScene(scene, { particles: W() < 760 ? 3600 : 7000, pixelRatio: renderer.getPixelRatio() });
  // sit the whole motif to the right, behind the headline area
  const baseX = W() < 760 ? 0.4 : 2.3, baseY = W() < 760 ? 0.7 : 0.25;
  qa.group.position.set(baseX, baseY, 0);
  qa.group.rotation.x = 0.15;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.62, 0.6, 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // mouse parallax
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('pointermove', (e) => {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // scroll fade
  let vis = 1;
  function onScroll() {
    const h = heroEl.offsetHeight || window.innerHeight;
    vis = Math.max(0, 1 - Math.max(0, window.scrollY) / (h * 0.9));
    mount.style.opacity = vis.toFixed(3);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (vis <= 0.01) return; // skip work when hero scrolled away
    const T = clock.elapsedTime;
    // idle "energized" state — gently breathing
    const pulse = 0.5 + Math.sin(T * 0.6) * 0.16;
    const st = { energy: pulse, lock: 0.28 + Math.sin(T * 0.4) * 0.06, resonance: 0.62, release: 0 };
    qa.update(dt, st);
    bloom.strength = 0.5 + pulse * 0.22;

    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    qa.group.rotation.y += dt * 0.06 + (mx * 0.0008);
    qa.group.position.x = baseX + mx * 0.5;
    qa.group.position.y = baseY - my * 0.35;
    camera.position.x += (mx * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (0.2 - my * 0.3 - camera.position.y) * 0.04;
    camera.lookAt(qa.group.position.x * 0.5, qa.group.position.y * 0.4, 0);

    composer.render();
  }
  tick();

  window.addEventListener('resize', () => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H()); composer.setSize(W(), H());
    const bx = W() < 760 ? 0.4 : 2.3, by = W() < 760 ? 0.7 : 0.25;
    qa.group.position.set(bx, by, qa.group.position.z);
  });
}
