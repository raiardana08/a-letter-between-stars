/* ==========================================================================
   bottle.js — Wish in a Bottle
   --------------------------------------------------------------------------
   Botol kaca (SVG) berisi wish dari "Make a Wish". Modul ini HANYA MEMBACA
   wish lewat window.Wishes.all(); tidak punya penyimpanan sendiri dan tidak
   menyalin data. Sumber data sama dengan Constellation of Wishes.

   Alur: ketuk botol -> gabus terangkat, gulungan naik -> panel surat terbuka
   dengan satu wish. Bila wish lebih dari satu: tombol sebelumnya/berikutnya
   (dan panah kiri/kanan) berpindah antar wish; hanya satu wish tampil.
   Pembukaan botol berikutnya memilih wish yang berbeda dari yang terakhir dibaca.

   Data yang tampil ke pengunjung: teks wish, tanggalnya, dan "n dari total".
   ID tidak pernah tampil.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.LETTER_CONFIG || {};
  var DEFAULTS = {
    label: 'Kept for later',
    title: 'Wish in a Bottle',
    intro: 'Some wishes deserve to be kept, even when the night is over.',
    hint: 'Touch the bottle to open it',
    bottleLabel: 'Open the bottle and read a wish',
    countOne: '1 wish inside',
    countMany: '{n} wishes inside',
    panelTitle: 'A wish from the bottle',
    dateLabel: 'Made on {when}',
    position: '{n} of {total}',
    prevLabel: 'Previous wish',
    nextLabel: 'Next wish',
    closeLabel: 'Close',
    emptyText: 'Some wishes are still waiting to be written.',
    emptyButton: 'Write a Wish',
    next: 'Continue'
  };
  // Dibaca main.js (bindText) setelah skrip ini dimuat, jadi config lama tanpa blok ini tetap berjalan.
  CFG.chapterBottle = Object.assign({}, DEFAULTS, CFG.chapterBottle || {});
  var C = CFG.chapterBottle;

  var els = null;
  var list = [];                       // wish valid, berurutan menurut waktu dibuat (salinan dangkal dari Wishes.all())
  var state = { ready: false, active: false, open: false, opening: false, idx: -1, curId: null, lastIdx: -1, lastFocus: null, timer: 0, closeTimer: 0, swapTimer: 0 };

  var api = {
    init: init, enter: enter, leave: leave, close: close,
    open: openBottle,
    isOpen: function () { return state.open; },
    count: function () { return list.length; },
    current: function () { return state.open ? state.curId : null; },
    refresh: function () { if (state.ready) sync(); }
  };
  window.Bottle = api;

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

  /* ---------- data: satu sumber kebenaran (Wishes.all) ---------- */
  function readList() {
    var all = (window.Wishes && typeof window.Wishes.all === 'function') ? window.Wishes.all() : [];
    return all.filter(function (w) { return w && typeof w.id === 'string' && typeof w.text === 'string'; });
  }

  // Muat ulang daftar dan perbarui tampilan. Wish yang sedang dibaca tetap dipertahankan lewat ID-nya.
  function sync() {
    list = readList();
    if (state.open) {
      var at = indexOfId(state.curId);
      if (at < 0) { if (list.length) { state.idx = Math.min(state.idx, list.length - 1); showAt(state.idx, true); } else close(); }
      else { state.idx = at; updatePos(); }
    }
    updateChrome();
  }
  function indexOfId(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }

  function updateChrome() {
    var n = list.length, has = n > 0;
    els.empty.hidden = has;
    els.btn.hidden = !has;
    els.sea.classList.toggle('is-dim', !has);
    els.hint.hidden = !has;
    els.main.classList.toggle('is-empty', !has);
    if (!has) { els.count.hidden = true; els.count.textContent = ''; return; }
    els.count.textContent = n === 1 ? C.countOne : fill(C.countMany, { n: n });
    els.count.hidden = false;
  }

  /* ---------- panel surat ---------- */
  function pickIndex() {
    var n = list.length;
    if (n <= 1) return 0;
    var i = Math.floor(Math.random() * n);
    if (i === state.lastIdx) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;   // selalu berbeda dari yang terakhir
    return i;
  }

  function updatePos() {
    var n = list.length;
    els.pos.textContent = fill(C.position, { n: state.idx + 1, total: n });
    els.nav.hidden = n < 2;
  }

  function showAt(i, instant) {
    var n = list.length;
    if (!n) return;
    i = ((i % n) + n) % n;
    var w = list[i];
    state.idx = i; state.curId = w.id; state.lastIdx = i;
    var apply = function () {
      els.text.textContent = w.text;                         // textContent: tidak pernah memasukkan HTML
      var when = fmtDate(w.createdAt);
      els.date.textContent = when ? fill(C.dateLabel, { when: when }) : '';
      els.date.hidden = !when;
      els.panel.scrollTop = 0;
      updatePos();
      els.body.classList.remove('is-swap');
    };
    clearTimeout(state.swapTimer);
    if (instant || prefersReduced()) { apply(); return; }
    els.body.classList.add('is-swap');                       // pudar singkat saat berpindah wish
    state.swapTimer = setTimeout(apply, 180);
  }

  function step(dir) {
    if (!state.open || list.length < 2) return;
    showAt(state.idx + dir, false);
  }

  // Semua yang berada di luar panel: area botol, bar atas (kembali/menu/musik) dan menu chapter.
  function setBackdropInert(on) {
    [els.main, $('topbar'), $('menu')].forEach(function (n) { if (n) { if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); } });
  }

  function openBottle(trigger) {
    if (!state.ready || state.open || state.opening) return false;
    list = readList();
    if (!list.length) { updateChrome(); return false; }
    var reduced = prefersReduced();
    state.opening = true;
    state.lastFocus = trigger || els.btn;
    els.btn.classList.add('is-opening');                     // gabus terangkat, gulungan naik
    state.timer = setTimeout(function () { reveal(); }, reduced ? 0 : 700);
    return true;
  }

  function reveal() {
    state.opening = false;
    if (!state.active) { els.btn.classList.remove('is-opening'); return; }
    if (!list.length) { els.btn.classList.remove('is-opening'); updateChrome(); return; }
    state.open = true;
    els.body.classList.remove('is-swap');
    showAt(pickIndex(), true);
    setBackdropInert(true);                                  // latar tidak bisa difokus/diklik selama panel terbuka
    els.wrap.removeAttribute('inert');
    els.wrap.setAttribute('aria-hidden', 'false');
    void els.wrap.offsetWidth;                               // memulai transisi masuk dari keadaan tertutup
    els.wrap.classList.add('is-open');
    setTimeout(function () { if (state.open) { try { els.panel.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } } }, prefersReduced() ? 20 : 80);
  }

  function close(opts) {
    clearTimeout(state.timer);
    if (state.opening) { state.opening = false; els.btn.classList.remove('is-opening'); }
    if (!state.open) return;
    var silent = !!(opts && opts.silent);
    state.open = false; state.curId = null;
    clearTimeout(state.swapTimer);
    els.wrap.classList.remove('is-open');
    setBackdropInert(false);
    clearTimeout(state.closeTimer);
    var done = function () {
      if (state.open) return;                                // dibuka lagi sebelum transisi selesai
      els.wrap.setAttribute('inert', '');
      els.wrap.setAttribute('aria-hidden', 'true');
      els.btn.classList.remove('is-opening');                // gabus turun kembali setelah panel tertutup
    };
    if (silent) done(); else state.closeTimer = setTimeout(done, prefersReduced() ? 30 : 460);
    if (!silent) { try { (state.lastFocus && state.lastFocus.isConnected ? state.lastFocus : els.btn).focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }
    state.lastFocus = null;
  }

  /* ---------- interaksi ---------- */
  function onBottleClick() { openBottle(els.btn); }

  function onWrapKey(e) {
    if (!state.open) return;
    if (e.key === 'Tab') {                                   // fokus berputar di dalam panel
      var f = [els.close, els.prev, els.next].filter(function (b) { return !els.nav.hidden || b === els.close; });
      var at = f.indexOf(document.activeElement);
      e.preventDefault();
      if (e.shiftKey) f[(at <= 0 ? f.length : at) - 1].focus();
      else f[(at + 1) % f.length].focus();
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); step(1); }
  }

  function onWrapClick(e) { if (e.target === els.wrap) close(); }   // klik pada latar (di luar kartu)

  /* ---------- siklus hidup ---------- */
  function init() {
    if (state.ready) return;
    els = {
      main: $('bottleMain'), stage: $('bottleStage'), sea: document.querySelector('#bottleStage .bottle-sea'), btn: $('bottleBtn'),
      empty: $('bottleEmpty'), count: $('bottleCount'), hint: $('bottleHint'),
      wrap: $('bPanelWrap'), panel: $('bPanel'), close: $('bpClose'), body: $('bpBody'), text: $('bpText'), date: $('bpDate'),
      nav: $('bpNav'), prev: $('bpPrev'), next: $('bpNext'), pos: $('bpPos')
    };
    for (var k in els) if (!els[k]) { console.warn('[Bottle] elemen tidak ditemukan:', k); return; }
    state.ready = true;

    els.btn.addEventListener('click', onBottleClick);
    els.close.addEventListener('click', function () { close(); });
    els.prev.addEventListener('click', function () { step(-1); });
    els.next.addEventListener('click', function () { step(1); });
    els.wrap.addEventListener('keydown', onWrapKey);
    els.wrap.addEventListener('click', onWrapClick);
    window.addEventListener('wishes:changed', function () { if (state.active || state.open) sync(); });
    list = readList();
    updateChrome();
  }

  function enter() {
    if (!state.ready) return;
    state.active = true;
    sync();
  }

  function leave() {
    if (!state.ready) return;
    state.active = false;
    close({ silent: true });
    els.btn.classList.remove('is-opening');
  }
})();
