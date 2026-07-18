/* Homepage story interactions — the mortar energization ritual (vine-gated
   grind, atom field, full-page harmonic wave) and the lotus/mortar 3D tilt.
   The old full-page #fx constellation field was removed (visual clutter). */
(function () {
  if (!document.body.classList.contains('home-min')) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  /* -------- Story lotus mouse reactivity (3D tilt that follows cursor) -------- */
  var lotus = document.querySelector('.story-lotus');
  if (lotus) {
    var lsvg = lotus.querySelector('svg');
    var tlx = 0, tly = 0, clx = 0, cly = 0;
    var lotusVisible = false;
    var io = new IntersectionObserver(function (entries) {
      lotusVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    io.observe(lotus);
    function onMove(e) {
      if (!lotusVisible) return;
      var r = lotus.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = (e.clientX - cx) / (r.width / 2);
      var dy = (e.clientY - cy) / (r.height / 2);
      tlx = Math.max(-1, Math.min(1, dy)) * -12; // rotateX inverse of dy
      tly = Math.max(-1, Math.min(1, dx)) * 12;  // rotateY follows dx
    }
    function lotusFrame() {
      requestAnimationFrame(lotusFrame);
      clx += (tlx - clx) * 0.08;
      cly += (tly - cly) * 0.08;
      lsvg.style.setProperty('--lx', clx.toFixed(2) + 'deg');
      lsvg.style.setProperty('--ly', cly.toFixed(2) + 'deg');
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    // also let touch move it
    window.addEventListener('touchmove', function (e) { if (e.touches[0]) onMove(e.touches[0]); }, { passive: true });
    // ease back when cursor leaves
    document.addEventListener('mouseleave', function () { tlx = 0; tly = 0; });
    lotusFrame();
  }

  /* -------- Story mortar: vine-gated energization ritual -------- */
  // Everything (grind, atom field, core pulses, the full-page harmonic wave)
  // stays dormant until the scroll-mapped vine from the hero reaches the
  // mortar (hero-bridge publishes window.__mortarEnergized). Pages without
  // the vine (it is removed on phones) energize immediately.
  var mortar = document.querySelector('.story-mortar');
  if (mortar) {
    var msvg = mortar.querySelector('svg');
    var pestleG = mortar.querySelector('.sm-pestle');
    var elixirW = mortar.querySelector('.sm-elixir-wrap');
    var electrons = [].slice.call(mortar.querySelectorAll('.sm-e'));
    var storySec = document.getElementById('story');
    mortar.classList.add('sm-live');             // ritual runs from load (no vine gate)

    var tlx2 = 0, tly2 = 0, clx2 = 0, cly2 = 0;
    var ttx = 0, tty = 0, ctx2 = 0, cty2 = 0;
    var mortarVisible = false;
    var io2 = new IntersectionObserver(function (entries) {
      mortarVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    io2.observe(mortar);

    function onMortarMove(e) {
      if (!mortarVisible) return;
      var r = mortar.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = (e.clientX - cx) / (r.width / 2);
      var dy = (e.clientY - cy) / (r.height / 2);
      tlx2 = Math.max(-1, Math.min(1, dy)) * -8;
      tly2 = Math.max(-1, Math.min(1, dx)) * 10;
      ttx = Math.max(-1, Math.min(1, dx)) * 6;
      tty = Math.max(-1, Math.min(1, dy)) * 3;
    }

    // the QA-logo atom: three ellipses at 0/60/120 deg — the RING PATHS rotate
    // like the hero logo's orbits (14s / 19s reverse / 26s), each electron riding
    // its ring as a rigid body (fixed seat on the ellipse, turning with it)
    var ORBITS = [
      { base: 0, a: 143, b: 46, cx: 180, cy: 204, degps: 360 / 14, ph: 0 },
      { base: 60, a: 143, b: 46, cx: 180, cy: 204, degps: -360 / 19, ph: 2.1 },
      { base: 120, a: 143, b: 46, cx: 180, cy: 204, degps: 360 / 26, ph: 4.2 }
    ];
    var orbitRings = [].slice.call(mortar.querySelectorAll('.sm-orbit-ring'));

    // full-page harmonic wave — a canvas spanning the whole story section,
    // its packet centred on the vessel and swelling with each grind stroke
    var wcv = null, wctx = null, wW = 0, wH = 200, wCx = 0;
    if (storySec) {
      wcv = document.createElement('canvas');
      wcv.className = 'sm-wave-canvas';
      wcv.setAttribute('aria-hidden', 'true');
      storySec.insertBefore(wcv, storySec.firstChild);
      wctx = wcv.getContext('2d');
      var sizeWave = function () {
        var sr = storySec.getBoundingClientRect();
        var svgR = msvg.getBoundingClientRect();
        wW = Math.max(320, sr.width);
        var rimY = (svgR.top - sr.top) + svgR.height * (190 / 360);
        wcv.width = wW; wcv.height = wH;
        wcv.style.width = wW + 'px'; wcv.style.height = wH + 'px';
        wcv.style.top = Math.round(rimY - wH / 2) + 'px';
        wCx = (svgR.left - sr.left) + svgR.width / 2;
      };
      sizeWave();
      window.addEventListener('resize', sizeWave);
      mortar.classList.add('sm-wave-off');        // hide the small in-SVG wave
    }
    var WAVE_CFG = [
      { amp: 1.0, w: 2.4, col: '194,145,47', a: .4, p1: 0, p2: 1.3, p3: 2.1 },
      { amp: .62, w: 1.5, col: '227,191,112', a: .55, p1: 1.1, p2: 2.6, p3: .4 },
      { amp: .38, w: 1, col: '150,102,26', a: .6, p1: 2.4, p2: .7, p3: 1.7 }
    ];
    function drawWave(pulse, alpha) {
      wctx.clearRect(0, 0, wW, wH);
      if (alpha <= 0.01) return;
      var base = wH / 2;
      for (var L = 0; L < WAVE_CFG.length; L++) {
        var c = WAVE_CFG[L];
        wctx.beginPath();
        for (var x = 0; x <= wW; x += 7) {
          var env = 0.35 + 0.65 * Math.exp(-((x - wCx) * (x - wCx)) / (2 * 260 * 260));
          var M = c.amp * env * (7 + 26 * pulse);
          var y = base
            + M * Math.sin(x * 0.016 - wt * 2.1 + c.p1)
            + M * 0.5 * Math.sin(x * 0.031 + wt * 1.5 + c.p2)
            + M * 0.26 * Math.sin(x * 0.058 - wt * 3.0 + c.p3);
          if (x === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y);
        }
        wctx.lineWidth = c.w;
        wctx.strokeStyle = 'rgba(' + c.col + ',' + (c.a * alpha).toFixed(3) + ')';
        wctx.stroke();
      }
    }

    var gTh = Math.random() * 6.283;   // grind phase
    var wt = 0;                        // field time
    var liveT = 0;

    function mortarFrame() {
      requestAnimationFrame(mortarFrame);
      clx2 += (tlx2 - clx2) * 0.07;
      cly2 += (tly2 - cly2) * 0.07;
      ctx2 += (ttx - ctx2) * 0.07;
      cty2 += (tty - cty2) * 0.07;
      msvg.style.transformOrigin = '50% 60%';
      msvg.style.transformStyle = 'preserve-3d';
      msvg.style.transform =
        'perspective(900px) ' +
        'translate3d(' + ctx2.toFixed(2) + 'px,' + cty2.toFixed(2) + 'px,0) ' +
        'rotateX(' + clx2.toFixed(2) + 'deg) ' +
        'rotateY(' + cly2.toFixed(2) + 'deg)';

      if (!mortarVisible) return;
      liveT = Math.min(1, liveT + 0.02);

      gTh += 0.042;                                     // ~2.5s per revolution
      wt += 0.016;
      var gx = Math.cos(gTh) * 15;
      var gy = Math.sin(gTh) * 3.4;
      var lean = -Math.cos(gTh + 0.55) * 10 - gx * 0.14;
      var dip = Math.sin(gTh * 2) * 1.1;
      if (pestleG) {
        pestleG.setAttribute('transform',
          'translate(' + gx.toFixed(2) + ' ' + (gy + dip).toFixed(2) + ') ' +
          'rotate(' + lean.toFixed(2) + ' 180 188)');
      }
      if (elixirW) {
        elixirW.setAttribute('transform', 'translate(' + (-gx * 0.10).toFixed(2) + ' 0)');
      }
      // the atom turns: each ring rotates like the hero logo, its electron riding it
      for (var eo = 0; eo < ORBITS.length; eo++) {
        var O = ORBITS[eo];
        var ang = O.base + wt * O.degps;               // ring angle, degrees
        if (orbitRings[eo]) orbitRings[eo].setAttribute('transform', 'rotate(' + ang.toFixed(2) + ' ' + O.cx + ' ' + O.cy + ')');
        if (electrons[eo]) {
          var rad = ang * Math.PI / 180;
          var lx = O.a * Math.cos(O.ph), ly = O.b * Math.sin(O.ph);   // fixed seat on the ellipse
          var ex = O.cx + lx * Math.cos(rad) - ly * Math.sin(rad);
          var ey = O.cy + lx * Math.sin(rad) + ly * Math.cos(rad);
          electrons[eo].setAttribute('cx', ex.toFixed(1));
          electrons[eo].setAttribute('cy', ey.toFixed(1));
        }
      }
      // full-page harmonic wave, swelling once per grind revolution
      if (wctx) drawWave(0.5 + 0.5 * Math.sin(gTh - 0.8), liveT);
    }
    window.addEventListener('pointermove', onMortarMove, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (e.touches[0]) onMortarMove(e.touches[0]);
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      tlx2 = 0; tly2 = 0; ttx = 0; tty = 0;
    });
    mortarFrame();
  }
})();
