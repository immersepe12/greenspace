/* Home — per-section "Casper" particle swarms (2D).
   Every major section (besides the hero, which has its own WebGL tesseract) gets its
   OWN contained particle cloud on a transparent canvas behind that section's content.
   Each cloud is a shell of points that slowly rotates (a light echo of the hero swarm),
   projected with a touch of fake perspective, mouse-reactive (particles repel from the
   cursor within their own section), with small gold/sage particles. Only on-screen
   sections animate. 2D canvas keeps it cheap and avoids extra WebGL contexts. */
(function () {
  if (!document.body.classList.contains('home-min')) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SELECTORS = ['#story', '.pin-process', '#science', '.ingredients', '.accred', '.cta'];
  var dpr = Math.min(2, window.devicePixelRatio || 1);

  // global cursor (viewport px); each swarm maps it into its own rect
  var curX = -1, curY = -1, cursorOn = false;
  window.addEventListener('pointermove', function (e) { curX = e.clientX; curY = e.clientY; cursorOn = true; }, { passive: true });
  window.addEventListener('touchmove', function (e) { if (e.touches && e.touches[0]) { curX = e.touches[0].clientX; curY = e.touches[0].clientY; cursorOn = true; } }, { passive: true });
  document.addEventListener('mouseleave', function () { cursorOn = false; });

  function makeSwarm(host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'qa-swarm-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.classList.add('qa-swarm');
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, parts = [], rot = 0;
    var smx = 0, smy = 0, infl = 0;   // smoothed cursor (NDC) + influence
    var visible = false;

    function build() {
      var density = Math.round(Math.min(300, Math.max(120, (W * H) / 5000)));
      parts = [];
      for (var i = 0; i < density; i++) {
        parts.push({
          th: Math.acos(2 * Math.random() - 1),
          ph: Math.random() * 6.2831853,
          rad: 0.42 + Math.random() * 0.58,
          spin: 0.04 + Math.random() * 0.10,
          size: 0.28 + Math.random() * 0.85,
          gold: Math.random() < 0.66,
          tw: Math.random() * 6.2831853,
          twr: 1.0 + Math.random() * 1.8,
          tri: Math.random() < 0.20,
          jx: 0, jy: 0           // eased cursor displacement
        });
      }
    }
    function size() {
      var r = host.getBoundingClientRect();
      W = Math.max(60, r.width); H = Math.max(60, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    var io = new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); }, { threshold: 0, rootMargin: '80px 0px' });
    io.observe(host);

    function draw(dt) {
      rot += 0.06 * dt;
      var cx = W * 0.5, cy = H * 0.5;
      var rx = W * 0.52, ry = H * 0.52;

      // cursor → this section's NDC, eased
      var r = host.getBoundingClientRect();
      var hc = false, tnx = 0, tny = 0, csx = 0, csy = 0;
      if (cursorOn) {
        var lx = curX - r.left, ly = curY - r.top;
        if (lx >= 0 && lx <= r.width && ly >= 0 && ly <= r.height) { hc = true; csx = lx; csy = ly; tnx = (lx / r.width) * 2 - 1; tny = (ly / r.height) * 2 - 1; }
      }
      smx += (tnx - smx) * 0.10; smy += (tny - smy) * 0.10;
      infl += ((hc ? 1 : 0) - infl) * 0.06;

      ctx.clearRect(0, 0, W, H);
      var REP = Math.min(W, H) * 0.22;            // repel radius (px)
      var REP2 = REP * REP;

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var a = p.ph + rot * p.spin;
        var sinth = Math.sin(p.th);
        var ux = sinth * Math.cos(a);
        var uy = Math.cos(p.th);
        var uz = sinth * Math.sin(a);
        var persp = 1.5 / (1.5 - uz * 0.7);
        var px = cx + ux * p.rad * rx * persp;
        var py = cy + uy * p.rad * ry * persp;

        // gentle parallax toward cursor + local repel
        px += smx * 10 * infl;
        py += smy * 10 * infl;
        if (infl > 0.001 && hc) {
          var dx = px - csx, dy = py - csy, d2 = dx * dx + dy * dy;
          if (d2 < REP2 && d2 > 0.01) {
            var d = Math.sqrt(d2), f = 1 - d / REP;
            var push = f * f * REP * 0.5 * infl;
            p.jx += ((dx / d) * push - p.jx) * 0.2;
            p.jy += ((dy / d) * push - p.jy) * 0.2;
          } else { p.jx += (0 - p.jx) * 0.08; p.jy += (0 - p.jy) * 0.08; }
        } else { p.jx += (0 - p.jx) * 0.08; p.jy += (0 - p.jy) * 0.08; }
        px += p.jx; py += p.jy;

        var depth = 0.45 + 0.55 * (uz * 0.5 + 0.5);   // front brighter/bigger
        p.tw += 0.016 * p.twr;
        var twk = 0.6 + 0.4 * Math.sin(p.tw);
        var sz = p.size * persp * (0.7 + 0.5 * depth);
        var col = p.gold ? '232,196,120' : '120,168,108';
        var alpha = (0.24 + 0.52 * depth) * twk;

        // soft glow
        var g = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.5);
        g.addColorStop(0, 'rgba(' + col + ',' + (alpha * 0.85).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, sz * 2.5, 0, 6.2831853); ctx.fill();

        // core (tiny tetrahedron glint or dot)
        ctx.fillStyle = 'rgba(' + col + ',' + alpha.toFixed(3) + ')';
        if (p.tri) {
          var s = sz * 1.35;
          ctx.save(); ctx.translate(px, py); ctx.rotate(p.tw * 0.5);
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.lineTo(s * 0.87, s * 0.5); ctx.lineTo(-s * 0.87, s * 0.5);
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(px, py, sz, 0, 6.2831853); ctx.fill();
        }
      }
    }

    window.addEventListener('resize', size);
    window.addEventListener('load', function () { size(); draw(0); });
    setTimeout(function () { size(); draw(0); }, 900);   // re-capture after fonts/layout settle
    size();
    return { draw: draw, get visible() { return visible; }, drawOnce: function () { draw(0); } };
  }

  var swarms = [];
  SELECTORS.forEach(function (sel) {
    var host = document.querySelector(sel);
    if (host) { try { swarms.push(makeSwarm(host)); } catch (e) { /* skip */ } }
  });

  // paint one static frame immediately so sections never flash empty before rAF
  swarms.forEach(function (s) { try { s.drawOnce(); } catch (e) {} });

  if (reduce) return;

  var last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    var dt = last ? Math.min(2.2, (ts - last) / 16.67) : 1;
    last = ts;
    if (document.hidden) return;
    for (var i = 0; i < swarms.length; i++) if (swarms[i].visible) swarms[i].draw(dt);
  }
  requestAnimationFrame(loop);
})();
