/* Home — quantum vine flow.
   ONE luminous gold energy-vine (the "quantum" filament) threaded with soft green
   leaves and sparkles (the "herb"). It ORIGINATES from inside the Quantum Ayurveda
   logo (page one), flows in an organic S-curve down the left, sweeps through the
   story's mortar, and MERGES into the "AI Discovery" step circle in the process
   section (page three) — and stops there. Scroll-mapped: the glowing growth-front
   advances along the path as you scroll; the endpoint tracks the (pinned) AI
   Discovery icon so the vine stays connected to it. Drawn on a fixed canvas. */
(function () {
  if (!document.body.classList.contains('home-min')) return;
  var canvas = document.querySelector('.hb-flow');
  var heroEl = document.querySelector('.hero-min');
  var logoEl = document.querySelector('.hm-logo');
  var storyEl = document.getElementById('story');
  var procEl = document.querySelector('.pin-process');
  var trackEl = document.querySelector('.proc-track');
  var iconEl = document.querySelector('.pin-process .pstep .ic'); // AI Discovery
  if (!canvas || !heroEl || !storyEl) return;
  // Mobile: drop the quantum vine entirely (removed on phones by request). The mobile
  // process steps light up via their own scroll logic in site.js, so this is safe.
  // WIDTH-only: min(w,h) also matched short desktop windows and killed the vine there.
  if (window.innerWidth < 760) {
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    return;
  }
  var ctx = canvas.getContext('2d');
  var isMobile = false;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, t = 0;
  var samples = [];          // {x,y (doc coords), tx,ty} — rebuilt each frame
  var leaves = [];           // {frac, side, size, ph}
  var sparks = [];           // {frac, off, r, ph, big}
  var fixed = null;          // cached fixed geometry (logo→mortar)
  var GREEN_LO = [74, 148, 80], GREEN_HI = [150, 202, 132];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function catmull(p0, p1, p2, p3, s) {
    var s2 = s * s, s3 = s2 * s;
    return [
      0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
      0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3)
    ];
  }

  // Fixed geometry (in document space) — the logo origin through the story mortar.
  // Captured from the flow layout (these elements don't move on scroll).
  function buildFixed() {
    var sy = window.scrollY;
    var hr = heroEl.getBoundingClientRect();
    var sr = storyEl.getBoundingClientRect();
    var hT = hr.top + sy, hH = hr.height;
    var sT = sr.top + sy, sH = sr.height;
    W = window.innerWidth; H = window.innerHeight;

    var logoCx = 0.5 * W, logoDocY = hT + hH * 0.42;
    if (logoEl) {
      var lr = logoEl.getBoundingClientRect();
      logoCx = lr.left + lr.width * 0.5;
      logoDocY = lr.top + sy + lr.height * 0.52;   // a touch below logo centre
    }
    // the mortar & pestle — vine must pass through the vessel's centre. Map a KNOWN
    // interior point of the artwork (viewBox 0 0 360 360; the bowl/elixir centre sits
    // at 180,214) through the SVG's screen matrix. This is exact regardless of the
    // element's padding or xMidYMid letterboxing — a height fraction is not.
    var svgEl = document.querySelector('#story .story-mortar svg');
    var mCx = 0.5 * W, mCy = sT + sH * 0.74;
    if (svgEl && svgEl.getScreenCTM) {
      var ctm = svgEl.getScreenCTM();
      if (ctm) {
        var VX = 180, VY = 220;                       // vessel centre-line (the wave axis, "through the mortar")
        mCx = ctm.a * VX + ctm.c * VY + ctm.e;        // -> viewport x
        mCy = ctm.b * VX + ctm.d * VY + ctm.f + sy;   // -> document y
      } else {
        var mr = svgEl.getBoundingClientRect();
        mCx = mr.left + mr.width * 0.5;
        mCy = mr.top + sy + mr.height * (220 / 360);
      }
    }
    window.__vineMortarCP = { x: mCx, y: mCy };      // debug/verification hook
    fixed = {
      sBottom: sT + sH,
      trackTop: trackEl ? (trackEl.getBoundingClientRect().top + sy) : (sT + sH),
      cps: [
        [logoCx, logoDocY],            // origin — inside the QA logo
        [0.72 * W, hT + hH * 0.56],     // emerge to the RIGHT
        [0.82 * W, hT + hH * 0.92],     // hero right (apex)
        [0.66 * W, sT + sH * 0.30],     // sweep back across into the story
        [mCx, mCy]                      // THROUGH the centre of the mortar & pestle
      ]
    };

    // leaves + sparkles at stable fractions along the whole vine
    leaves = [];
    var LC = isMobile ? 15 : 24;
    for (var l = 0; l < LC; l++) leaves.push({ frac: 0.05 + (l / (LC - 1)) * 0.92, side: l % 2 ? 1 : -1, size: rand(18, 33), ph: rand(0, 6.28) });
    sparks = [];
    var SC = isMobile ? Math.round(rand(50, 70)) : Math.round(rand(160, 200));
    for (var s = 0; s < SC; s++) sparks.push({ frac: Math.random(), off: rand(-16, 16), r: Math.random() < 0.12 ? rand(1.6, 2.6) : rand(0.5, 1.3), ph: rand(0, 6.28), big: Math.random() < 0.12 });
  }

  // live endpoint = AI Discovery icon (pinned → tracked each frame)
  function endpoint() {
    var sy = window.scrollY;
    if (iconEl) {
      var ir = iconEl.getBoundingClientRect();
      return { x: ir.left + ir.width * 0.5, y: ir.top + sy + ir.height * 0.5 };
    }
    return { x: 0.245 * W, y: fixed.trackTop + 660 };
  }

  // assemble full control-point list (fixed + tail into the icon) and sample it
  function buildSamples() {
    if (!fixed) buildFixed();
    var end = endpoint();
    var sB = fixed.sBottom, span = Math.max(220, end.y - sB);
    var P = fixed.cps.concat([
      [0.30 * W, sB + span * 0.34],
      [0.185 * W, sB + span * 0.70],
      [end.x, end.y]
    ]);
    var pts = [P[0]].concat(P).concat([P[P.length - 1]]);
    samples = [];
    var per = isMobile ? 20 : 34;
    fixed.mortarIdx = 4 * per;   // sample index where the vine reaches the mortar
    for (var i = 1; i < pts.length - 2; i++)
      for (var j = 0; j < per; j++) samples.push(catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], j / per));
    samples.push(P[P.length - 1].slice());
    var N = samples.length;
    for (var k = 0; k < N; k++) {
      var a = samples[Math.max(0, k - 1)], b = samples[Math.min(N - 1, k + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
      samples[k] = { x: samples[k][0], y: samples[k][1], tx: tx / L, ty: ty / L };
    }
  }

  function size() {
    W = window.innerWidth; H = window.innerHeight;
    // Draw a little taller than the viewport on mobile so the vine never clips when the
    // URL bar collapses and the visible area grows.
    var CH = H + (isMobile ? 140 : 0);
    canvas.width = W * dpr; canvas.height = CH * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = CH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildFixed();
  }

  // scroll-mapped reveal: 0 (only the logo origin) → 1 (reaches the AI Discovery icon).
  // The growth-front meets the circle a little before the section reaches the top, so
  // the steps then light up while the section is still comfortably in view.
  function vineEndScroll() { return fixed.trackTop - H * 0.18; }
  function revealT() {
    var endScroll = vineEndScroll();
    if (endScroll <= 0) return 1;
    return clamp01(0.06 + (window.scrollY / endScroll) * 0.98);
  }

  function bloom(x, y, r, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,249,228,' + a.toFixed(3) + ')');
    g.addColorStop(0.4, 'rgba(232,196,120,' + (a * 0.45).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(232,196,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }

  function leaf(x, y, ang, size, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.38, -size * 0.5, size * 0.86, -size * 0.42, size * 1.12, 0);
    ctx.bezierCurveTo(size * 0.86, size * 0.42, size * 0.38, size * 0.5, 0, 0);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, size * 1.12, 0);
    g.addColorStop(0, 'rgba(' + GREEN_LO.join(',') + ',' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + GREEN_HI.join(',') + ',' + (a * 0.55).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(60,128,72,' + (a * 0.5).toFixed(3) + ')'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 1.0, 0); ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, canvas.height / dpr);
    if (document.hidden) return;
    buildSamples();
    var N = samples.length;
    if (!N) return;

    var sy = window.scrollY;
    var rt = revealT();
    // Gate the process steps to the vine: 0 until the growth-front actually reaches the
    // AI Discovery circle (rt→1 at scrollY ≈ 0.9592·endScroll), then ramp 0→1 over the
    // next ~0.42vh of scroll so the steps light up *after* the vine connects.
    var touchY = vineEndScroll() * 0.9592;
    window.__procDrive = clamp01((sy - touchY) / (H * 0.42));
    var lastIdx = Math.max(1, Math.round(rt * (N - 1)));
    if (!window.__mortarEnergized && fixed.mortarIdx && lastIdx >= fixed.mortarIdx) {
      window.__mortarEnergized = true;   // the vine has touched the mortar — ignite it
    }

    var y0 = samples[0].y - sy, yL = samples[lastIdx].y - sy;
    if ((y0 < -160 && yL < -160) || (y0 > H + 160 && yL > H + 160)) return;

    var shimmer = 0.82 + 0.18 * Math.sin(t * 1.4);

    // vine — layered glow (gold)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function strokePath(width, style, blur) {
      ctx.beginPath();
      for (var k = 0; k <= lastIdx; k++) {
        var px = samples[k].x, py = samples[k].y - sy;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      if (blur) { ctx.shadowBlur = blur; ctx.shadowColor = 'rgba(214,170,84,0.85)'; } else { ctx.shadowBlur = 0; }
      ctx.lineWidth = width; ctx.strokeStyle = style; ctx.stroke();
    }
    strokePath(isMobile ? 11 : 14, 'rgba(188,138,44,0.40)', isMobile ? 0 : 28);
    if (isMobile) strokePath(9, 'rgba(200,150,56,0.30)', 0);   // soft halo without costly blur
    strokePath(6, 'rgba(212,164,76,0.66)', 0);
    strokePath(2.7, 'rgba(244,208,135,0.92)', 0);
    strokePath(1.2, 'rgba(255,253,242,' + (0.96 * shimmer).toFixed(3) + ')', 0);
    ctx.shadowBlur = 0;

    // leaves (unfurl just behind the growth-front)
    for (var li = 0; li < leaves.length; li++) {
      var lf = leaves[li], idx = Math.round(lf.frac * (N - 1));
      if (idx > lastIdx) continue;
      var grow = clamp01((lastIdx - idx) / 24);
      if (grow <= 0.02) continue;
      var s = samples[idx], nx = -s.ty, ny = s.tx;
      var bx = s.x + nx * lf.side * 3, by = (s.y - sy) + ny * lf.side * 3;
      var ang = Math.atan2(ny * lf.side, nx * lf.side) + Math.sin(t * 1.1 + lf.ph) * 0.06;
      leaf(bx, by, ang, lf.size * grow, 0.92);
    }

    // sparkles
    for (var si = 0; si < sparks.length; si++) {
      var sp = sparks[si], sidx = Math.round(sp.frac * (N - 1));
      if (sidx > lastIdx) continue;
      var ss = samples[sidx], snx = -ss.ty, sny = ss.tx;
      var sx2 = ss.x + snx * sp.off, sy2 = (ss.y - sy) + sny * sp.off;
      var tw = 0.45 + 0.55 * Math.sin(t * (sp.big ? 2.4 : 3.6) + sp.ph);
      var nearFront = clamp01(1 - (lastIdx - sidx) / 90);
      var a = (0.6 + 0.4 * nearFront) * tw;
      if (a <= 0.02) continue;
      var rr = sp.r * (0.9 + 0.6 * tw);
      var g = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, rr * 3);
      g.addColorStop(0, 'rgba(255,250,232,' + a.toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(232,196,120,' + (a * 0.5).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(232,196,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx2, sy2, rr * 3, 0, 6.283); ctx.fill();
    }

    // origin bloom (inside the logo) + the merging point at the AI Discovery icon
    bloom(samples[0].x, samples[0].y - sy, 32, 0.22 * (0.85 + 0.15 * Math.sin(t * 1.6)));
    var f = samples[lastIdx];
    // brighten as it merges into the AI Discovery circle (a fuller burst at the end)
    if (rt > 0.985) bloom(f.x, f.y - sy, 46, 0.5 * (0.85 + 0.15 * Math.sin(t * 2.4)));
    bloom(f.x, f.y - sy, 28, 0.4 * (0.82 + 0.18 * Math.sin(t * 3)));
    ctx.shadowBlur = 0;
  }

  function loop() { requestAnimationFrame(loop); t += 1 / 60; render(); }

  size();
  // layout settles after webfonts/images load — re-capture the fixed geometry
  window.addEventListener('load', buildFixed);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { buildFixed(); });
  setTimeout(buildFixed, 1400);
  // Mobile scrolling shows/hides the URL bar, firing resize with only a height change.
  // Rebuilding the vine on those makes it jump — only rebuild when the WIDTH changes.
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    size();
  });
  if (!reduce) requestAnimationFrame(loop);
  else { render(); window.addEventListener('scroll', function () { requestAnimationFrame(render); }, { passive: true }); }
})();
