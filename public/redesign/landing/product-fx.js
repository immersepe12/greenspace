/* CurcuminQA™ — quantum FX layer.
   Sci-fi ambience for the flagship landing page, matching the homepage design language:
   1) HERO quantum field — drifting gold motes + twinkle stars, energized "embers" rising
      off the turmeric roots, slowly rotating curcumin-ring hexagons, and a LIVE
      multi-harmonic energy wave (replaces the static SVG wave) with a traveling pulse.
      Mouse-reactive: parallax + gentle repel + a Gaussian lens that bends the wave.
   2) DATA section HUD — scanning beam, luminous data comets and a faint gold
      constellation behind the clinical chart (IO-gated; cream-tuned alphas).
   Perf: 2 canvases, 2 rAF loops, both gated by IntersectionObserver + document.hidden;
   reduced counts + DPR on phones. prefers-reduced-motion → script exits, the page keeps
   its static decorations. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var hero = document.querySelector('.hero-master');
  if (!hero) return;
  document.body.classList.add('qfx-on');

  var isMobile = Math.min(window.innerWidth, window.innerHeight) < 760;
  var dpr = Math.min(isMobile ? 1.5 : 2, window.devicePixelRatio || 1);
  var TAU = 6.2831853;
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------------- 1. HERO quantum field ---------------- */
  (function () {
    var canvas = document.createElement('canvas');
    canvas.className = 'qfx-hero';
    canvas.setAttribute('aria-hidden', 'true');
    hero.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, t = 0;
    var motes = [], embers = [], hexes = [];

    // cursor in hero-local px, eased
    var cx = -9999, cy = -9999, tx = -9999, ty = -9999, hasCur = false, infl = 0;

    function build() {
      motes = []; embers = []; hexes = [];
      var MC = isMobile ? 46 : 88;
      for (var i = 0; i < MC; i++) motes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: rand(-.12, .12), vy: rand(-.09, .09),
        r: Math.random() < .14 ? rand(1.6, 2.4) : rand(.5, 1.3),
        tw: rand(0, TAU), twr: rand(1, 2.2),
        depth: rand(.35, 1)
      });
      var EC = isMobile ? 14 : 26;
      for (var e = 0; e < EC; e++) embers.push(newEmber(true));
      var XC = isMobile ? 4 : 7;
      for (var h = 0; h < XC; h++) hexes.push({
        x: rand(.06, .94) * W, y: rand(.1, .8) * H,
        s: rand(11, 30), rot: rand(0, TAU), spin: rand(-.004, .004) || .002,
        drift: rand(.03, .1), ph: rand(0, TAU), depth: rand(.4, 1)
      });
    }
    function newEmber(seed) {
      // energized actives lifting off the turmeric photo (right side of the hero)
      return {
        x: rand(.42, .96) * W,
        y: seed ? rand(.35, .98) * H : rand(.86, 1.02) * H,
        v: rand(.22, .6), sway: rand(8, 26), ph: rand(0, TAU),
        r: rand(.7, 2), life: 1
      };
    }
    function size() {
      var r = hero.getBoundingClientRect();
      W = Math.max(320, r.width); H = Math.max(320, r.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function onMove(e) {
      var r = hero.getBoundingClientRect();
      var mx = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX)) - r.left;
      var my = (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY)) - r.top;
      if (mx >= 0 && mx <= r.width && my >= 0 && my <= r.height) { tx = mx; ty = my; hasCur = true; }
      else hasCur = false;
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', function () { hasCur = false; });

    // live energized wave — 3 harmonics + cursor lens + traveling pulse
    function waveY(x) {
      var base = H * (isMobile ? .80 : .755);
      var amp = Math.min(44, H * .05);
      var k = .0042;
      var y = base
        + amp * Math.sin(x * k + t * .5)
        + amp * .38 * Math.sin(x * k * 2.3 + t * .78)
        + amp * .16 * Math.sin(x * k * 3.9 + t * 1.05);
      if (infl > .01) {
        var dx = x - cx;
        if (dx > -420 && dx < 420) {
          var lens = Math.exp(-(dx * dx) / (2 * 150 * 150));
          y += 56 * Math.tanh((y - cy) / 56) * lens * infl * -0.9;
        }
      }
      return y;
    }
    function hexPath(x, y, s, rot) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = rot + i * TAU / 6;
        var px = x + s * Math.cos(a), py = y + s * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    var visible = true;
    new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); }, { threshold: 0 }).observe(hero);

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      t += 1 / 60;
      cx += ((hasCur ? tx : -9999) - cx) * .1;
      cy += ((hasCur ? ty : H * 2) - cy) * .1;
      infl += ((hasCur ? 1 : 0) - infl) * .06;
      ctx.clearRect(0, 0, W, H);
      var px = infl * (cx / W - .5), py = infl * (cy / H - .5);   // parallax factor
      var REP = Math.min(W, H) * .16, REP2 = REP * REP;

      // hexagon molecule glyphs (curcumin ring motif)
      for (var h = 0; h < hexes.length; h++) {
        var hx = hexes[h];
        hx.rot += hx.spin;
        var ox = hx.x + Math.sin(t * hx.drift * 3 + hx.ph) * 14 + px * 26 * hx.depth;
        var oy = hx.y + Math.cos(t * hx.drift * 2.2 + hx.ph) * 10 + py * 26 * hx.depth;
        var breath = .55 + .45 * Math.sin(t * .7 + hx.ph);
        ctx.strokeStyle = 'rgba(166,116,36,' + (.16 + .16 * breath * hx.depth).toFixed(3) + ')';
        ctx.lineWidth = 1;
        hexPath(ox, oy, hx.s, hx.rot); ctx.stroke();
        ctx.fillStyle = 'rgba(193,141,52,' + (.5 + .3 * breath).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(ox + hx.s * Math.cos(hx.rot), oy + hx.s * Math.sin(hx.rot), 1.6, 0, TAU); ctx.fill();
      }

      // drifting motes + twinkle
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx; m.y += m.vy;
        if (m.x < -8) m.x = W + 8; else if (m.x > W + 8) m.x = -8;
        if (m.y < -8) m.y = H + 8; else if (m.y > H + 8) m.y = -8;
        var mx2 = m.x + px * 34 * m.depth, my2 = m.y + py * 34 * m.depth;
        if (infl > .01) {
          var dx = mx2 - cx, dy = my2 - cy, d2 = dx * dx + dy * dy;
          if (d2 < REP2 && d2 > .01) {
            var d = Math.sqrt(d2), f = (1 - d / REP);
            mx2 += (dx / d) * f * f * REP * .45 * infl;
            my2 += (dy / d) * f * f * REP * .45 * infl;
          }
        }
        m.tw += .016 * m.twr;
        var twk = .55 + .45 * Math.sin(m.tw);
        var a = (.22 + .5 * m.depth) * twk;
        // two-tone: deep gold reads on the cream wash, bright cream reads on the photo
        var col = (i % 3 === 0) ? '255,240,205' : '178,128,42';
        ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(mx2, my2, m.r * (0.8 + .4 * twk), 0, TAU); ctx.fill();
        if (m.r > 1.5) {   // star cross glint on the big ones
          ctx.strokeStyle = 'rgba(' + col + ',' + (a * .5).toFixed(3) + ')';
          ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(mx2 - m.r * 3.2, my2); ctx.lineTo(mx2 + m.r * 3.2, my2);
          ctx.moveTo(mx2, my2 - m.r * 3.2); ctx.lineTo(mx2, my2 + m.r * 3.2);
          ctx.stroke();
        }
      }

      // rising energized embers
      for (var e = 0; e < embers.length; e++) {
        var em = embers[e];
        em.y -= em.v; em.life = Math.max(0, Math.min(1, (em.y / H - .06) / .2 + .4));
        var ex = em.x + Math.sin(t * .9 + em.ph) * em.sway * (1 - em.y / H);
        if (em.y < H * .04) { embers[e] = newEmber(false); continue; }
        var ea = .5 * em.life;
        var g = ctx.createRadialGradient(ex, em.y, 0, ex, em.y, em.r * 3.4);
        g.addColorStop(0, 'rgba(255,215,140,' + ea.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,215,140,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ex, em.y, em.r * 3.4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,205,' + (ea * 1.4 > 1 ? 1 : ea * 1.4).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(ex, em.y, em.r * .8, 0, TAU); ctx.fill();
      }

      // energized harmonic wave (layered glow) + traveling pulse
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      function strokeWave(w, style) {
        ctx.beginPath();
        for (var x = -6; x <= W + 6; x += 5) {
          var y = waveY(x);
          if (x === -6) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = w; ctx.strokeStyle = style; ctx.stroke();
      }
      strokeWave(8, 'rgba(193,141,52,.06)');
      strokeWave(3, 'rgba(201,151,57,.16)');
      strokeWave(1.1, 'rgba(150,102,26,' + (.30 + .08 * Math.sin(t * .9)).toFixed(3) + ')');
      var pxl = ((t * 120) % (W + 500)) - 250;
      var yH = waveY(pxl);
      var pg = ctx.createRadialGradient(pxl, yH, 0, pxl, yH, 20);
      pg.addColorStop(0, 'rgba(255,243,214,.5)');
      pg.addColorStop(.4, 'rgba(214,166,84,.26)');
      pg.addColorStop(1, 'rgba(214,166,84,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(pxl, yH, 20, 0, TAU); ctx.fill();
    }

    size();
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;   // ignore mobile URL-bar height churn
      lastW = window.innerWidth; size();
    });
    requestAnimationFrame(frame);
  })();

  /* ---------------- 2. DATA section sci-fi HUD ---------------- */
  (function () {
    var host = document.getElementById('data');
    if (!host) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'qfx-data';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, t = 0;
    var nodes = [], comets = [];

    function newComet() {
      return { x: -60, y: rand(.08, .92) * H, v: rand(1.6, 3.4), len: rand(80, 200), a: rand(.1, .22) };
    }
    function size() {
      var r = host.getBoundingClientRect();
      W = Math.max(320, r.width); H = Math.max(240, r.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = []; comets = [];
      var NC = isMobile ? 24 : 46;
      for (var i = 0; i < NC; i++) nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: rand(-.14, .14), vy: rand(-.12, .12),
        r: Math.random() < .12 ? 2 : 1.1,
        gold: Math.random() < .7, ph: rand(0, TAU)
      });
      var CC = isMobile ? 2 : 4;
      for (var c = 0; c < CC; c++) { var cm = newComet(); cm.x = rand(0, W); comets.push(cm); }
    }

    var visible = false;
    new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); }, { threshold: 0, rootMargin: '80px 0px' }).observe(host);

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      t += 1 / 60;
      ctx.clearRect(0, 0, W, H);

      // scanning beam sweeping down the section
      var sy = ((t * 42) % (H + 260)) - 130;
      var grd = ctx.createLinearGradient(0, sy - 70, 0, sy + 70);
      grd.addColorStop(0, 'rgba(201,151,57,0)');
      grd.addColorStop(.5, 'rgba(201,151,57,.07)');
      grd.addColorStop(1, 'rgba(201,151,57,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, sy - 70, W, 140);

      // data comets
      for (var c = 0; c < comets.length; c++) {
        var cm = comets[c];
        cm.x += cm.v;
        var g2 = ctx.createLinearGradient(cm.x - cm.len, cm.y, cm.x, cm.y);
        g2.addColorStop(0, 'rgba(201,151,57,0)');
        g2.addColorStop(1, 'rgba(201,151,57,' + cm.a.toFixed(2) + ')');
        ctx.strokeStyle = g2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cm.x - cm.len, cm.y); ctx.lineTo(cm.x, cm.y); ctx.stroke();
        ctx.fillStyle = 'rgba(226,186,110,' + (cm.a * 2.6 > .6 ? .6 : cm.a * 2.6).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(cm.x, cm.y, 1.4, 0, TAU); ctx.fill();
        if (cm.x > W + 60) comets[c] = newComet();
      }

      // constellation
      var D = 120;
      for (var i = 0; i < nodes.length; i++) {
        var p = nodes[i];
        p.x += p.vx + Math.sin(t * .5 + p.ph) * .02;
        p.y += p.vy + Math.cos(t * .4 + p.ph) * .02;
        if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      }
      ctx.lineWidth = .6;
      for (var a2 = 0; a2 < nodes.length; a2++) {
        for (var b = a2 + 1; b < nodes.length; b++) {
          var dx = nodes[a2].x - nodes[b].x, dy = nodes[a2].y - nodes[b].y, d2 = dx * dx + dy * dy;
          if (d2 < D * D) {
            ctx.strokeStyle = 'rgba(201,151,57,' + ((1 - Math.sqrt(d2) / D) * .12).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(nodes[a2].x, nodes[a2].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
          }
        }
      }
      for (var n = 0; n < nodes.length; n++) {
        var nd = nodes[n];
        var pulse = .55 + .45 * Math.sin(t * 1.4 + nd.ph);
        ctx.fillStyle = nd.gold
          ? 'rgba(201,151,57,' + (.34 * pulse).toFixed(3) + ')'
          : 'rgba(11,61,36,' + (.22 * pulse).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * pulse, 0, TAU); ctx.fill();
      }
    }

    size();
    var lastW2 = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW2) return;
      lastW2 = window.innerWidth; size();
    });
    requestAnimationFrame(frame);
  })();
})();
