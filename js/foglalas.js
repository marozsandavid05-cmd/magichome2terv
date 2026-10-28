/* Magic Home · időpontfoglaló FELÜLET
   Lépések: 1 típus, 2 nap és időpont, 3 adatok, kész. Az adatot a MHFoglalas modul adja (foglalas-adat.js).
   Billentyűzettel bejárható, a lépésváltáskor a fókusz a lépés címére kerül, személyes adat nem kerül az URL-be. */
(function () {
  var root = document.getElementById('foglalo');
  if (!root || !window.MHFoglalas) return;
  var API = window.MHFoglalas;
  var HO = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
  var NAP = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
  var NAPR = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
  var st = { lepes: 1, tipus: null, hetfo: null, nap: null, ido: null, napok: {} };
  var panes = root.querySelectorAll('[data-pane]');
  var steps = root.querySelectorAll('.bk-steps li');

  function hetfoja(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); var k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x; }
  function napNev(isoStr) { var p = isoStr.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return HO[d.getMonth()] + ' ' + d.getDate() + '., ' + NAP[d.getDay()]; }
  function tipus() { return API.tipusok().filter(function (t) { return t.id === st.tipus; })[0]; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function lep(n, csendes) {
    st.lepes = n;
    [].forEach.call(panes, function (p) { p.hidden = String(p.getAttribute('data-pane')) !== String(n); });
    [].forEach.call(steps, function (s, i) {
      s.classList.toggle('done', i + 1 < n);
      if (i + 1 === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
    root.querySelector('.bk-steps').hidden = n === 'kesz';
    if (csendes) return;
    var h = root.querySelector('[data-pane="' + n + '"] h3, [data-pane="' + n + '"] .h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    var top = root.getBoundingClientRect().top;
    if (top < 0) { if (window.MH && window.MH.lenis) window.MH.lenis.scrollTo(root, { offset: -100 }); else root.scrollIntoView({ block: 'start' }); }
  }

  /* 1. típus */
  var tWrap = root.querySelector('.bk-types');
  API.tipusok().forEach(function (t, i) {
    var lab = el('label', 'opt');
    var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'tipus'; inp.value = t.id;
    lab.appendChild(inp); lab.appendChild(el('span', 'chk'));
    lab.appendChild(el('b', null, t.nev));
    lab.appendChild(el('span', null, t.leiras + ' · ' + t.perc + ' perc'));
    tWrap.appendChild(lab);
    inp.addEventListener('change', function () { st.tipus = t.id; st.nap = null; st.ido = null; root.querySelector('[data-to="2"]').disabled = false; });
  });
  var pre = new URLSearchParams(location.search).get('tipus');
  if (pre) { var r = tWrap.querySelector('input[value="' + pre + '"]'); if (r) { r.checked = true; st.tipus = pre; root.querySelector('[data-to="2"]').disabled = false; } }

  /* 2. nap + időpont */
  var daysEl = root.querySelector('.days'), slotsEl = root.querySelector('.slots'), weekLbl = root.querySelector('.week-bar b');
  var prevW = root.querySelector('[data-week="-1"]'), nextW = root.querySelector('[data-week="1"]'), slotHint = root.querySelector('.slot-hint');
  var first = true;
  function rajzolHet() {
    var h = st.hetfo, v = new Date(h); v.setDate(h.getDate() + 6);
    weekLbl.textContent = HO[h.getMonth()] + ' ' + h.getDate() + '. és ' + (v.getMonth() !== h.getMonth() ? HO[v.getMonth()] + ' ' : '') + v.getDate() + '. között';
    prevW.disabled = hetfoja(new Date()).getTime() >= h.getTime();
    daysEl.innerHTML = ''; slotsEl.innerHTML = '';
    slotHint.textContent = 'Válassz egy napot.';
    daysEl.setAttribute('aria-busy', 'true');
    API.szabad(st.tipus, h).then(function (res) {
      st.napok = res.napok; daysEl.removeAttribute('aria-busy');
      var van = false;
      Object.keys(res.napok).sort().forEach(function (k) {
        var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), n = res.napok[k].length;
        var b = el('button', 'day'); b.type = 'button';
        b.appendChild(el('span', 'dn', NAPR[d.getDay()]));
        b.appendChild(el('span', 'dd', String(d.getDate())));
        b.appendChild(el('span', 'df', n ? n + ' szabad' : 'nincs'));
        b.setAttribute('aria-label', napNev(k) + ', ' + (n ? n + ' szabad időpont' : 'nincs szabad időpont'));
        b.setAttribute('aria-pressed', st.nap === k ? 'true' : 'false');
        if (!n) b.disabled = true; else van = true;
        b.addEventListener('click', function () { st.nap = k; st.ido = null; root.querySelector('[data-to="3"]').disabled = true; [].forEach.call(daysEl.children, function (c) { c.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); rajzolIdo(); });
        daysEl.appendChild(b);
      });
      if (!van && first) { first = false; st.hetfo.setDate(st.hetfo.getDate() + 7); rajzolHet(); return; }
      first = false;
      if (st.nap && st.napok[st.nap]) rajzolIdo();
    });
  }
  function rajzolIdo() {
    slotsEl.innerHTML = '';
    var list = st.napok[st.nap] || [];
    slotHint.textContent = napNev(st.nap) + ': ' + list.length + ' szabad időpont';
    list.forEach(function (t) {
      var b = el('button', 'slot', t); b.type = 'button';
      b.setAttribute('aria-pressed', st.ido === t ? 'true' : 'false');
      b.setAttribute('aria-label', t + ', ' + napNev(st.nap) + ', ' + tipus().perc + ' perc');
      b.addEventListener('click', function () { st.ido = t; [].forEach.call(slotsEl.children, function (c) { c.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); root.querySelector('[data-to="3"]').disabled = false; });
      slotsEl.appendChild(b);
    });
  }
  prevW.addEventListener('click', function () { st.hetfo.setDate(st.hetfo.getDate() - 7); rajzolHet(); });
  nextW.addEventListener('click', function () { st.hetfo.setDate(st.hetfo.getDate() + 7); rajzolHet(); });

  /* 3. adatok */
  var form = root.querySelector('.bk-form'), sum = root.querySelector('.bk-sum');
  function osszegzes() {
    var t = tipus();
    sum.innerHTML = '';
    sum.appendChild(el('b', null, t.nev)); sum.appendChild(document.createTextNode(' · ' + t.perc + ' perc'));
    sum.appendChild(document.createElement('br'));
    sum.appendChild(document.createTextNode(napNev(st.nap) + ', ' + st.ido));
  }

  /* navigáció */
  [].forEach.call(root.querySelectorAll('[data-to]'), function (b) {
    b.addEventListener('click', function () {
      var to = b.getAttribute('data-to');
      if (to === '2') { if (!st.tipus) return; st.hetfo = st.hetfo || hetfoja(new Date()); first = true; rajzolHet(); }
      if (to === '3') { if (!st.ido) return; osszegzes(); }
      lep(isNaN(+to) ? to : +to);
    });
  });
  root.querySelector('[data-to="2"]').disabled = !st.tipus;
  root.querySelector('[data-to="3"]').disabled = true;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    [].forEach.call(form.querySelectorAll('[required]'), function (f) {
      var ok = f.type === 'checkbox' ? f.checked : f.value.trim() && (f.type !== 'email' || /.+@.+\..+/.test(f.value));
      f.setAttribute('aria-invalid', ok ? 'false' : 'true');
      var er = document.getElementById(f.id + '-err'); if (er) er.hidden = !!ok;
      if (!ok && !bad) bad = f;
    });
    if (bad) { bad.focus(); return; }
    var btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Küldés…';
    var d = new FormData(form);
    API.foglal({ tipus: st.tipus, nap: st.nap, ido: st.ido, nev: d.get('nev'), email: d.get('email'), telefon: d.get('telefon'), megjegyzes: d.get('megjegyzes') }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Időpont lefoglalása';
      if (r.status === 409) { st.ido = null; lep(2); rajzolHet(); slotHint.textContent = 'Ezt az időpontot közben lefoglalták. Válassz egy másikat, az adataid megmaradtak.'; return; }
      if (r.status !== 201 || !r.body || !r.body.azonosito) { alert('A foglalás nem sikerült. Kérlek, hívj: +36 20 288 3400'); return; }
      var k = root.querySelector('[data-pane="kesz"]');
      k.querySelector('.who').textContent = String(d.get('nev')).trim().split(' ').slice(-1)[0];
      k.querySelector('.when').textContent = tipus().nev + ', ' + napNev(st.nap) + ', ' + st.ido;
      k.querySelector('.id').textContent = r.body.azonosito;
      lep('kesz');
    });
  });
  [].forEach.call(form.querySelectorAll('[required]'), function (f) {
    f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') { f.setAttribute('aria-invalid', 'false'); var er = document.getElementById(f.id + '-err'); if (er) er.hidden = true; } });
  });
  var uj = root.querySelector('[data-uj]');
  if (uj) uj.addEventListener('click', function () { form.reset(); st = { lepes: 1, tipus: null, hetfo: null, nap: null, ido: null, napok: {} }; [].forEach.call(tWrap.querySelectorAll('input'), function (i) { i.checked = false; }); root.querySelector('[data-to="2"]').disabled = true; lep(1); });

  lep(1, true);
})();
