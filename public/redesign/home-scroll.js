/* Homepage — fixed, scroll-mapped SCI-FI gold instrument (Canvas2D).
   A holographic quantum read-out in gold on warm white: rotating wireframe
   molecular lattice, scanner dial w/ sweeping radar, Bohr orbitals, HUD
   reticles + data read-outs, oscilloscope frequency trace, streaming data
   particles, screen-corner brackets. Evolves with scroll; mouse parallax. */
(function () {
  var mount = document.getElementById('homebg');
  if (!mount) return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  mount.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1, t = 0, p = 0, AM = 1;
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var parts = [];
  var heroEl = document.getElementById('home-hero');

  function clamp(v) { return Math.min(1, Math.max(0, v)); }
  function G(a) { return 'rgba(196,146,52,' + (a * AM) + ')'; }   // gold line
  function GS(a) { return 'rgba(225,189,110,' + (a * AM) + ')'; }  // gold soft / hot
  function ink(a) { return 'rgba(58,68,58,' + (a * AM) + ')'; }    // faint ink for labels

  /* icosahedron wireframe (the quantum lattice) */
  var PHI = 1.618, IV = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
  ], IE = [];
  (function () { for (var i = 0; i < IV.length; i++) for (var j = i + 1; j < IV.length; j++) { var dx = IV[i][0] - IV[j][0], dy = IV[i][1] - IV[j][1], dz = IV[i][2] - IV[j][2]; if (Math.abs(dx * dx + dy * dy + dz * dz - 4) < 0.001) IE.push([i, j]); } })();

  function build() {
    var n = Math.round(Math.min(64, W / 22));
    parts = [];
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0.15 + Math.random() * 0.5, s: 0.6 + Math.random() * 1.4, a: 0.2 + Math.random() * 0.5 });
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build(); if (reduced) draw();
  }
  function onScroll() {
    var max = document.body.scrollHeight - window.innerHeight;
    p = max > 0 ? clamp(window.scrollY / max) : 0;
    document.documentElement.classList.toggle('home-scrolled', window.scrollY > 30);
    var bar = document.querySelector('.home-progress'); if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    if (reduced) draw();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', function (e) { tmx = (e.clientX / window.innerWidth - 0.5) * 2; tmy = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });

  function focal() { return { x: W * (W < 900 ? 0.56 : 0.73) + mx * 16, y: H * (0.46 - p * 0.05) + my * 12, R: Math.min(W, H) * (W < 900 ? 0.26 : 0.2) }; }

  function dashRing(cx, cy, r, dash) { ctx.save(); ctx.setLineDash(dash || []); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke(); ctx.restore(); }

  /* faint radar grid behind the dial */
  function drawGrid(f) {
    ctx.strokeStyle = G(0.05); ctx.lineWidth = 1;
    for (var i = 1; i <= 4; i++) dashRing(f.x, f.y, f.R * (0.35 + i * 0.22), []);
    ctx.strokeStyle = G(0.045);
    for (var a = 0; a < 12; a++) { var ang = a / 12 * 6.283; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(ang) * f.R * 1.16, f.y + Math.sin(ang) * f.R * 1.16); ctx.stroke(); }
  }

  /* holographic scanner dial: tick ring + rotating dashed arcs + radar sweep */
  function drawScanner(f) {
    var R = f.R;
    // tick ring
    ctx.strokeStyle = G(0.18); ctx.lineWidth = 1;
    for (var i = 0; i < 72; i++) {
      var ang = i / 72 * 6.283 + t * 0.02, major = i % 6 === 0;
      var r0 = R * 1.02, r1 = R * (major ? 1.085 : 1.05);
      ctx.beginPath(); ctx.moveTo(f.x + Math.cos(ang) * r0, f.y + Math.sin(ang) * r0); ctx.lineTo(f.x + Math.cos(ang) * r1, f.y + Math.sin(ang) * r1);
      ctx.strokeStyle = G(major ? 0.28 : 0.12); ctx.stroke();
    }
    ctx.strokeStyle = G(0.16); dashRing(f.x, f.y, R * 1.02, []);
    // rotating dashed arcs
    ctx.save(); ctx.translate(f.x, f.y);
    ctx.strokeStyle = G(0.22); ctx.lineWidth = 1.4;
    ctx.save(); ctx.rotate(t * (0.25 + p * 0.5)); ctx.beginPath(); ctx.arc(0, 0, R * 1.16, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * 1.16, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = G(0.14); ctx.setLineDash([2, 6]);
    ctx.save(); ctx.rotate(-t * 0.18); dashRing(0, 0, R * 1.28); ctx.restore();
    ctx.setLineDash([]);
    // radar sweep
    var sweep = t * (0.5 + p * 0.7) % 6.283;
    var grd = ctx.createLinearGradient(0, 0, Math.cos(sweep) * R, Math.sin(sweep) * R);
    grd.addColorStop(0, GS(0.0)); grd.addColorStop(1, GS(0.5));
    ctx.strokeStyle = grd; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sweep) * R, Math.sin(sweep) * R); ctx.stroke();
    ctx.restore();
  }

  /* rotating wireframe molecular lattice */
  function drawLattice(f) {
    var ay = t * (0.3 + p * 0.4), ax = 0.5 + Math.sin(t * 0.2) * 0.3 + my * 0.4, sc = f.R * 0.5;
    var pr = [];
    for (var i = 0; i < IV.length; i++) {
      var x = IV[i][0], y = IV[i][1], z = IV[i][2];
      var x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay);
      var y2 = y * Math.cos(ax) - z1 * Math.sin(ax), z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      var dpt = 1 + z2 * 0.12;
      pr.push({ x: f.x + x1 * sc * dpt / 1.6, y: f.y + y2 * sc * dpt / 1.6, z: z2 });
    }
    ctx.lineWidth = 1;
    for (var e = 0; e < IE.length; e++) { var a = pr[IE[e][0]], b = pr[IE[e][1]]; var depth = (a.z + b.z) * 0.5; ctx.strokeStyle = G(0.1 + (depth + 2) / 4 * 0.22); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (var v = 0; v < pr.length; v++) { ctx.beginPath(); ctx.arc(pr[v].x, pr[v].y, 1.6 + (pr[v].z + 2) / 4 * 1.4, 0, 6.283); ctx.fillStyle = GS(0.4 + (pr[v].z + 2) / 4 * 0.5); ctx.fill(); }
    // core
    ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, 6.283); ctx.fillStyle = GS(0.85); ctx.fill();
  }

  /* Bohr orbitals + electrons (precise / dashed) */
  function drawOrbitals(f) {
    ctx.save(); ctx.translate(f.x, f.y);
    var R = f.R * 0.86;
    for (var i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(t * 0.12 + i * 2.094 + mx * 0.1);
      ctx.setLineDash([2, 5]); ctx.strokeStyle = G(0.16); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.38, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      var ea = t * (0.7 + i * 0.3) + i, ex = Math.cos(ea) * R, ey = Math.sin(ea) * R * 0.38;
      ctx.beginPath(); ctx.arc(ex, ey, 2.4, 0, 6.283); ctx.fillStyle = GS(0.9); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* HUD reticle brackets + data read-outs near the dial */
  function bracket(x, y, s, fx, fy) { ctx.beginPath(); ctx.moveTo(x + fx * s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + fy * s); ctx.stroke(); }
  function drawHUD(f) {
    var R = f.R * 1.4;
    ctx.strokeStyle = G(0.3); ctx.lineWidth = 1.2;
    bracket(f.x - R, f.y - R * 0.78, 16, 1, 1); bracket(f.x + R, f.y - R * 0.78, 16, -1, 1);
    bracket(f.x - R, f.y + R * 0.78, 16, 1, -1); bracket(f.x + R, f.y + R * 0.78, 16, -1, -1);
    // read-outs
    ctx.font = '600 10px Poppins, system-ui, sans-serif';
    try { ctx.letterSpacing = '2px'; } catch (e) {}
    ctx.textBaseline = 'middle';
    // telemetry column on the right edge (skip on small screens)
    if (W >= 880) {
      ctx.textAlign = 'right';
      function ro(ly, label, val) {
        var lx = W - 30;
        ctx.fillStyle = ink(0.4); ctx.fillText(label, lx, ly);
        ctx.fillStyle = G(0.82); ctx.fillText(val, lx, ly + 15);
        ctx.strokeStyle = G(0.3); ctx.beginPath(); ctx.moveTo(lx + 8, ly - 8); ctx.lineTo(lx + 8, ly + 23); ctx.stroke();
      }
      var flick = (Math.sin(t * 3) * 0.5 + 0.5);
      ro(H * 0.2, 'QUANTUM FIELD', 'ALIGNED');
      ro(H * 0.34, 'FREQUENCY', 'ƒ ' + (7.18 + flick * 0.12).toFixed(2) + ' THz');
      ro(H * 0.62, 'STATE', 'METASTABLE');
      ro(H * 0.76, 'BIOAVAILABILITY', '+18× AUC₀₋∞');
    }
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }

  /* oscilloscope frequency trace across the width */
  function drawTrace() {
    var yc = H * 0.6, scanx = (t * 160) % (W + 200) - 100;
    ctx.strokeStyle = G(0.06); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yc); ctx.lineTo(W, yc); ctx.stroke();
    ctx.beginPath();
    for (var x = 0; x <= W; x += 8) {
      var env = Math.exp(-Math.pow((x - scanx) / 220, 2));
      var y = yc + (Math.sin(x / 90 + t * 1.6) * 9 + Math.sin(x / 28 - t * 2.2) * 5 * env) * (1 + p);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = G(0.14 + p * 0.06); ctx.lineWidth = 1.3; ctx.stroke();
    // scan dot
    var sy = yc + Math.sin(scanx / 28 - t * 2.2) * 6; ctx.beginPath(); ctx.arc(scanx, sy, 2.4, 0, 6.283); ctx.fillStyle = GS(0.8); ctx.fill();
  }

  /* streaming data particles */
  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var s = parts[i]; s.x += s.vx * (0.6 + p); if (s.x > W + 6) { s.x = -6; s.y = Math.random() * H; }
      ctx.beginPath(); ctx.arc(s.x + mx * 8, s.y + my * 6, s.s, 0, 6.283); ctx.fillStyle = GS(s.a * (0.5 + p * 0.4)); ctx.fill();
    }
  }

  /* screen-corner HUD brackets */
  function drawFrame() {
    var m = 26, s = 22; ctx.strokeStyle = G(0.22); ctx.lineWidth = 1.2;
    bracket(m, m, s, 1, 1); bracket(W - m, m, s, -1, 1); bracket(m, H - m, s, 1, -1); bracket(W - m, H - m, s, -1, -1);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var f = focal();
    var hf = heroEl ? clamp(1 - window.scrollY / (heroEl.offsetHeight * 0.82)) : 1;
    AM = 1; drawFrame(); drawTrace(); drawParts();          // persistent ambient layer
    AM = 0.1 + hf * 0.9; drawGrid(f); drawScanner(f); drawOrbitals(f); drawLattice(f);
    AM = hf; drawHUD(f);                                    // telemetry fades fully past the hero
    AM = 1;
  }
  function frame() { requestAnimationFrame(frame); t += 1 / 60; mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05; draw(); }

  resize(); onScroll();
  if (reduced) draw(); else frame();
})();
