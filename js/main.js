/* Magic Home · közös viselkedés
   - mozgás-gerinc: Lenis (saját rAF) + GSAP ScrollTrigger; reduced-motion és hiányzó könyvtár esetén natív görgetés
   - a kritikus tartalom nem függ a GSAP-tól: a belépők CSS-osztályból jönnek (.js .rv -> .in), safety-nettel
   - mobil menü (lenis.stop/start), felfelé görgetésre megjelenő mini-sáv
   - bemutató űrlapok (hírlevél, üzenet): valódi küldés nélkül, visszaigazoló állapottal
   - képnagyító a projekt-oldalakon (<dialog>) */
(function () {
  var doc = document.documentElement;
  var q = new URLSearchParams(location.search);
  try {
    if (q.get('motion') === '1') sessionStorage.setItem('mh-motion', '1');
    if (q.get('motion') === '0') sessionStorage.setItem('mh-motion', '0');
  } catch (e) {}
  var force = null; try { force = sessionStorage.getItem('mh-motion'); } catch (e) {}
  var reduce = force === '1' ? false : force === '0' ? true : matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');
  if (reduce) doc.classList.add('rm');
  var hasGsap = typeof gsap !== 'undefined';
  window.MH = window.MH || {};
  window.MH.reduce = reduce; window.MH.lenis = null; window.MH.gsap = hasGsap;

  /* belépők */
  [].forEach.call(document.querySelectorAll('.top .logo, .top .nav-links li, .top .tel'), function (el, k) {
    el.classList.add('rv-nav'); el.style.transitionDelay = (k * 0.05) + 's';
  });
  var els = [].slice.call(document.querySelectorAll('.rv, .rv-nav'));
  function show(el) { el.classList.add('in'); }
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(show); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () { els.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) show(el); }); }, 1600);
    setTimeout(function () { els.forEach(show); }, 6000);
  }

  /* Lenis + ScrollTrigger */
  if (!reduce && typeof Lenis !== 'undefined') {
    var lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, syncTouch: false });
    window.MH.lenis = lenis;
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
    if (hasGsap && typeof ScrollTrigger !== 'undefined') lenis.on('scroll', ScrollTrigger.update);
    /* horgony-linkek Lenis-szel */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]'); if (!a) return;
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -90 }); history.replaceState(null, '', id);
    });
  }
  if (hasGsap && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    var lastScroll = 0; addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
    var tries = 0;
    function idleRefresh() {
      if (performance.now() - lastScroll < 500 && tries++ < 40) { setTimeout(idleRefresh, 300); return; }
      ScrollTrigger.refresh(); tries = 0;
    }
    addEventListener('load', function () { setTimeout(idleRefresh, 400); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(idleRefresh, 200); });

    /* finom parallax a nagy nyomatokon (egy driver: a belső kép transzformja) */
    if (!reduce) {
      [].forEach.call(document.querySelectorAll('[data-drift] img'), function (img) {
        gsap.fromTo(img, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: 'none',
          scrollTrigger: { trigger: img.closest('[data-drift]'), start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
  }

  /* mobil menü */
  var burgers = document.querySelectorAll('.burger');
  function setMenu(open) {
    doc.classList.toggle('menu-open', open);
    [].forEach.call(burgers, function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    var m = document.getElementById('menu'); if (m) m.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (window.MH.lenis) open ? window.MH.lenis.stop() : window.MH.lenis.start();
    if (open) { var f = document.querySelector('#menu ul a'); if (f) setTimeout(function () { f.focus(); }, 60); }
  }
  [].forEach.call(burgers, function (b) { b.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); burgers[0] && burgers[0].focus(); } });
  [].forEach.call(document.querySelectorAll('#menu a'), function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* mini-sáv: a fejléc kigörgetése után, felfelé görgetésre jelenik meg (delta-hiszterézis) */
  var mini = document.querySelector('.mini'), top = document.querySelector('.top');
  if (mini && top) {
    var y0 = scrollY, acc = 0, on = false;
    addEventListener('scroll', function () {
      var y = scrollY, d = y - y0; y0 = y;
      var past = y > top.offsetHeight + 80;
      acc = (d > 0) === (acc > 0) ? acc + d : d;
      var want = past && acc < -24 ? true : (!past || acc > 24) ? false : on;
      if (want !== on) { on = want; mini.classList.toggle('on', on); mini.setAttribute('aria-hidden', on ? 'false' : 'true'); mini.inert = !on; }
    }, { passive: true });
    mini.inert = true;
  }

  /* bemutató űrlapok: nincs valódi küldés */
  [].forEach.call(document.querySelectorAll('form[data-demo]'), function (f) {
    f.setAttribute('novalidate', '');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      [].forEach.call(f.querySelectorAll('[required]'), function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.value.trim() && (el.type !== 'email' || /.+@.+\..+/.test(el.value));
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        var er = el.id && document.getElementById(el.id + '-err');
        if (er) er.hidden = !!ok;
        if (!ok && !bad) bad = el;
      });
      if (bad) { bad.focus(); return; }
      var ok = f.parentElement.querySelector('[data-ok="' + f.getAttribute('data-demo') + '"]');
      if (ok) { f.hidden = true; ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus(); }
    });
    [].forEach.call(f.querySelectorAll('[required]'), function (el) {
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') { el.setAttribute('aria-invalid', 'false'); var er = document.getElementById(el.id + '-err'); if (er) er.hidden = true; } });
    });
  });

  /* Rólam, „Miért”: az olvasott sorhoz tartozó nyomat kerül a köteg tetejére */
  var stack = document.querySelector('.rw-stack');
  if (stack && 'IntersectionObserver' in window && !reduce) {
    var prints = stack.querySelectorAll('.print');
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = e.target.getAttribute('data-i');
        [].forEach.call(prints, function (p) {
          var on = p.getAttribute('data-i') === i;
          if (p.classList.contains('on') && !on) p.classList.add('was'); else if (on) p.classList.remove('was');
          p.classList.toggle('on', on);
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    [].forEach.call(document.querySelectorAll('.rw-row'), function (r) { rio.observe(r); });
  } else if (stack) { doc.classList.add('no-io'); }

  /* képnagyító */
  var lb = document.getElementById('lb');
  if (lb && typeof lb.showModal === 'function') {
    var shots = [].slice.call(document.querySelectorAll('[data-lb]')), idx = 0;
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap'), lbNum = lb.querySelector('.lb-num');
    function open(i) {
      idx = (i + shots.length) % shots.length;
      var s = shots[idx];
      lbImg.src = s.getAttribute('data-lb'); lbImg.alt = s.querySelector('img').alt;
      lbCap.textContent = s.getAttribute('data-cap') || '';
      lbNum.textContent = (idx + 1) + ' / ' + shots.length;
      if (!lb.open) { lb.showModal(); if (window.MH.lenis) window.MH.lenis.stop(); }
    }
    shots.forEach(function (s, i) { s.addEventListener('click', function () { open(i); }); });
    lb.querySelector('[data-prev]').addEventListener('click', function () { open(idx - 1); });
    lb.querySelector('[data-next]').addEventListener('click', function () { open(idx + 1); });
    lb.querySelector('[data-close]').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') open(idx - 1); if (e.key === 'ArrowRight') open(idx + 1); });
    lb.addEventListener('close', function () { if (window.MH.lenis) window.MH.lenis.start(); if (shots[idx]) shots[idx].focus(); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-in')) lb.close(); });
  }
})();
