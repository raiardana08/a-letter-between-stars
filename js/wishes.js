/* ==========================================================================
   wishes.js — satu-satunya tempat wish disimpan dan dibaca
   --------------------------------------------------------------------------
   Dipakai bersama oleh Make a Wish (menulis) dan, di fase berikutnya,
   Constellation of Wishes serta Wish in a Bottle (membaca).

   Data: array di localStorage, key "letter.wishes.v1"
     [{ "id": "unik", "text": "isi wish", "createdAt": "2026-11-08T03:12:45.000Z" }]

   Catatan penting:
   - Data hanya ada di browser & perangkat yang sama. Tidak ada sinkronisasi online.
   - Menambah wish selalu membaca data terbaru lalu menambahkan satu item;
     koleksi tidak pernah ditimpa dengan salinan lama.
   - Data rusak tidak dihapus diam-diam: salinan mentahnya disimpan di
     "letter.wishes.v1.corrupt" sebelum koleksi dimulai ulang.
   - Jika localStorage diblokir/penuh, wish disimpan di memori selama halaman terbuka.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'letter.wishes.v1';
  var BACKUP_KEY = KEY + '.corrupt';
  var HARD_MAX = 500;            // batas keras panjang teks yang boleh tersimpan
  var memory = [];               // cadangan saat penyimpanan tidak tersedia
  var lastPersistent = true;

  /* ---------- util ---------- */
  function store() {
    try { return window.localStorage || null; } catch (e) { return null; }
  }

  function newId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (e) { /* lanjut ke cadangan */ }
    return 'w-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function normalize(text) {
    return String(text == null ? '' : text)
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, HARD_MAX);
  }

  function isValid(w) {
    return !!w && typeof w === 'object' &&
      typeof w.id === 'string' && w.id.length > 0 && w.id.length <= 80 &&
      typeof w.text === 'string' && w.text.trim().length > 0 && w.text.length <= HARD_MAX &&
      typeof w.createdAt === 'string' && !isNaN(Date.parse(w.createdAt));
  }

  /* Membaca & memvalidasi data mentah. Tidak pernah melempar error. */
  function parse(raw) {
    if (raw == null || raw === '') return { list: [], bad: false, dropped: false };
    var data;
    try { data = JSON.parse(raw); } catch (e) { return { list: [], bad: true, dropped: false, raw: raw }; }
    if (!Array.isArray(data)) return { list: [], bad: true, dropped: false, raw: raw };

    var seen = {}, list = [], dropped = false;
    for (var i = 0; i < data.length; i++) {
      var w = data[i];
      if (!isValid(w) || seen[w.id]) { dropped = true; continue; }
      seen[w.id] = true;
      list.push({ id: w.id, text: w.text, createdAt: w.createdAt });
    }
    return { list: list, bad: false, dropped: dropped, raw: raw };
  }

  function readStored() {
    var s = store();
    if (!s) return { list: [], bad: false, dropped: false, available: false };
    var raw = null;
    try { raw = s.getItem(KEY); } catch (e) { return { list: [], bad: false, dropped: false, available: false }; }
    var p = parse(raw);
    p.available = true;
    return p;
  }

  function backupRaw(raw) {
    var s = store();
    if (!s || raw == null) return;
    try { s.setItem(BACKUP_KEY, raw); } catch (e) { /* abaikan */ }
  }

  function byDate(a, b) { return Date.parse(a.createdAt) - Date.parse(b.createdAt); }

  function emit(type, wish) {
    try {
      window.dispatchEvent(new CustomEvent('wishes:changed', { detail: { type: type, wish: wish || null, count: all().length } }));
    } catch (e) { /* browser lama tanpa CustomEvent */ }
  }

  /* ---------- API ---------- */

  /* Semua wish valid (urut dari yang tertua), digabung dengan cadangan memori. */
  function all() {
    var stored = readStored().list;
    if (!memory.length) return stored.sort(byDate);
    var ids = {};
    stored.forEach(function (w) { ids[w.id] = true; });
    memory.forEach(function (w) { if (!ids[w.id]) stored.push(w); });
    return stored.sort(byDate);
  }

  function count() { return all().length; }

  /* Menambah satu wish. Mengembalikan { ok, wish?, persistent?, reason? }. */
  function add(text) {
    var clean = normalize(text);
    if (!clean) return { ok: false, reason: 'empty' };

    var wish = { id: newId(), text: clean, createdAt: new Date().toISOString() };
    var s = store();

    if (s) {
      try {
        var current = readStored();                       // selalu baca data terbaru
        if (current.bad || current.dropped) backupRaw(current.raw);
        var list = current.list.slice();
        list.push(wish);
        s.setItem(KEY, JSON.stringify(list));
        lastPersistent = true;
        emit('add', wish);
        return { ok: true, wish: wish, persistent: true };
      } catch (e) { /* diblokir atau penuh: pakai memori */ }
    }

    memory.push(wish);
    lastPersistent = false;
    emit('add', wish);
    return { ok: true, wish: wish, persistent: false };
  }

  /* Sinkronkan tampilan bila tab lain di browser yang sama mengubah data. */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === null) emit('sync', null);
  });

  window.Wishes = {
    key: KEY,
    maxLength: HARD_MAX,
    add: add,
    all: all,
    count: count,
    isPersistent: function () { return lastPersistent && !!store(); }
  };
})();
