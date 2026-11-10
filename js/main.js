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

  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduceMotion = !!(rmq && rmq.matches);
  if (rmq) {
    var onRm = function (e) { reduceMotion = e.matches; };
    if (rmq.addEventListener) rmq.addEventListener('change', onRm); else if (rmq.addListener) rmq.addListener(onRm);
  }

  // Tiap chapter punya data-key di index.html. Tema dan blok config dicari lewat key,
  // jadi menyisipkan bagian baru tidak menggeser apa pun.
  var THEMES = { begin: 'dusk', things: 'paper', words: 'paper', sky: 'night', wish: 'wish', constellation: 'wish', bottle: 'wish', moon: 'wish', reveal: 'final', leave: 'wish' };
  var CFG_KEYS = { begin: 'chapter1', things: 'chapter2', words: 'chapter3', sky: 'chapter4', wish: 'chapterWish', constellation: 'chapterConst', bottle: 'chapterBottle', moon: 'chapterMoon', reveal: 'chapter5', leave: 'chapterLeave' };

  // Nilai bawaan untuk bagian opsional, supaya config.js lama tetap berjalan
  var WISH_DEFAULTS = {
    label: 'A quiet moment', title: 'Make a Wish',
    prompt: 'If you could wish for one thing tonight, what would it be?',
    placeholder: 'Write your wish here...', button: 'Send to the Stars',
    emptyError: 'Write a few words first. Even a small wish counts.',
    confirmation: 'Perhaps the universe has heard you.',
    localNote: "Your wish is kept on this device only. It isn't sent or synced anywhere.",
    noStorageNote: "This browser couldn't save your wish, so it will only last until you close this page.",
    another: 'Make another wish', next: 'Continue', skip: 'Not tonight', maxLength: 240
  };
  CFG.chapterWish = Object.assign({}, WISH_DEFAULTS, CFG.chapterWish || {});

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
  function keyOf(i) { return chapters[i] ? chapters[i].getAttribute('data-key') : ''; }
  function idxOf(key) {
    for (var i = 0; i < chapters.length; i++) if (keyOf(i) === key) return i;
    return -1;
  }
  function cfgOf(key) { return CFG[CFG_KEYS[key]] || {}; }
  function chap(i) { return cfgOf(keyOf(i)); }
  // Nomor tampilan: chapter asli 01-05, bagian sisipan memakai ✦
  function displayNum(i) {
    if (chapters[i] && chapters[i].hasAttribute('data-interlude')) return '\u2726';
    var n = 0;
    for (var k = 0; k <= i; k++) if (!chapters[k].hasAttribute('data-interlude')) n++;
    return pad2(n);
  }
  function announce(msg) {
    var a = $('#announcer');
    if (!a) return;
    a.textContent = '';
    setTimeout(function () { a.textContent = msg; }, 60);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- elemen ---------- */
  var chapters = $$('.chapter');
  var loader = $('#loader');
  var btnBack = $('#btnBack'), btnMenu = $('#btnMenu'), btnMusic = $('#btnMusic');
  var menu = $('#menu'), menuList = $('#menuList');
  var navNum = $('#navNum'), navTitle = $('#navTitle'), dotsEl = $('#dots');

  var current = -1, maxReached = 0, busy = false;
  var finalTimers = [], finalState = 'idle';
  var resetters = [];            // fungsi pengembali keadaan tiap chapter, dipakai oleh "Experience It Again"

  /* ---------- teks dari config ---------- */
  function bindText() {
    $$('[data-t]').forEach(function (n) {
      var v = get(CFG, n.getAttribute('data-t'));
      if (v == null) { console.warn('[Letter] Config tidak ditemukan:', n.getAttribute('data-t')); return; }
      n.textContent = tpl(v);
    });
    $$('[data-t-attr]').forEach(function (n) {
      var parts = n.getAttribute('data-t-attr').split(':');
      var v = get(CFG, parts[1]);
      if (v != null) n.setAttribute(parts[0], tpl(v));
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
    if (prevIndex >= 0 && keyOf(prevIndex) === 'reveal') resetFinal();
    if (prevIndex >= 0 && keyOf(prevIndex) === 'constellation' && window.Constellation) window.Constellation.leave();
    if (prevIndex >= 0 && keyOf(prevIndex) === 'bottle' && window.Bottle) window.Bottle.leave();
    if (prevIndex >= 0 && keyOf(prevIndex) === 'moon' && window.Moon) window.Moon.leave();

    nextEl.style.scrollBehavior = 'auto';
    nextEl.scrollTop = 0;
    nextEl.style.scrollBehavior = '';
    setInert(nextEl, false);
    setTheme(THEMES[keyOf(i)] || 'dusk');
    if (keyOf(i) === 'constellation' && window.Constellation) window.Constellation.enter();
    if (keyOf(i) === 'bottle' && window.Bottle) window.Bottle.enter();
    if (keyOf(i) === 'moon' && window.Moon) window.Moon.enter();
    nextEl.classList.add('is-active');
    updateNav();
    announce(chapterLabel(i));
    if (keyOf(i) === 'sky') setTimeout(updateBand, reduceMotion ? 120 : 2000);

    setTimeout(function () {
      busy = false;
      try { nextEl.focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
    }, reduceMotion ? 60 : 1000);
  }

  function chapterLabel(i) {
    var num = chapters[i].hasAttribute('data-interlude') ? '' : 'Chapter ' + displayNum(i) + ': ';
    return num + tpl(chap(i).title || '');
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
      b.appendChild(el('span', 'menu__num', displayNum(i)));
      b.appendChild(el('span', 'menu__name', ''));
      b.addEventListener('click', function () { goTo(i); });
      li.appendChild(b);
      menuList.appendChild(li);
    });
  }

  function updateNav() {
    navNum.textContent = displayNum(current);
    navTitle.textContent = tpl(chap(current).title || '');
    var navLabel = navTitle.parentNode;                      // umpan balik halus saat chapter berganti
    if (navLabel && navLabel.classList) { navLabel.classList.remove('is-swap'); void navLabel.offsetWidth; navLabel.classList.add('is-swap'); }
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
    setTimeout(function () {
      var b = $('.menu__item.is-current', menuList) || $('.menu__item:not(:disabled)', menuList);
      if (b && menu.classList.contains('is-open')) b.focus();
    }, 60);
  }
  function closeMenu(returnFocus) {
    var wasOpen = menu.classList.contains('is-open');
    menu.classList.remove('is-open');
    btnMenu.setAttribute('aria-expanded', 'false');
    if (wasOpen && returnFocus === true) btnMenu.focus();
  }
  function isTyping(t) {
    if (!t || !t.tagName) return false;
    var tag = t.tagName;
    return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || t.isContentEditable === true;
  }
  function menuItems() { return $$('.menu__item:not(:disabled)', menuList); }

  /* ---------- musik ---------- */
  function setupMusic() {
    if (!window.Music) { btnMusic.hidden = true; return; }
    window.Music.init(CFG.music || {});
    window.Music.onstate = function (on) {
      btnMusic.classList.toggle('is-playing', on);
      btnMusic.setAttribute('aria-pressed', on ? 'true' : 'false');
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
      var label0 = tpl(c.title), label1 = label0 + '. ' + tpl(c.message);
      card.setAttribute('aria-label', label0);
      card.setAttribute('aria-expanded', 'false');

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
      resetters.push(function () {
        counted = false; card.classList.remove('is-flipped');
        card.setAttribute('aria-expanded', 'false'); card.setAttribute('aria-label', label0);
      });
      card.addEventListener('click', function () {
        var on = card.classList.toggle('is-flipped');
        card.setAttribute('aria-expanded', on ? 'true' : 'false');
        card.setAttribute('aria-label', on ? label1 : label0);
        if (on && !counted) { counted = true; opened++; updateCaption(); }
      });
      wrap.appendChild(card);
    });
    resetters.push(function () { opened = 0; updateCaption(); $('#next2').classList.remove('is-ready'); });
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
    resetters.push(function () {
      lines.forEach(function (n) { n.classList.remove('seen'); if (io) io.observe(n); else n.classList.add('seen'); });
    });
  }

  /* ---------- chapter 04: bintang ---------- */
  function setupStars() {
    var c = cfgOf('sky'), wishes = c.wishes || [];
    var found = {}, count = 0;
    var text = $('#wishText'), countEl = $('#starCount'), totalEl = $('#starTotal'), counter = $('#starCounter');
    var starBtn = $('#starNext');
    if (starBtn) starBtn.textContent = tpl(c.revealNext || 'Reveal the next star');
    totalEl.textContent = wishes.length;
    var counterHTML = counter.innerHTML;                   // keadaan awal penghitung (ditimpa saat semua bintang ditemukan)
    text.textContent = tpl(c.idle || '');
    text.classList.add('is-idle');

    if (!window.Sky) return;
    window.Sky.setWishes(wishes.length);
    resetters.push(function () {
      found = {}; count = 0;
      counter.innerHTML = counterHTML; countEl = $('#starCount'); totalEl = $('#starTotal');
      text.classList.remove('swap'); text.textContent = tpl(c.idle || ''); text.classList.add('is-idle');
      $('#next4').classList.remove('is-ready');
      if (starBtn) starBtn.hidden = false;
      window.Sky.setWishes(wishes.length);                 // bintang harapan kembali belum ditemukan
      setTimeout(updateBand, 50);
    });
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
          if (starBtn) {                                   // semua bintang ditemukan: tombol keyboard tidak diperlukan lagi
            var had = document.activeElement === starBtn;
            starBtn.hidden = true;
            if (had) $('#next4').focus();
          }
        }
      }
    };
    if (starBtn) starBtn.addEventListener('click', function () {
      for (var i = 0; i < wishes.length; i++) if (!found[i]) { window.Sky.pick(i); break; }
    });
  }

  /* ---------- chapter 05: amplop & pengungkapan ---------- */
  function later(ms, fn) { finalTimers.push(setTimeout(fn, ms)); }

  function setupFinal() {
    var c = cfgOf('reveal');
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

    $('#btnLeave').addEventListener('click', function () { if (finalState === 'revealed') next(); });   // ke halaman penutup
    $('#btnReplay').addEventListener('click', function () { goTo(0); });
    $('#btnStars').addEventListener('click', function () { goTo(idxOf('sky')); });

    function showReveal() {
      finalState = 'revealed';
      reveal.classList.add('show');
      reveal.setAttribute('aria-hidden', 'false');
      setTheme('reveal');
      var c5 = chapters[idxOf('reveal')];
      if (c5) setInert(c5, true);                    // amplop di belakang overlay tidak boleh bisa difokus
      setTimeout(function () { try { reveal.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }, 80);
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
      if (keyOf(current) === 'reveal') return;
      $('#envelope').classList.remove('is-open', 'is-out');
      $('#envHint').classList.remove('is-hidden');
      finalState = 'idle';
    }, 900);
  }

  /* ---------- sisipan: Before You Leave (halaman penutup) ---------- */
  function setupLeave() {
    var t = $('#leaveText'), again = $('#btnAgain');
    if (!t || !again) return;
    var words = t.textContent.trim().split(/\s+/);          // pesan muncul kata demi kata; teks tetap utuh bagi pembaca layar
    t.textContent = '';
    words.forEach(function (w, i) {
      var sp = el('span', 'lw', w);
      sp.style.setProperty('--w', String(i));
      t.appendChild(sp);
      if (i < words.length - 1) t.appendChild(document.createTextNode(' '));
    });
    again.addEventListener('click', restart);
  }

  // "Experience It Again": kembali ke awal tanpa memuat ulang halaman. Kemajuan chapter dan tampilan tiap chapter dikembalikan;
  // wish yang tersimpan, localStorage, dan pemutar musik TIDAK disentuh.
  function restart() {
    if (busy) return;
    resetters.forEach(function (fn) { try { fn(); } catch (err) { console.error('[Letter] reset gagal:', err); } });
    finalTimers.forEach(clearTimeout); finalTimers = [];
    $('#envelope').classList.remove('is-open', 'is-out');
    $('#envHint').classList.remove('is-hidden');
    finalState = 'idle';
    maxReached = 0;
    goTo(0);
  }

  /* ---------- sisipan: Make a Wish ---------- */
  function setupWish() {
    var c = cfgOf('wish');
    var form = $('#wishForm'), input = $('#wishInput'), count = $('#wishCount'), err = $('#wishError');
    var btn = $('#btnSendWish'), done = $('#wishDone'), confirm = $('#wishConfirm'), note = $('#wishNote');
    var more = $('#btnWishMore'), skip = $('#btnWishSkip'), stage = $('.wish-stage');
    var max = Number(c.maxLength) > 0 ? Number(c.maxLength) : 240;
    var sending = false, finished = false, fallback = 0;
    input.maxLength = max;

    function updateCount() {
      count.textContent = input.value.length + ' / ' + max;
      count.classList.toggle('is-near', input.value.length >= max * 0.9);
    }
    function showError(msg) {
      err.textContent = msg;
      err.classList.remove('is-in'); void err.offsetWidth; err.classList.add('is-in');   // pesan validasi muncul dengan animasi ringan
      input.setAttribute('aria-invalid', 'true');
      stage.classList.remove('is-shake'); void stage.offsetWidth; stage.classList.add('is-shake');
    }
    function clearError() { err.textContent = ''; input.removeAttribute('aria-invalid'); }

    input.addEventListener('input', function () { updateCount(); if (err.textContent) clearError(); });
    input.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

    function submit() {
      if (sending) return;                                   // cegah kirim ganda
      var text = input.value.trim();
      if (!text) { showError(c.emptyError); input.focus(); return; }
      if (!window.Wishes) { showError('Something went wrong. Please refresh and try again.'); return; }

      sending = true; finished = false;
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      input.readOnly = true;
      clearError();

      var res = window.Wishes.add(text);
      if (!res.ok) {
        sending = false; btn.disabled = false; btn.removeAttribute('aria-busy'); input.readOnly = false;
        showError(c.emptyError); input.focus();
        return;
      }

      stage.classList.add('is-sending');
      var finish = function () {
        if (finished) return;
        finished = true; clearTimeout(fallback);
        showDone(res.persistent);
      };
      var r = btn.getBoundingClientRect();
      fallback = setTimeout(finish, 6000);                   // jaring pengaman bila animasi tertahan
      if (window.Sky && typeof window.Sky.launchWish === 'function' && window.Sky.launchWish({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, finish)) {
        /* animasi berjalan; finish dipanggil saat bintang tiba */
      } else {
        finish();
      }
    }

    function showDone(persistent) {
      form.hidden = true; skip.hidden = true;
      confirm.textContent = c.confirmation;
      note.textContent = persistent ? c.localNote : c.noStorageNote;
      done.hidden = false;
      stage.classList.remove('is-sending');
      stage.classList.add('is-done');
      try { confirm.focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
    }

    function resetForm() {                                  // dipakai "Another wish" dan "Experience It Again"; tidak menyentuh wish tersimpan
      clearTimeout(fallback); finished = false;
      input.value = ''; updateCount(); clearError();
      form.hidden = false; skip.hidden = false; done.hidden = true;
      stage.classList.remove('is-done', 'is-sending');
      sending = false; btn.disabled = false; btn.removeAttribute('aria-busy'); input.readOnly = false;
    }
    more.addEventListener('click', function () { resetForm(); input.focus(); });
    resetters.push(resetForm);

    updateCount();
  }

  /* Batas area bintang harapan (Chapter 4): di antara teks atas dan panel bawah */
  function updateBand() {
    if (!window.Sky || !window.Sky.setBand) return;
    var top = $('#ch4 .sky-top'), bottom = $('#ch4 .sky-bottom');
    if (!top || !bottom) return;
    var a = top.getBoundingClientRect(), b = bottom.getBoundingClientRect();
    var t = a.bottom + 22, btm = b.top - 22;
    if (btm - t < 80) { var mid = (t + btm) / 2; t = mid - 40; btm = mid + 40; }
    window.Sky.setBand(t, btm);
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
      var open = menu.classList.contains('is-open');
      if (e.key === 'Escape') {
        if (open) { e.preventDefault(); closeMenu(true); }
        else if (window.Constellation && window.Constellation.isOpen()) { e.preventDefault(); window.Constellation.close(); }
        else if (window.Bottle && window.Bottle.isOpen()) { e.preventDefault(); window.Bottle.close(); }
        else if (window.Moon && window.Moon.isOpen()) { e.preventDefault(); window.Moon.close(); }
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      // Di dalam menu: panah atas/bawah memilih chapter
      if (open && menu.contains(document.activeElement)) {
        var items = menuItems(), at = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(at + 1) % items.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
        return;
      }

      // Panah kiri/kanan berpindah chapter, kecuali saat mengetik (mis. kolom wish) atau panel wish terbuka
      if (isTyping(e.target)) return;
      if (window.Constellation && window.Constellation.isOpen()) return;
      if (window.Bottle && window.Bottle.isOpen()) return;
      if (window.Moon && window.Moon.isOpen()) return;
      if (e.key === 'ArrowLeft') goTo(current - 1);
      else if (e.key === 'ArrowRight' && current + 1 <= maxReached) goTo(current + 1);
    });
    menu.addEventListener('focusout', function (e) {
      if (menu.classList.contains('is-open') && e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== btnMenu) closeMenu();
    });

    $$('.js-next').forEach(function (b) { b.addEventListener('click', next); });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { var i = idxOf(b.getAttribute('data-goto')); if (i >= 0) goTo(i); });
    });

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
      setupWish();
      if (window.Constellation) window.Constellation.init();
      if (window.Bottle) window.Bottle.init();
      if (window.Moon) window.Moon.init();
      setupFinal();
      setupLeave();
      checkConfig();
      var bandTimer = 0;
      var refreshBand = function () { clearTimeout(bandTimer); bandTimer = setTimeout(updateBand, 200); };
      window.addEventListener('resize', refreshBand);
      window.addEventListener('orientationchange', refreshBand);
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
