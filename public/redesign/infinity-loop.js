/* Homepage infinite-scroll loop.
   Clones <main> once and teleports the scroll position seamlessly so the
   page cycles forever, in both directions. The clone exists right below the
   original — when you scroll from the end of the original into the start of
   the clone the visual is identical, so the wrap-back is invisible. */
(function () {
  if (!document.body.classList.contains('home-min')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function init() {
    var main = document.querySelector('main');
    if (!main || main.dataset.looped === '1') return;
    main.dataset.looped = '1';

    // Clone the entire main content
    var clone = main.cloneNode(true);
    clone.classList.add('infinity-clone');
    clone.setAttribute('aria-hidden', 'true');
    // Strip IDs from clone to avoid duplicates
    clone.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    // Drop name attributes on form inputs in the clone (don't collect duplicate data)
    clone.querySelectorAll('input,textarea,select,button').forEach(function (el) {
      el.removeAttribute('name');
      el.setAttribute('tabindex', '-1');
      try { el.disabled = true; } catch (e) {}
    });
    // Cloned canvases lose their context — drop them so we don't ship dead pixels
    clone.querySelectorAll('canvas').forEach(function (el) { el.remove(); });
    main.parentNode.insertBefore(clone, main.nextSibling);

    var mainH = 0;
    var wrapping = false;
    var lastY = 0;

    function measure() {
      mainH = main.getBoundingClientRect().height;
    }
    function teleport(toY) {
      wrapping = true;
      var prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, toY);
      // unlock on next frame
      requestAnimationFrame(function () {
        document.documentElement.style.scrollBehavior = prev;
        wrapping = false;
        lastY = window.scrollY;
      });
    }

    measure();
    window.addEventListener('resize', function () { setTimeout(measure, 50); });
    window.addEventListener('load', function () { setTimeout(measure, 100); });

    // downward wrap — when scrolling past the bottom of the clone, jump back
    // an offset equal to mainH (same visual position, half a cycle earlier)
    window.addEventListener('scroll', function () {
      if (wrapping || mainH < 200) return;
      var y = window.scrollY;
      var vh = window.innerHeight;
      // jump back when we've entered the second half of the clone
      if (y >= mainH * 2 - vh - 4) {
        teleport(y - mainH);
        return;
      }
      // also handle the case where someone scroll-jumps super low
      if (y >= mainH * 3 - vh) {
        teleport(mainH);
        return;
      }
      lastY = y;
    }, { passive: true });

    // upward wrap — if the user wheel/touches up while already at scrollY ≈ 0,
    // teleport them forward by mainH so the upward scroll keeps going
    function maybeWrapUp(deltaY) {
      if (wrapping) return;
      if (window.scrollY <= 2 && deltaY < 0 && mainH > 200) {
        teleport(mainH + window.scrollY);
      }
    }
    window.addEventListener('wheel', function (e) {
      maybeWrapUp(e.deltaY);
    }, { passive: true });

    var touchY = null;
    window.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) touchY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches[0] || touchY === null) return;
      var ny = e.touches[0].clientY;
      var dy = touchY - ny;          // positive = swipe up = scroll down
      touchY = ny;
      maybeWrapUp(dy);
    }, { passive: true });
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 100);
  } else {
    window.addEventListener('load', function () { setTimeout(init, 100); });
  }
})();
