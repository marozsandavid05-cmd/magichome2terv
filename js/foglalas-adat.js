/* Magic Home · időpontfoglalás ADAT-modul (cserélhető végpont)
   A bemutatóban mintaadattal fut, semmi nem megy ki a gépről.
   Élesítéskor (Caesar, Google Naptáras backend) csak az ENDPOINT-ot kell megadni:
     GET  {ENDPOINT}/szabad?tipus=<id>&het=<YYYY-MM-DD hétfő>  -> { napok: { 'YYYY-MM-DD': ['09:00', ...] } }
     POST {ENDPOINT}/foglalas  body: { tipus, nap, ido, nev, email, telefon, megjegyzes }
                                -> 201 { azonosito } | 409 { kod: 'foglalt' }
   A felület (foglalas.js) csak ezt a három függvényt hívja: tipusok(), szabad(), foglal(). */
(function () {
  var ENDPOINT = null; // pl. 'https://magic-home.hu/api'  (amíg null: bemutató-mód)

  var TIPUSOK = [
    { id: 'online', nev: 'Online tanácsadás', leiras: 'Videóhívás, a tér fotói és alaprajza alapján', perc: 60 },
    { id: 'szemelyes', nev: 'Személyes konzultáció', leiras: 'A helyszínen, igényfelméréssel', perc: 90 },
    { id: 'telefon', nev: 'Rövid egyeztetés', leiras: 'Telefonon, az első kérdésekre', perc: 20 }
  ];

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // determinisztikus minta-foglaltság: hétköznap 9 és 17 óra között (Etikai Kódex szerinti munkaidő)
  function mintaNap(d, tipus) {
    var dow = d.getDay();
    if (dow === 0 || dow === 6) return [];
    var perc = (TIPUSOK.filter(function (t) { return t.id === tipus; })[0] || TIPUSOK[0]).perc;
    var lepes = perc >= 60 ? 90 : 30, out = [];
    var seed = d.getDate() * 7 + d.getMonth() * 13 + tipus.length;
    for (var m = 9 * 60; m + perc <= 17 * 60; m += lepes) {
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.42) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    }
    if (d.getDate() % 9 === 0) return []; // egy-egy betelt nap
    return out;
  }

  function szabad(tipus, hetfo) {
    if (ENDPOINT) {
      return fetch(ENDPOINT + '/szabad?tipus=' + encodeURIComponent(tipus) + '&het=' + iso(hetfo)).then(function (r) {
        if (!r.ok) throw new Error('szabad ' + r.status); return r.json();
      });
    }
    var napok = {}, ma = new Date(); ma.setHours(0, 0, 0, 0);
    for (var i = 0; i < 7; i++) {
      var d = new Date(hetfo); d.setDate(hetfo.getDate() + i);
      napok[iso(d)] = d <= ma ? [] : mintaNap(d, tipus);
    }
    return new Promise(function (res) { setTimeout(function () { res({ napok: napok }); }, 180); });
  }

  function foglal(adat) {
    if (ENDPOINT) {
      return fetch(ENDPOINT + '/foglalas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adat) })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); });
    }
    return new Promise(function (res) {
      setTimeout(function () { res({ status: 201, body: { azonosito: 'MINTA-' + adat.nap.replace(/-/g, '').slice(4) + adat.ido.replace(':', ''), bemutato: true } }); }, 420);
    });
  }

  window.MHFoglalas = {
    bemutato: !ENDPOINT,
    tipusok: function () { return TIPUSOK.slice(); },
    szabad: szabad,
    foglal: foglal,
    iso: iso
  };
})();
