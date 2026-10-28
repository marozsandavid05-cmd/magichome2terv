/* A · bucket-render signature (weboldal-2: gyűrű-forma alapból, ?hero=eredeti a négyzetes eredeti).
   A hero render úgy jelenik meg, mint egy renderelő program kimenete: előbb lágy, elmosott első menet,
   aztán négyzetes „bucketekben” élesedik a fókuszpontból kifelé, közben a felirat a százalékot mutatja.
   1,5 s, utána a canvas eltűnik és az <img> marad. Reduced-motion alatt nem fut. Csak drawImage, nincs getImageData. */
(function () {
  var fig = document.querySelector('.hero-print');
  if (!fig) return;
  var img = fig.querySelector('img'), cv = fig.querySelector('canvas'), cap = fig.querySelector('.cap');
  var done = cap ? cap.textContent : '';
  if (!cv || document.documentElement.classList.contains('rm')) { if (cv) cv.remove(); return; }
  var ctx = cv.getContext('2d');
  var safety = setTimeout(finish, 4000);

  function cover(W, H, iw, ih, px, py) {
    var s = Math.max(W / iw, H / ih), w = iw * s, h = ih * s;
    return { x: (W - w) * px, y: (H - h) * py, w: w, h: h };
  }
  function finish() {
    clearTimeout(safety);
    if (cap) cap.textContent = done;
    cv.style.opacity = '0';
    setTimeout(function () { cv.remove(); }, 700);
  }
  function run() {
    var r = fig.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (!W || !H) return finish();
    cv.width = W; cv.height = H;
    var op = getComputedStyle(img).objectPosition.split(' ').map(function (v) { return parseFloat(v) / 100; });
    var c = cover(W, H, img.naturalWidth, img.naturalHeight, op[0] || .5, op[1] || .5);
    // első menet: lágy, elmosott előnézet (mint a renderelő prepass-a), nem mozaik
    var lo = document.createElement('canvas'); lo.width = Math.max(8, Math.round(W / (40 * dpr))); lo.height = Math.max(6, Math.round(H / (40 * dpr)));
    var lx = lo.getContext('2d'); lx.drawImage(img, c.x * lo.width / W, c.y * lo.height / H, c.w * lo.width / W, c.h * lo.height / H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; if ('filter' in ctx) ctx.filter = 'saturate(.35) brightness(1.04)'; ctx.drawImage(lo, 0, 0, W, H); if ('filter' in ctx) ctx.filter = 'none';
    // bucketek a fókuszpontból kifelé
    var B = Math.round(Math.max(56, Math.min(110, r.width / 14)) * dpr), tiles = [];
    var fx = W * .5, fy = H * .52;
    // forma: alapból „gyűrű” (körcikk-bucketek a fókuszból, mint egy kinyíló írisz), a `hero-eredeti` osztállyal az eredeti négyzetek
    var ring = !document.documentElement.classList.contains('hero-eredeti');
    if (ring) {
      var R = Math.sqrt(Math.max(fx, W - fx) * Math.max(fx, W - fx) + Math.max(fy, H - fy) * Math.max(fy, H - fy));
      for (var r0 = 0; r0 < R; r0 += B) {
        var rm = r0 + B / 2, n = Math.max(6, Math.round(2 * Math.PI * rm / (B * 1.15))), off = Math.random() * Math.PI * 2;
        for (var j = 0; j < n; j++) {
          var a0 = off + j * 2 * Math.PI / n;
          tiles.push({ r0: r0, r1: r0 + B, a0: a0, a1: a0 + 2 * Math.PI / n, k: rm + Math.random() * B * 1.2 });
        }
      }
    } else {
      for (var y = 0; y < H; y += B) for (var x = 0; x < W; x += B) {
        var dx = x + B / 2 - fx, dy = y + B / 2 - fy;
        tiles.push({ x: x, y: y, k: Math.sqrt(dx * dx + dy * dy) + Math.random() * B * 1.2 });
      }
    }
    function shape(tl, grow) {
      ctx.beginPath();
      if (!ring) { ctx.rect(tl.x, tl.y, B, B); return; }
      var g = grow || 0, da = g / Math.max(tl.r1, 1);
      ctx.arc(fx, fy, tl.r1 + g, tl.a0 - da, tl.a1 + da);
      ctx.arc(fx, fy, Math.max(0, tl.r0 - g), tl.a1 + da, tl.a0 - da, true);
      ctx.closePath();
    }
    tiles.sort(function (a, b) { return a.k - b.k; });
    var t0 = performance.now(), DUR = 1600, HOLD = 260, n = 0, live = [];
    function bracket(tl) {
      ctx.strokeStyle = 'rgba(232,230,224,.95)'; ctx.lineWidth = Math.max(1.5, 1.5 * dpr);
      if (ring) { var am = (tl.a0 + tl.a1) / 2, h = Math.min((tl.a1 - tl.a0) * .3, B * .3 / Math.max(tl.r1, 1)); ctx.beginPath(); ctx.arc(fx, fy, tl.r1 - 2 * dpr, am - h, am + h); ctx.stroke(); if (tl.r0 > B) { ctx.beginPath(); ctx.arc(fx, fy, tl.r0 + 2 * dpr, am - h, am + h); ctx.stroke(); } return; }
      var L = B * .3, i = 2 * dpr, x0 = tl.x + i, y0 = tl.y + i, x1 = tl.x + B - i, y1 = tl.y + B - i;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
      ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
      ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
      ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
      ctx.stroke();
    }
    function paint(t) {
      var p = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - p, 1.5), want = Math.round(e * tiles.length);
      while (n < want) { tiles[n].t = t; live.push(tiles[n]); draw(tiles[n]); n++; }
      // a „renderelő” bucketek kerete HOLD ms-ig látszik, aztán a kész kép marad
      live = live.filter(function (tl) {
        if (t - tl.t > HOLD) { draw(tl); return false; }
        draw(tl); bracket(tl); return true;
      });
      if (cap) cap.textContent = 'Renderelés ' + Math.round(p * 100) + '%';
      if (p < 1 || live.length) requestAnimationFrame(paint); else setTimeout(finish, 200);
    }
    function draw(tl) {
      ctx.save(); shape(tl, dpr); ctx.clip();
      ctx.drawImage(img, c.x, c.y, c.w, c.h); ctx.restore();
    }
    requestAnimationFrame(paint);
  }
  var go = function () { (img.decode ? img.decode() : Promise.resolve()).then(run, finish); };
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
})();
