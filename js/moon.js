/* ==========================================================================
   moon.js — A Message from the Moon
   --------------------------------------------------------------------------
   Bulan bercahaya (SVG). Ketuk bulan -> cahaya lembut -> satu pesan muncul di
   panel kaca. "Another Message" menampilkan pesan lain.

   Bukan chatbot dan tidak membuat jawaban: semua pesan adalah larik MESSAGES
   di bawah ini. Tanpa API, tanpa internet, tanpa localStorage.

   Pemilihan acak ("kartu kocok"):
     - Pesan dikocok menjadi satu tumpukan, lalu ditarik satu per satu.
       Tidak ada pesan yang muncul lagi sebelum semua pesan lain terbaca.
     - Saat tumpukan habis, dikocok ulang; pesan pertama tumpukan baru dipastikan
       berbeda dari pesan terakhir, jadi tidak pernah ada pesan sama berturut-turut.
     - Jika jumlah pesan berubah (mis. config menimpa), tumpukan dibangun ulang.
   ========================================================================== */
(function () {
  'use strict';

  var MESSAGES = [
    'Look twice at the quiet evenings. They hold more than they seem to.',
    'There is a kind of kindness that never announces itself. It simply stays, softly, in the room.',
    'Not every good thing arrives loudly. Some arrive the way moonlight does, without a sound.',
    'Somewhere, a small thing you did is still being remembered fondly.',
    'You do not have to be certain about tomorrow to be grateful for tonight.',
    'The sky is patient. It lets every star arrive in its own time.',
    'A gentle person is easy to overlook and impossible to forget.',
    'Whatever today asked of you, you may set it down for a while. The night will hold it.',
    'Someone is glad that you exist, whether or not they have found the words.',
    'Light travels a very long way just to be noticed. Some feelings do the same.',
    'Rest is not the opposite of progress. It is where the next morning gathers its colour.',
    'You have a way of making ordinary hours feel slightly more worth living.',
    'If a thought of someone warms you, let it. That warmth is allowed to be enough.',
    'The moon is never whole to every eye, yet it is never less than itself.',
    'Hope is often just the habit of leaving a window open.',
    'There are people who make a room feel lit from within. You may be one of them.',
    'Quiet is not emptiness. It is where small, true things finally get heard.',
    'Some admiration asks for nothing. It simply wishes you well from a distance.',
    'Be patient with the version of you that is still growing. It is doing its best in the dark.',
    'A long day can end gently. Let this be the gentle part.',
    'The things you love about the world are a kind of map. Follow them.',
    'A wish does not need an answer tonight. Many are happy simply to be kept.',
    'Your laughter has probably travelled farther than you know.',
    'Courage often looks like an ordinary morning handled with care.',
    'Let the night be wide. You are allowed to take up as much stillness as you need.',
    'Beyond the noise, a soft and steady part of you already knows the way.',
    'A memory does not have to be large to be luminous.',
    'May the next small good thing find you before you go looking for it.'
  ];

  var CFG = window.LETTER_CONFIG || {};
  var DEFAULTS = {
    label: 'Moonlight',
    title: 'A Message from the Moon',
    intro: 'Sometimes, a little light is enough to remind us of something beautiful.',
    hint: 'Touch the moon to discover a message.',
    moonLabel: 'Touch the moon to discover a message',
    panelTitle: 'From the Moon',
    another: 'Another Message',
    closeLabel: 'Close',
    next: 'Continue'
  };
  // Dibaca main.js (bindText) setelah skrip ini dimuat, jadi config lama tanpa blok ini tetap berjalan.
  CFG.chapterMoon = Object.assign({}, DEFAULTS, CFG.chapterMoon || {});
  var C = CFG.chapterMoon;

  var els = null;
  var state = { ready: false, active: false, open: false, lighting: false, lastFocus: null, timer: 0, closeTimer: 0 };
  var deck = [], deckSize = 0, last = '';

  var api = {
    init: init, enter: enter, leave: leave, close: close,
    open: openMoon,
    next: function () { return draw(); },                    // menarik pesan berikutnya (dipakai juga oleh uji)
    isOpen: function () { return state.open; },
    count: function () { return messages().length; }
  };
  window.Moon = api;

  /* ---------- util ---------- */
  function $(id) { return document.getElementById(id); }
  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- koleksi & pemilihan acak ---------- */
  // Pesan dari config (opsional) menimpa bawaan; hanya teks yang tidak kosong yang dipakai, tanpa duplikat.
  function messages() {
    var src = (C.messages && Array.isArray(C.messages) && C.messages.length) ? C.messages : MESSAGES;
    var seen = {}, out = [];
    src.forEach(function (m) {
      if (typeof m !== 'string') return;
      var t = m.trim();
      if (t && !seen[t]) { seen[t] = true; out.push(t); }
    });
    return out.length ? out : MESSAGES.slice();
  }

  function shuffle(a) {                                      // Fisher–Yates
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function draw() {
    var all = messages();
    if (!deck.length || deckSize !== all.length) {           // tumpukan habis atau jumlah pesan berubah
      deck = shuffle(all.slice()); deckSize = all.length;
      if (all.length > 1 && deck[deck.length - 1] === last) {   // kartu berikutnya = ujung larik; jangan sama dengan yang terakhir
        var k = Math.floor(Math.random() * (deck.length - 1));
        var t = deck[k]; deck[k] = deck[deck.length - 1]; deck[deck.length - 1] = t;
      }
    }
    var m = deck.pop();
    if (all.length > 1 && m === last && deck.length) {       // pengaman tambahan
      var alt = deck.pop(); deck.push(m); m = alt;
    }
    last = m;
    return m;
  }

  /* ---------- tampilan teks (muncul kata demi kata) ---------- */
  function showMessage(text) {
    var box = els.text;
    while (box.firstChild) box.removeChild(box.firstChild);
    var words = text.split(/\s+/), reduced = prefersReduced();
    words.forEach(function (w, i) {
      var sp = document.createElement('span');
      sp.className = 'mw';
      sp.textContent = w;
      sp.style.setProperty('--w', String(Math.min(i, 28)));
      box.appendChild(sp);
      if (i < words.length - 1) box.appendChild(document.createTextNode(' '));
    });
    box.classList.remove('is-reveal');
    if (!reduced) { void box.offsetWidth; box.classList.add('is-reveal'); }
    els.panel.scrollTop = 0;
  }

  // Semua yang berada di luar panel: area bulan, bar atas (kembali/menu/musik) dan menu chapter.
  function setBackdropInert(on) {
    [els.main, $('topbar'), $('menu')].forEach(function (n) { if (n) { if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); } });
  }

  /* ---------- buka / tutup ---------- */
  function openMoon(trigger) {
    if (!state.ready || state.open || state.lighting) return false;
    state.lighting = true;
    state.lastFocus = trigger || els.btn;
    els.btn.classList.remove('is-lit'); void els.btn.offsetWidth;
    els.btn.classList.add('is-lit');                         // cahaya bulan yang tertahan
    state.timer = setTimeout(reveal, prefersReduced() ? 0 : 650);
    return true;
  }

  function reveal() {
    state.lighting = false;
    if (!state.active) { els.btn.classList.remove('is-lit'); return; }
    state.open = true;
    showMessage(draw());
    setBackdropInert(true);                                  // latar tidak bisa difokus/diklik selama panel terbuka
    els.wrap.removeAttribute('inert');
    els.wrap.setAttribute('aria-hidden', 'false');
    void els.wrap.offsetWidth;                               // memulai transisi masuk dari keadaan tertutup
    els.wrap.classList.add('is-open');
    setTimeout(function () { if (state.open) { try { els.panel.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } } }, prefersReduced() ? 20 : 80);
  }

  function another() {
    if (!state.open) return;
    showMessage(draw());
  }

  function close(opts) {
    clearTimeout(state.timer);
    if (state.lighting) { state.lighting = false; els.btn.classList.remove('is-lit'); }
    if (!state.open) return;
    var silent = !!(opts && opts.silent);
    state.open = false;
    els.wrap.classList.remove('is-open');
    setBackdropInert(false);
    clearTimeout(state.closeTimer);
    var done = function () {
      if (state.open) return;                                // dibuka lagi sebelum transisi selesai
      els.wrap.setAttribute('inert', '');
      els.wrap.setAttribute('aria-hidden', 'true');
      els.btn.classList.remove('is-lit');
    };
    if (silent) done(); else state.closeTimer = setTimeout(done, prefersReduced() ? 30 : 460);
    if (!silent) { try { (state.lastFocus && state.lastFocus.isConnected ? state.lastFocus : els.btn).focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }
    state.lastFocus = null;
  }

  /* ---------- interaksi ---------- */
  function onWrapKey(e) {
    if (!state.open || e.key !== 'Tab') return;              // fokus berputar di antara Close dan Another Message
    var f = [els.close, els.another], at = f.indexOf(document.activeElement);
    e.preventDefault();
    if (e.shiftKey) f[(at <= 0 ? f.length : at) - 1].focus();
    else f[(at + 1) % f.length].focus();
  }

  /* ---------- siklus hidup ---------- */
  function init() {
    if (state.ready) return;
    els = {
      main: $('moonMain'), btn: $('moonBtn'),
      wrap: $('mPanelWrap'), panel: $('mPanel'), close: $('mpClose'), text: $('mpText'), another: $('mpAnother')
    };
    for (var k in els) if (!els[k]) { console.warn('[Moon] elemen tidak ditemukan:', k); return; }
    state.ready = true;
    els.btn.addEventListener('click', function () { openMoon(els.btn); });
    els.close.addEventListener('click', function () { close(); });
    els.another.addEventListener('click', another);
    els.wrap.addEventListener('keydown', onWrapKey);
    els.wrap.addEventListener('click', function (e) { if (e.target === els.wrap) close(); });   // klik pada latar (di luar kartu)
  }

  function enter() { if (state.ready) state.active = true; }

  function leave() {
    if (!state.ready) return;
    state.active = false;
    close({ silent: true });
    els.btn.classList.remove('is-lit');
  }
})();
