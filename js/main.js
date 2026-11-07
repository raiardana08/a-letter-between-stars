/* ==========================================================================
   main.js — alur chapter, navigasi, kartu, surat, bintang, amplop
   Semua teks dibaca dari config.js (window.LETTER_CONFIG).
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.LETTER_CONFIG;
  if (!CFG) {
    console.error('[Letter] config.js tidak ditemukan atau gagal dimuat.');
    var ld = document.getElementById('loader');
    if (ld) ld.hidden = true;
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THEMES = ['dusk', 'paper', 'paper', 'night', 'final'];

  /* ---------- util ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function tpl(str) {
    var map = {
      recipient: CFG.recipientName, sender: CFG.senderName, date: CFG.specialDate,
      message: CFG.personalMessage, memory: CFG.memory
    };
    return String(str).replace(/\{(recipient|sender|date|message|memory)\}/g, function (m, k) {
      return map[k] != null ? map[k] : m;
    });
  }
  function chap(i) { return CFG['chapter' + (i + 1)] || {}; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- elemen ---------- */
  var chapters = $$('.chapter');
  var loader = $('#loader');
  var btnBack = $('#btnBack'), btnMenu = $('#btnMenu'), btnMusic = $('#btnMusic');
  var menu = $('#menu'), menuList = $('#menuList');
  var navNum = $('#navNum'), navTitle = $('#navTitle'), dotsEl = $('#dots');

  var current = -1, maxReached = 0, busy = false;
  var finalTimers = [], finalState = 'idle';

  /* ---------- teks dari config ---------- */
  function bindText() {
    $$('[data-t]').forEach(function (n) {
      var v = get(CFG, n.getAttribute('data-t'));
      if (v == null) { console.warn('[Letter] Config tidak ditemukan:', n.getAttribute('data-t')); return; }
      n.textContent = tpl(v);
    });
    document.title = tpl(CFG.siteTitle || document.title);
  }

  function splitWords(node) {
    var words = node.textContent.trim().split(/\s+/);
    node.textContent = '';
    node.setAttribute('aria-label', words.join(' '));
    words.forEach(function (w, i) {
      var s = el('span', 'word', w);
      s.style.setProperty('--wd', (i * 150) + 'ms');
      s.setAttribute('aria-hidden', 'true');
      node.appendChild(s);
      node.appendChild(document.createTextNode(' '));
    });
  }

  function checkConfig() {
    var left = [];
    JSON.stringify(CFG).replace(/\[(NAMA_PENERIMA|NAMA_PENGIRIM|PESAN_PERSONAL|KENANGAN|TANGGAL_SPESIAL)\]/g, function (m) {
      if (left.indexOf(m) < 0) left.push(m);
      return m;
    });
    if (left.length) console.info('[Letter] Placeholder yang belum diganti di config.js: ' + left.join(', '));
  }

  /* ---------- navigasi ---------- */
  function setTheme(t) {
    document.body.setAttribute('data-theme', t);
    if (window.Sky) window.Sky.setMode(t);
  }
  function setInert(node, on) {
    if (on) { node.setAttribute('inert', ''); node.setAttribute('aria-hidden', 'true'); }
    else { node.removeAttribute('inert'); node.removeAttribute('aria-hidden'); }
  }

  function goTo(i) {
    if (busy || i === current || i < 0 || i >= chapters.length || i > maxReached) return;
    busy = true;
    closeMenu();

    var prevIndex = current;
    var prev = chapters[current], nextEl = chapters[i];
    current = i;

    if (prev) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(function () { prev.classList.remove('is-leaving'); }, 950);
      setInert(prev, true);
    }
    if (prevIndex === 4) resetFinal();

    nextEl.style.scrollBehavior = 'auto';
    nextEl.scrollTop = 0;
    nextEl.style.scrollBehavior = '';
    setInert(nextEl, false);
    setTheme(THEMES[i]);
    nextEl.classList.add('is-active');
    updateNav();

    setTimeout(function () {
      busy = false;
      try { nextEl.focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
    }, reduceMotion ? 60 : 1000);
  }

  function next() {
    var n = current + 1;
    if (n >= chapters.length) return;
    maxReached = Math.max(maxReached, n);
    goTo(n);
  }

  function buildNav() {
    chapters.forEach(function (c, i) {
      dotsEl.appendChild(el('i'));
      var li = el('li');
      var b = el('button', 'menu__item');
      b.type = 'button';
      b.setAttribute('data-i', i);
      b.appendChild(el('span', 'menu__num', pad2(i + 1)));
      b.appendChild(el('span', 'menu__name', ''));
      b.addEventListener('click', function () { goTo(i); });
      li.appendChild(b);
      menuList.appendChild(li);
    });
  }

  function updateNav() {
    navNum.textContent = pad2(current + 1);
    navTitle.textContent = tpl(chap(current).title || '');
    $$('i', dotsEl).forEach(function (d, i) {
      d.className = i < current ? 'is-done' : (i === current ? 'is-current' : '');
    });
    $$('.menu__item', menuList).forEach(function (b, i) {
      var locked = i > maxReached;
      b.disabled = locked;
      b.classList.toggle('is-current', i === current);
      b.querySelector('.menu__name').textContent = locked ? '· · ·' : tpl(chap(i).title || '');
      if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    btnBack.disabled = current <= 0;
  }

  function openMenu() {
    menu.classList.add('is-open');
    btnMenu.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    btnMenu.setAttribute('aria-expanded', 'false');
  }

  /* ---------- musik ---------- */
  function setupMusic() {
    if (!window.Music) { btnMusic.hidden = true; return; }
    window.Music.init(CFG.music || {});
    window.Music.onstate = function (on) {
      btnMusic.classList.toggle('is-playing', on);
      btnMusic.setAttribute('aria-pressed', on ? 'true' : 'false');
      btnMusic.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
    };
    btnMusic.addEventListener('click', function () { window.Music.toggle(); });
  }

  /* ---------- chapter 02: kartu ---------- */
  function buildCards() {
    var list = (chap(1).cards || []);
    var wrap = $('#cards'), caption = $('#cardsCaption');
    var opened = 0;

    function updateCaption() {
      if (opened >= list.length && list.length) {
        caption.textContent = tpl(chap(1).captionDone || '');
        $('#next2').classList.add('is-ready');
      } else {
        caption.textContent = tpl(String(chap(1).captionIdle || '')
          .replace('{opened}', opened).replace('{total}', list.length));
      }
    }

    list.forEach(function (c, i) {
      var card = el('button', 'card');
      card.type = 'button';
      card.setAttribute('aria-pressed', 'false');

      var inner = el('span', 'card__inner');
      var front = el('span', 'card__face card__front');
      front.appendChild(el('span', 'card__num', pad2(i + 1)));
      front.appendChild(el('span', 'card__title', tpl(c.title)));
      front.appendChild(el('span', 'card__tap', 'touch to open'));
      var back = el('span', 'card__face card__back');
      back.appendChild(el('span', 'card__msg', tpl(c.message)));
      inner.appendChild(front); inner.appendChild(back);
      card.appendChild(inner);

      var counted = false;
      card.addEventListener('click', function () {
        var on = card.classList.toggle('is-flipped');
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on && !counted) { counted = true; opened++; updateCaption(); }
      });
      wrap.appendChild(card);
    });
    updateCaption();
  }

  /* ---------- chapter 03: surat ---------- */
  function buildLetter() {
    var c = chap(2);
    var lines = [];

    var date = $('#letterDate'); date.textContent = tpl(c.dateLine || '');
    var greet = $('#letterGreet'); greet.textContent = tpl(c.greeting || ''); lines.push(greet);

    var body = $('#letterBody');
    (c.paragraphs || []).forEach(function (p) {
      var para = el('p', null, tpl(p));
      body.appendChild(para); lines.push(para);
    });

    var closing = $('#letterClosing'); closing.textContent = tpl(c.closing || ''); lines.push(closing);
    var sign = $('#letterSign'); sign.textContent = tpl(c.signature || ''); lines.push(sign);
    $('#letterNote').textContent = tpl(c.note || '');

    lines.forEach(function (n) { n.classList.add('line'); });

    var root = $('#ch3');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
        });
      }, { root: root, threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
      lines.forEach(function (n) { io.observe(n); });
    } else {
      lines.forEach(function (n) { n.classList.add('seen'); });
    }
  }

  /* ---------- chapter 04: bintang ---------- */
  function setupStars() {
    var c = chap(3), wishes = c.wishes || [];
    var found = {}, count = 0;
    var text = $('#wishText'), countEl = $('#starCount'), totalEl = $('#starTotal'), counter = $('#starCounter');
    totalEl.textContent = wishes.length;
    text.textContent = tpl(c.idle || '');
    text.classList.add('is-idle');

    if (!window.Sky) return;
    window.Sky.setWishes(wishes.length);
    window.Sky.onPick = function (i) {
      text.classList.remove('swap');
      void text.offsetWidth; // memulai ulang animasi
      text.textContent = tpl(wishes[i] || '');
      text.classList.remove('is-idle');
      text.classList.add('swap');
      if (!found[i]) {
        found[i] = true; count++;
        window.Sky.markFound(i);
        countEl.textContent = count;
        if (count >= wishes.length) {
          counter.textContent = tpl(c.complete || '');
          $('#next4').classList.add('is-ready');
        }
      }
    };
  }

  /* ---------- chapter 05: amplop & pengungkapan ---------- */
  function later(ms, fn) { finalTimers.push(setTimeout(fn, ms)); }

  function setupFinal() {
    var c = chap(4);
    var env = $('#envelope'), hint = $('#envHint'), reveal = $('#reveal');

    $('#envTo').textContent = tpl(c.envelopeFor || '');
    $('#senderName').textContent = tpl(CFG.senderName || '');
    $('#rvDate').textContent = tpl(c.footer || '');

    var closing = $('#rvClosing');
    var paras = Array.isArray(c.closing) ? c.closing : [c.closing || ''];
    paras.forEach(function (p) { closing.appendChild(el('p', null, tpl(p))); });

    // partikel lembut di layar pengungkapan
    var dust = $('#revealDust');
    for (var i = 0; i < 14; i++) {
      var d = el('i');
      d.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      d.style.setProperty('--s', (3 + Math.random() * 5).toFixed(1) + 'px');
      d.style.setProperty('--t', (9 + Math.random() * 9).toFixed(1) + 's');
      d.style.setProperty('--dl', (-Math.random() * 12).toFixed(1) + 's');
      d.style.setProperty('--dx', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
      dust.appendChild(d);
    }

    env.addEventListener('click', function () {
      if (finalState !== 'idle') return;
      finalState = 'opening';
      env.classList.add('is-open');
      hint.classList.add('is-hidden');
      later(reduceMotion ? 50 : 1000, function () { env.classList.add('is-out'); });
      later(reduceMotion ? 120 : 2500, showReveal);
    });

    $('#btnReplay').addEventListener('click', function () { goTo(0); });
    $('#btnStars').addEventListener('click', function () { goTo(3); });

    function showReveal() {
      finalState = 'revealed';
      reveal.classList.add('show');
      reveal.setAttribute('aria-hidden', 'false');
      setTheme('reveal');
    }
  }

  function resetFinal() {
    finalTimers.forEach(clearTimeout);
    finalTimers = [];
    var reveal = $('#reveal');
    reveal.classList.remove('show');
    reveal.setAttribute('aria-hidden', 'true');
    // kembalikan amplop setelah layar pengungkapan memudar
    setTimeout(function () {
      if (current === 4) return;
      $('#envelope').classList.remove('is-open', 'is-out');
      $('#envHint').classList.remove('is-hidden');
      finalState = 'idle';
    }, 900);
  }

  /* ---------- tombol & keyboard ---------- */
  function bindControls() {
    btnBack.addEventListener('click', function () { goTo(current - 1); });
    btnMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.classList.contains('is-open')) closeMenu(); else openMenu();
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && !btnMenu.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
      else if (e.key === 'ArrowLeft') goTo(current - 1);
      else if (e.key === 'ArrowRight' && current + 1 <= maxReached) goTo(current + 1);
    });

    $$('.js-next').forEach(function (b) { b.addEventListener('click', next); });

    $('#btnBegin').addEventListener('click', function () {
      var m = CFG.music || {};
      if (window.Music && m.autoStartOnFirstJourney !== false && !window.Music.userTouched) window.Music.start();
      next();
    });
  }

  /* ---------- mulai ---------- */
  function boot() {
    try {
      bindText();
      splitWords($('#headline'));
      var forLine = $('#forLine');
      if (CFG.showRecipientOnIntro === false) forLine.textContent = '';
      buildNav();
      bindControls();
      setupMusic();
      if (window.Sky) window.Sky.init();
      buildCards();
      buildLetter();
      setupStars();
      setupFinal();
      checkConfig();
      chapters.forEach(function (c) { setInert(c, true); });
    } catch (err) {
      console.error('[Letter] Gagal menyiapkan halaman:', err);
    }

    var minWait = new Promise(function (r) { setTimeout(r, reduceMotion ? 200 : 1500); });
    var fonts = (document.fonts && document.fonts.ready)
      ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 2500); })])
      : Promise.resolve();
    Promise.all([minWait, fonts]).then(start, start);
  }

  function start() {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(function () { loader.hidden = true; }, 1000);
    goTo(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
