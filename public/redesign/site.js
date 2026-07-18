/* GreenSpace Herbs · Quantum Ayurveda — interactions + scroll-mapped motion */
(function () {
  var docEl = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = function () { return window.innerWidth > 1080; };

  /* ---- Header shrink ---- */
  var header = document.querySelector('.header');
  if (header) {
    var hs = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
    hs(); window.addEventListener('scroll', hs, { passive: true });
  }

  /* ---- Mobile drawer ---- */
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.querySelector('.mobile-drawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var open = drawer.style.display === 'block';
      drawer.style.display = open ? 'none' : 'block';
      toggle.setAttribute('aria-expanded', String(!open));
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { drawer.style.display = 'none'; });
    });
  }

  /* ---- Demo forms ---- */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Thank you. Our team will be in touch. (Connect this form to your CRM / webhook before publishing.)');
    });
  });

  /* ===== Scroll-mapped engine ===== */
  var rail = document.querySelector('.hud-rail-fill');
  var railPct = document.querySelector('.hud-rail-pct');
  var railSec = document.querySelector('.hud-rail-sec');
  var parallax = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var procTrack = document.querySelector('.proc-track');
  var procWrap = document.querySelector('.pin-process');
  var psteps = [].slice.call(document.querySelectorAll('.pstep'));
  var chart = document.querySelector('.chart');
  var curve = chart ? chart.querySelector('.pk-curve') : null;
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  var named = [].slice.call(document.querySelectorAll('main [id]'));
  var vh = window.innerHeight;

  counters.forEach(function (el) {
    var t = el.textContent.trim();
    var m = t.match(/^([\d,]+(?:\.\d+)?)(.*)$/);
    el.dataset.num = m ? m[1] : '';
    el.dataset.suf = m ? m[2] : '';
    el.dataset.raw = t;
  });
  if (curve) { curve.setAttribute('pathLength', '1'); curve.style.strokeDasharray = '1'; }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }

  function fmtCount(el, p) {
    var num = el.dataset.num; if (!num) return;
    var target = parseFloat(num.replace(/,/g, ''));
    var dec = (num.split('.')[1] || '').length;
    var comma = num.indexOf(',') > -1;
    var v = target * ease(clamp01(p));
    var s = v.toFixed(dec);
    if (comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec });
    el.textContent = s + el.dataset.suf;
  }

  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY;
    var docH = docEl.scrollHeight - vh;
    var gp = docH > 0 ? clamp01(y / docH) : 0;
    if (rail) rail.style.transform = 'scaleY(' + gp + ')';
    if (railPct) railPct.textContent = ('0' + Math.round(gp * 100)).slice(-2) + '%';
    if (railSec) {
      var cur = 'TOP';
      for (var i = 0; i < named.length; i++) {
        var rr = named[i].getBoundingClientRect();
        if (rr.top <= vh * 0.4) cur = named[i].id;
      }
      railSec.textContent = cur.toUpperCase().replace(/-/g, '_');
    }

    if (!reduce && desk()) {
      for (var i = 0; i < parallax.length; i++) {
        var el = parallax[i];
        var sp = parseFloat(el.getAttribute('data-parallax')) || 0;
        el.style.transform = 'translate3d(0,' + (y * sp).toFixed(1) + 'px,0)';
      }
    }

    for (var i = 0; i < counters.length; i++) {
      var el = counters[i], r = el.getBoundingClientRect();
      if (reduce) { el.textContent = el.dataset.raw; continue; }
      var p = (vh * 0.92 - r.top) / (vh * 0.5);
      fmtCount(el, p);
    }

    if (procTrack && psteps.length) {
      if (reduce) {
        psteps.forEach(function (s) { s.classList.add('lit'); });
        if (procWrap) procWrap.style.setProperty('--proc', 1);
      } else if (!desk()) {
        // Mobile / tablet: steps stack vertically — light each one (and its connector to
        // the next step) as it scrolls into view, so the process reveals top-to-bottom.
        var mLit = 0, mTrig = vh * 0.74;
        for (var mi = 0; mi < psteps.length; mi++) {
          var mOn = psteps[mi].getBoundingClientRect().top < mTrig;
          psteps[mi].classList.toggle('lit', mOn);
          if (mOn) mLit = mi + 1;
        }
        if (procWrap) procWrap.style.setProperty('--proc', (mLit / psteps.length).toFixed(3));
      } else {
        // Desktop: GATED on the quantum vine — hero-bridge.js publishes __procDrive, which
        // stays 0 until the vine reaches the AI Discovery circle, then ramps 0→1.
        var p;
        if (typeof window.__procDrive === 'number') {
          p = window.__procDrive;
        } else {
          var host = procWrap || procTrack;
          var r = host.getBoundingClientRect();
          var secCenter = r.top + r.height / 2;
          p = clamp01((vh * 0.92 - secCenter) / (vh * 0.5));
        }
        if (procWrap) procWrap.style.setProperty('--proc', p.toFixed(4));
        var lit = p <= 0.001 ? 0 : Math.min(psteps.length, Math.ceil(p * psteps.length));
        for (var s = 0; s < psteps.length; s++) psteps[s].classList.toggle('lit', s < lit);
      }
    }

    if (curve) {
      if (reduce) { curve.style.strokeDashoffset = 0; if (chart) chart.style.setProperty('--cp', 1); }
      else {
        var r = chart.getBoundingClientRect();
        var cp = clamp01((vh * 0.84 - r.top) / (r.height * 0.55));
        curve.style.strokeDashoffset = (1 - cp);
        chart.style.setProperty('--cp', cp.toFixed(3));
      }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; update(); });

  /* ===== Reveal choreography ===== */
  if (!reduce && 'IntersectionObserver' in window) {
    docEl.classList.add('anim');
    document.querySelectorAll('.section .eyebrow,.section .dataline,.section h2,.section-head p,.story-point,.sci-highlights,.chart,.cta .wrap>*').forEach(function (el) {
      el.setAttribute('data-reveal', '');
    });
    ['.ing-grid', '.cert-row', '.sci-stats', '.trust-marks'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (grp) {
        Array.prototype.forEach.call(grp.children, function (ch, i) {
          ch.setAttribute('data-reveal', '');
          ch.style.setProperty('--rd', (i * 0.07).toFixed(2) + 's');
        });
      });
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  }

  /* ===== Particle network ===== */
  if (!reduce) initParticles();
  function initParticles() {
    var c = document.getElementById('fx'); if (!c) return;
    var ctx = c.getContext('2d'); var dpr = Math.min(2, window.devicePixelRatio || 1);
    var pts = [], N = 0, W = 0, H = 0, raf;
    function size() {
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = Math.max(28, Math.min(76, Math.floor(W / 22)));
      pts = [];
      for (var i = 0; i < N; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22 });
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < N; i++) { var p = pts[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
      for (var i = 0; i < N; i++) {
        for (var j = i + 1; j < N; j++) {
          var a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < 17000) { var al = (1 - d / 17000) * .16; ctx.strokeStyle = 'rgba(194,145,47,' + al + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      ctx.fillStyle = 'rgba(194,145,47,.5)';
      for (var i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.3, 0, 6.2832); ctx.fill(); }
      raf = requestAnimationFrame(frame);
    }
    size(); window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }

  update();
})();

/* Quantum cursor — a gold energy ring that trails the pointer and locks onto
   interactive elements. Desktop fine-pointers only; reduced-motion users skip it. */
(function () {
  if (!window.matchMedia) return;
  if (!matchMedia('(pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var dot = document.createElement('span'); dot.className = 'qcur-dot';
  var ring = document.createElement('span'); ring.className = 'qcur-ring';
  dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot); document.body.appendChild(ring);
  var tx = -100, ty = -100, dx = -100, dy = -100, rx = -100, ry = -100, seen = false;
  document.addEventListener('pointermove', function (e) {
    tx = e.clientX; ty = e.clientY; seen = true;
    document.body.classList.remove('qcur-hide');
    var t = e.target;
    var hot = t.closest && t.closest('a,button,[role="button"],input,select,textarea,summary,.ing-card');
    ring.classList.toggle('on', !!hot);
  }, { passive: true });
  document.addEventListener('mouseleave', function () { document.body.classList.add('qcur-hide'); });
  (function loop() {
    requestAnimationFrame(loop);
    if (!seen) return;
    dx += (tx - dx) * 0.55; dy += (ty - dy) * 0.55;       // dot: tight follow
    rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;       // ring: elastic trail
    dot.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
  })();
})();

/* Timeline scroll-map — the numbered steps energize one-by-one and the gold spine
   fills as you scroll through them, mirroring the home process section. Works at
   every breakpoint (the timeline is single-column throughout); positions read live
   via getBoundingClientRect so it stays correct through resize/orientation change. */
(function () {
  var tl = document.querySelector('.timeline');
  if (!tl) return;
  var items = [].slice.call(tl.querySelectorAll('.tl-item'));
  if (!items.length) return;
  var fill = document.createElement('span');
  fill.className = 'tl-fill'; fill.setAttribute('aria-hidden', 'true');
  tl.appendChild(fill);
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function center(it) { var r = it.querySelector('.tl-year').getBoundingClientRect(); return r.top + r.height / 2; }
  function spineTop() { return tl.getBoundingClientRect().top + 8; }

  if (reduced) {
    items.forEach(function (it) { it.classList.add('lit'); });
    fill.style.height = Math.max(0, center(items[items.length - 1]) + 30 - spineTop()) + 'px';
    return;
  }

  var ticking = false;
  function map() {
    ticking = false;
    var trig = window.innerHeight * 0.72;
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('lit', center(items[i]) < trig);
    var front = Math.min(trig, center(items[items.length - 1]) + 30);   // stop at the last badge
    fill.style.height = Math.max(0, front - spineTop()) + 'px';
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(map); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', map);
  map();
})();
