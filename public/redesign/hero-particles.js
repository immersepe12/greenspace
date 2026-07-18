/* Home hero — single energised harmonic wave, horizontally centered.
   Multi-frequency sine stack (fundamental + harmonics) so the line looks alive instead of clinical.
   Soft outer glow + tight core stroke + a traveling brightness pulse make it read as energised.
   Cursor disrupts the wave via a localized Gaussian lens. */
(function () {
  if (!document.body.classList.contains('home-min')) return;
  var hero = document.querySelector('.hero-min');
  if (!hero) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-particles-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(2, window.devicePixelRatio || 1);

  var W = 0, H = 0;
  var baseY = 0;
  var mx = -9999, my = -9999;
  var tx = -9999, ty = -9999;
  var hasCursor = false;
  var t = 0;

  function size() {
    var r = hero.getBoundingClientRect();
    W = Math.max(320, r.width);
    H = Math.max(320, r.height);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Anchor the wave's baseline to the center of the Quantum Ayurveda logo
    var logoEl = hero.querySelector('.hm-logo');
    if (logoEl) {
      var lr = logoEl.getBoundingClientRect();
      baseY = lr.top + lr.height / 2 - r.top;
    } else {
      baseY = H * 0.5;
    }
  }

  function onMove(e) {
    var r = hero.getBoundingClientRect();
    var x = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX)) - r.left;
    var y = (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY)) - r.top;
    if (x >= 0 && x <= r.width && y >= 0 && y <= r.height) {
      tx = x; ty = y; hasCursor = true;
    } else {
      hasCursor = false;
    }
  }
  function onLeave() { hasCursor = false; }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  hero.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', size);

  // Compute the wave's y at a given x and time.
  // Three sine layers (fundamental + 2 harmonics) give a richer, energised shape.
  function waveY(x, t) {
    var amp = Math.min(70, H * 0.07);            // primary amplitude scales with hero height
    var k1 = 0.0040;                              // fundamental wavenumber (cycles per px)
    var k2 = k1 * 2.3;
    var k3 = k1 * 3.7;
    // slower phase rates — lazier, more meditative flow
    var ph1 = t * 0.22;
    var ph2 = t * 0.33;
    var ph3 = t * 0.44;
    return amp * Math.sin(x * k1 + ph1)
         + amp * 0.35 * Math.sin(x * k2 + ph2)
         + amp * 0.18 * Math.sin(x * k3 + ph3);
  }

  // Cursor-induced displacement.
  // Continuous proportional force (no sign flip) → no jitter when the cursor crosses the line.
  // Horizontal Gaussian lens + soft tanh cap on magnitude keep the bend smooth everywhere.
  function disrupt(x, y) {
    if (!hasCursor) return 0;
    var SIGMA = 180;
    var dx = x - mx;
    if (dx < -SIGMA * 3 || dx > SIGMA * 3) return 0;
    var horiz = Math.exp(-(dx * dx) / (2 * SIGMA * SIGMA));
    var dy = y - my;
    // tanh: linear near zero (smooth crossing), softly caps far from cursor (no blowup)
    var capped = 70 * Math.tanh(dy / 70);
    return capped * horiz;
  }

  function buildPath(t) {
    var step = 4;
    ctx.beginPath();
    var started = false;
    for (var x = -step; x <= W + step; x += step) {
      var y = baseY + waveY(x, t) + disrupt(x, baseY + waveY(x, t));
      if (!started) { ctx.moveTo(x, y); started = true; }
      else { ctx.lineTo(x, y); }
    }
  }

  // Bright traveling pulse along the wave — energy reads as moving.
  function drawPulse(t) {
    var pulseSpeed = 95;                  // px per second (slower travel)
    var pulseX = ((t * pulseSpeed) % (W + 600)) - 300;
    var pulseSigma = 110;
    var samples = 8;
    for (var i = -samples; i <= samples; i++) {
      var x = pulseX + i * (pulseSigma / 3);
      if (x < -20 || x > W + 20) continue;
      var y = baseY + waveY(x, t) + disrupt(x, baseY + waveY(x, t));
      var falloff = Math.exp(-(i * i) / 18);
      ctx.fillStyle = 'rgba(255,238,200,' + (0.55 * falloff).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 3.2 * falloff + 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // central bright head
    var yH = baseY + waveY(pulseX, t) + disrupt(pulseX, baseY + waveY(pulseX, t));
    var grd = ctx.createRadialGradient(pulseX, yH, 0, pulseX, yH, 28);
    grd.addColorStop(0, 'rgba(255,245,215,0.95)');
    grd.addColorStop(0.4, 'rgba(227,191,112,0.55)');
    grd.addColorStop(1, 'rgba(227,191,112,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(pulseX, yH, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame() {
    requestAnimationFrame(frame);
    t += 1 / 60;

    if (hasCursor) {
      // gentler chase → smoother cursor motion
      mx += (tx - mx) * 0.10;
      my += (ty - my) * 0.10;
    } else {
      mx += (W * 1.5 - mx) * 0.04;
      my += (H * 1.5 - my) * 0.04;
    }

    ctx.clearRect(0, 0, W, H);

    // 1) outer glow — wide and soft, gives the line its "energised" aura
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(227,191,112,0.16)';
    ctx.lineWidth = 14;
    buildPath(t);
    ctx.stroke();

    // 2) mid halo — warmer, brighter
    ctx.strokeStyle = 'rgba(255,222,150,0.28)';
    ctx.lineWidth = 6;
    buildPath(t);
    ctx.stroke();

    // 3) tight core — slow shimmer in alpha
    var shimmer = 0.78 + 0.18 * Math.sin(t * 0.75);
    ctx.strokeStyle = 'rgba(255,245,215,' + shimmer.toFixed(3) + ')';
    ctx.lineWidth = 1.7;
    buildPath(t);
    ctx.stroke();

    // 4) traveling energy pulse
    drawPulse(t);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(227,191,112,0.18)';
    ctx.lineWidth = 12;
    buildPath(0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,215,0.85)';
    ctx.lineWidth = 1.6;
    buildPath(0);
    ctx.stroke();
  }

  size();
  if (!reduce) requestAnimationFrame(frame);
  else drawStatic();
})();
