/* ==========================================================================
   constellation.js — Constellation of Wishes
   --------------------------------------------------------------------------
   Setiap wish yang tersimpan lewat Make a Wish (window.Wishes) tampil sebagai
   satu bintang. Modul ini HANYA MEMBACA wish; tidak punya penyimpanan sendiri.

   Posisi bintang stabil: dihitung dari ID wish (hash -> pengacak berbenih),
   bukan disimpan dan bukan acak per kunjungan.
     1. Wish diurutkan menurut createdAt (lalu id).
     2. Tiap wish membuat 14 kandidat posisi dari pengacak berbenih ID-nya,
        lalu memilih kandidat yang paling jauh dari bintang yang sudah ada.
     3. Karena wish baru selalu paling akhir, bintang lama tidak pernah bergeser.
   Posisi disimpan sebagai pecahan 0..1, sehingga sama di semua ukuran layar.

   Garis penghubung dipilih dengan cara yang sama (deterministik dari ID):
   sebagian bintang terhubung ke tetangga terdekatnya yang lebih dulu ada.

   Data yang tampil ke pengunjung: teks wish dan tanggalnya. ID tidak pernah tampil.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.LETTER_CONFIG || {};
  var DEFAULTS = {
    label: 'Your night sky',
    title: 'Constellation of Wishes',
    intro: 'Every wish becomes a star. Touch one to read it.',
    groupLabel: 'Your wishes, as stars',
    countOne: '1 wish among the stars',
    countMany: '{n} wishes among the stars',
    overflow: 'showing the latest {n}',
    emptyText: 'Your constellation is waiting for its first star.',
    emptyButton: 'Make Your First Wish',
    panelTitle: 'Somewhere in this universe, this wish exists.',
    dateLabel: 'Made on {when}',
    closeLabel: 'Close',
    starLabel: 'Wish {n} of {total}, made on {when}',
    starLabelNoDate: 'Wish {n} of {total}',
    next: 'Continue',
    maxStars: 200
  };
  // Dibaca main.js (bindText) setelah skrip ini dimuat, jadi config lama tanpa blok ini tetap berjalan.
  CFG.chapterConst = Object.assign({}, DEFAULTS, CFG.chapterConst || {});
  var C = CFG.chapterConst;
  var MAX = Number(C.maxStars) > 0 ? Math.min(Math.floor(Number(C.maxStars)), 400) : 200;

  var REF_ASPECT = 1.25;      // perkiraan lebar/tinggi area bintang, untuk jarak yang adil di sumbu x dan y
  var CANDIDATES = 14;
  var NS = 'http://www.w3.org/2000/svg';

  var els = null;
  var state = { ready: false, active: false, open: false, entering: false, selId: null, lastFocus: null, roving: null, closeTimer: 0, linesSig: '' };
  var items = {};             // id -> { id, text, createdAt, el }
  var order = [];             // id berurutan seperti yang digambar
  var fresh = {};             // wish yang dibuat pada sesi ini (diberi kilau lembut sekali)

  var api = {
    init: init, enter: enter, leave: leave, open: openById, close: close,
    isOpen: function () { return state.open; },
    count: function () { return order.length; },
    refresh: function () { if (state.ready) render(); }
  };
  window.Constellation = api;

  /* ---------- util ---------- */
  function $(id) { return document.getElementById(id); }
  function fill(str, map) {
    return String(str).replace(/\{(n|total|when)\}/g, function (m, k) { return map[k] != null ? map[k] : m; });
  }
  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try { return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return d.toDateString(); }
  }
  function cmp(a, b) {
    var da = Date.parse(a.createdAt), db = Date.parse(b.createdAt);
    if (da !== db) return da - db;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  }

  /* ---------- pengacak berbenih (stabil antar kunjungan) ---------- */
  function xmur3(str) {
    var h = 1779033703 ^ str.length, i;
    for (i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFor(seed) { return mulberry32(xmur3(String(seed))()); }

  /* ---------- tata letak deterministik ---------- */
  function dist(a, b) { var dx = (a.x - b.x) * REF_ASPECT, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  // Cache tata letak: posisi sebuah wish hanya bergantung pada ID-nya dan wish-wish yang mendahuluinya.
  // Selama urutan awal daftar sama, hasil lama dipakai ulang dan hanya wish baru yang dihitung.
  var cache = { ids: [], placed: [], edges: [], edgeEnd: [] };   // edgeEnd[i] = jumlah edges setelah wish ke-i

  function placeOne(w, placed, edges) {
    var r = rngFor(w.id), best = null, bestD = -1, k, x, y, d, j;
    for (k = 0; k < CANDIDATES; k++) {
      x = 0.07 + r() * 0.86; y = 0.1 + r() * 0.8;
      d = 1;
      if (placed.length) { d = Infinity; for (j = 0; j < placed.length; j++) d = Math.min(d, dist({ x: x, y: y }, placed[j])); }
      if (d > bestD) { bestD = d; best = { x: x, y: y }; }
    }
    var p = {
      id: w.id, x: best.x, y: best.y,
      s: 0.85 + r() * 0.5,          // ukuran
      b: 0.78 + r() * 0.22,         // kecerahan
      td: r() * 4,                  // jeda kelip
      tt: 3.4 + r() * 3.2           // durasi kelip
    };
    // garis penghubung: ke bintang terdekat yang lebih dulu ada (tidak semua bintang terhubung)
    if (placed.length) {
      var n1 = null, n2 = null, q, dd;
      for (j = 0; j < placed.length; j++) {            // dua terdekat, tanpa mengurutkan seluruh daftar
        q = placed[j]; dd = dist(p, q);
        if (!n1 || dd < n1.d) { n2 = n1; n1 = { id: q.id, d: dd }; }
        else if (!n2 || dd < n2.d) { n2 = { id: q.id, d: dd }; }
      }
      var lr = rngFor(w.id + '#links');
      if (lr() < 0.82 && n1.d < 0.6) edges.push([n1.id, w.id]);
      if (n2 && lr() < 0.2 && n2.d < 0.55) edges.push([n2.id, w.id]);
    }
    placed.push(p);
  }

  function layout(list) {
    var keep = 0;
    while (keep < list.length && keep < cache.ids.length && list[keep].id === cache.ids[keep]) keep++;
    if (keep < cache.ids.length) {                       // urutan berubah di tengah: buang bagian yang tidak cocok
      cache.ids.length = keep; cache.placed.length = keep; cache.edgeEnd.length = keep;
      cache.edges.length = keep ? cache.edgeEnd[keep - 1] : 0;
    }
    for (var i = keep; i < list.length; i++) {
      placeOne(list[i], cache.placed, cache.edges);
      cache.ids.push(list[i].id); cache.edgeEnd.push(cache.edges.length);
    }
    return { stars: cache.placed, edges: cache.edges };
  }

  /* ---------- gambar ---------- */
  function makeStar(id) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cstar';
    b.setAttribute('data-id', id);
    var glow = document.createElement('span'); glow.className = 'cstar__glow'; glow.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'cstar__core'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(NS, 'use'); use.setAttribute('href', '#i-star'); svg.appendChild(use);
    b.appendChild(glow); b.appendChild(svg);
    return b;
  }

  function currentList() {
    var all = (window.Wishes && typeof window.Wishes.all === 'function') ? window.Wishes.all() : [];
    return all.filter(function (w) { return w && typeof w.id === 'string' && typeof w.text === 'string'; }).sort(cmp);
  }

  function render() {
    if (!state.ready) return;
    var list = currentList();
    var total = list.length;
    var lay = layout(list);                         // seluruh wish ikut dihitung agar posisi tidak bergeser
    var skip = Math.max(0, total - MAX);            // yang digambar: MAX terbaru
    var shown = lay.stars.slice(skip);
    var byId = {}; list.forEach(function (w) { byId[w.id] = w; });
    var shownIds = {}; shown.forEach(function (p) { shownIds[p.id] = true; });

    // hapus bintang yang tidak lagi ada
    Object.keys(items).forEach(function (id) {
      if (!shownIds[id]) { if (items[id].el.parentNode) items[id].el.parentNode.removeChild(items[id].el); delete items[id]; }
    });

    var hadFocusId = (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('cstar'))
      ? document.activeElement.getAttribute('data-id') : null;
    order = [];
    shown.forEach(function (p, idx) {
      var w = byId[p.id], it = items[p.id];
      if (!it) { it = items[p.id] = { id: p.id, el: makeStar(p.id) }; }
      it.text = w.text; it.createdAt = w.createdAt;
      var el = it.el;
      if (it.createdAt !== it.whenFor) { it.whenFor = it.createdAt; it.when = fmtDate(it.createdAt); }   // format tanggal hanya sekali per wish
      var when = it.when;
      el.style.setProperty('--x', (p.x * 100).toFixed(3));
      el.style.setProperty('--y', (p.y * 100).toFixed(3));
      el.style.setProperty('--s', p.s.toFixed(3));
      el.style.setProperty('--b', p.b.toFixed(3));
      el.style.setProperty('--td', '-' + p.td.toFixed(2) + 's');
      el.style.setProperty('--tt', p.tt.toFixed(2) + 's');
      if (!el.parentNode || state.entering) el.style.setProperty('--i', String(state.entering ? Math.min(idx, 18) : 0));
      el.setAttribute('aria-label', when
        ? fill(C.starLabel, { n: idx + 1, total: total, when: when })
        : fill(C.starLabelNoDate, { n: idx + 1, total: total }));
      el.classList.toggle('is-new', !!fresh[p.id]);
      order.push(p.id);
    });

    // susun urutan DOM tanpa memindahkan elemen yang sudah benar (agar fokus tidak hilang)
    var host = els.stars;
    order.forEach(function (id, i) {
      var el = items[id].el;
      if (host.children[i] !== el) host.insertBefore(el, host.children[i] || null);
    });
    if (hadFocusId && items[hadFocusId] && document.activeElement !== items[hadFocusId].el) items[hadFocusId].el.focus({ preventScroll: true });

    // satu tab-stop (roving tabindex)
    if (!state.roving || !items[state.roving]) state.roving = order[0] || null;
    order.forEach(function (id) { items[id].el.tabIndex = (id === state.roving) ? 0 : -1; });

    renderLines(lay.edges, shownIds);
    updateChrome(total, skip);
  }

  function renderLines(edges, shownIds) {
    var use = edges.filter(function (e) { return shownIds[e[0]] && shownIds[e[1]]; });
    var sig = use.map(function (e) { return e.join('>'); }).join('|');
    if (sig === state.linesSig) { litLines(); return; }
    state.linesSig = sig;
    var svg = els.lines;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var pos = {};
    order.forEach(function (id) {
      pos[id] = { x: parseFloat(items[id].el.style.getPropertyValue('--x')), y: parseFloat(items[id].el.style.getPropertyValue('--y')) };
    });
    use.forEach(function (e, n) {
      var a = pos[e[0]], b = pos[e[1]];
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      ln.setAttribute('data-a', e[0]); ln.setAttribute('data-b', e[1]);
      ln.style.setProperty('--li', String(Math.min(n, 24)));
      svg.appendChild(ln);
    });
    litLines();
  }

  function litLines() {
    var lines = els.lines.childNodes;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var on = !!state.selId && (ln.getAttribute('data-a') === state.selId || ln.getAttribute('data-b') === state.selId);
      ln.classList.toggle('is-lit', on);
    }
  }

  function updateChrome(total, skip) {
    var has = order.length > 0;
    els.empty.hidden = has;
    els.stars.hidden = !has;
    els.lines.style.display = has ? '' : 'none';
    if (!total) { els.count.hidden = true; els.count.textContent = ''; return; }
    var s = total === 1 ? C.countOne : fill(C.countMany, { n: total });
    if (skip > 0) s += ' · ' + fill(C.overflow, { n: MAX });
    els.count.textContent = s;
    els.count.hidden = false;
  }

  /* ---------- panel detail ---------- */
  function openById(id) {
    var it = items[id];
    if (!state.ready || !it) return false;
    return openPanel(it, it.el);
  }

  // Semua yang berada di luar panel: area konstelasi, bar atas (kembali/menu/musik) dan menu chapter.
  function setBackdropInert(on) {
    var nodes = [els.main, $('topbar'), $('menu')];
    nodes.forEach(function (n) { if (n) { if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); } });
  }

  function openPanel(it, trigger) {
    clearTimeout(state.closeTimer);
    state.open = true; state.selId = it.id; state.lastFocus = trigger || null;
    delete fresh[it.id]; it.el.classList.remove('is-new');
    order.forEach(function (id) { items[id].el.classList.toggle('is-selected', id === it.id); });
    litLines();

    els.text.textContent = it.text;                         // textContent: tidak pernah memasukkan HTML
    var when = fmtDate(it.createdAt);
    els.date.textContent = when ? fill(C.dateLabel, { when: when }) : '';
    els.date.hidden = !when;

    setBackdropInert(true);                                 // latar (termasuk topbar & menu) tidak bisa difokus/diklik
    els.wrap.removeAttribute('inert');
    els.wrap.setAttribute('aria-hidden', 'false');
    els.panel.scrollTop = 0;
    void els.wrap.offsetWidth;                              // memulai transisi masuk dari keadaan tertutup
    els.wrap.classList.add('is-open');
    setTimeout(function () { if (state.open) { try { els.panel.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } } }, prefersReduced() ? 20 : 80);
    return true;
  }

  function close(opts) {
    if (!state.open) return;
    var silent = !!(opts && opts.silent);
    state.open = false;
    var sel = state.selId; state.selId = null;
    els.wrap.classList.remove('is-open');
    setBackdropInert(false);
    order.forEach(function (id) { items[id].el.classList.remove('is-selected'); });
    litLines();
    clearTimeout(state.closeTimer);
    var done = function () {
      if (state.open) return;                                // dibuka lagi sebelum transisi selesai
      els.wrap.setAttribute('inert', '');
      els.wrap.setAttribute('aria-hidden', 'true');
    };
    if (silent) done(); else state.closeTimer = setTimeout(done, prefersReduced() ? 30 : 460);
    if (!silent) {
      var back = (sel && items[sel] && items[sel].el.isConnected) ? items[sel].el : (state.lastFocus && state.lastFocus.isConnected ? state.lastFocus : null);
      try { (back || els.next).focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
    }
    state.lastFocus = null;
  }

  /* ---------- interaksi (satu listener per elemen, bukan per bintang) ---------- */
  function onStageClick(e) {
    var b = e.target.closest ? e.target.closest('.cstar') : null;
    if (!b || !els.stars.contains(b)) return;
    state.roving = b.getAttribute('data-id');
    order.forEach(function (id) { items[id].el.tabIndex = (id === state.roving) ? 0 : -1; });
    var it = items[b.getAttribute('data-id')];
    if (it) openPanel(it, b);
  }

  function onStageKey(e) {
    var b = e.target.closest ? e.target.closest('.cstar') : null;
    if (!b) return;
    var i = order.indexOf(b.getAttribute('data-id')), n = order.length, to = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + n) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    else return;
    e.preventDefault();
    e.stopPropagation();                                    // panah di sini memilih bintang, bukan pindah chapter
    state.roving = order[to];
    order.forEach(function (id) { items[id].el.tabIndex = (id === state.roving) ? 0 : -1; });
    items[order[to]].el.focus();
  }

  function onWrapKey(e) {
    if (e.key === 'Tab' && state.open) { e.preventDefault(); els.close.focus(); }   // satu-satunya kontrol di panel
  }

  /* ---------- siklus hidup ---------- */
  function init() {
    if (state.ready) return;
    els = {
      main: $('constMain'), stage: $('constStage'), stars: $('constStars'), lines: $('constLines'),
      empty: $('constEmpty'), count: $('constCount'), next: $('nextConst'),
      wrap: $('cPanelWrap'), panel: $('cPanel'), close: $('cpClose'), text: $('cpText'), date: $('cpDate')
    };
    for (var k in els) if (!els[k]) { console.warn('[Constellation] elemen tidak ditemukan:', k); return; }
    state.ready = true;

    els.stars.addEventListener('click', onStageClick);
    els.stars.addEventListener('keydown', onStageKey);
    els.close.addEventListener('click', function () { close(); });
    els.wrap.addEventListener('click', function (e) { if (e.target === els.wrap) close(); });   // klik di luar kartu
    els.wrap.addEventListener('keydown', onWrapKey);

    // wish baru (dari tab ini maupun tab lain) langsung memperbarui langit bila sedang tampil
    window.addEventListener('wishes:changed', function (e) {
      var d = e && e.detail;
      if (d && d.type === 'add' && d.wish && d.wish.id) fresh[d.wish.id] = true;
      if (state.active) render();
    });
  }

  function enter() {
    if (!state.ready) return;
    state.active = true;
    state.entering = true;
    state.linesSig = '';
    render();
    state.entering = false;
  }

  function leave() {
    if (!state.ready) return;
    state.active = false;
    if (state.open) close({ silent: true });
    fresh = {};
    order.forEach(function (id) { items[id].el.classList.remove('is-new'); });
  }
})();
