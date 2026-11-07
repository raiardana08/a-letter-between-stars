/* ==========================================================================
   sky.js — satu canvas untuk seluruh situs
   - Latar: bintang berkelip, partikel melayang, bintang jatuh sesekali
   - Chapter 04: "bintang harapan" yang bergerak pelan dan bisa disentuh
   Hemat performa: DPR dibatasi, jumlah partikel menyesuaikan perangkat,
   animasi berhenti saat tab disembunyikan.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('sky');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
               (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  var TAU = Math.PI * 2;

  // Pengaturan per tema
  var MODES = {
    dusk:   { stars: 0.9,  dust: 0.55, tone: 0, interactive: false, shoot: true  },
    paper:  { stars: 0,    dust: 1,    tone: 1, interactive: false, shoot: false },
    night:  { stars: 1,    dust: 0.35, tone: 0, interactive: true,  shoot: true  },
    final:  { stars: 0.65, dust: 0.7,  tone: 0, interactive: false, shoot: false },
    reveal: { stars: 0,    dust: 0,    tone: 1, interactive: false, shoot: false }
  };

  var W = 0, H = 0, DPR = 1;
  var mode = 'dusk';
  var cur = { stars: 0, dust: 0, wish: 0, tone: 0 };
  var bgStars = [], dust = [], wishes = [], sparks = [], rings = [];
  var shoot = null, shootTimer = 6;
  var raf = 0, last = 0, running = false;

  var api = {
    onPick: null,
    init: init,
    setMode: setMode,
    setWishes: setWishes,
    markFound: markFound
  };
  window.Sky = api;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- ukuran & objek latar ---------- */
  function resize() {
    W = window.innerWidth || document.documentElement.clientWidth;
    H = window.innerHeight || document.documentElement.clientHeight;
    DPR = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildBackground();
    clampWishes();
  }

  function buildBackground() {
    var n = Math.round((W * H) / (lowEnd ? 9500 : 6500));
    n = Math.max(36, Math.min(lowEnd ? 70 : 120, n));
    bgStars = [];
    for (var i = 0; i < n; i++) {
      bgStars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(0.4, 1.3), tw: rand(0.6, 2.2), ph: rand(0, TAU),
        a: rand(0.35, 0.95), glint: Math.random() < 0.09
      });
    }
    var d = lowEnd ? 14 : 24;
    dust = [];
    for (var j = 0; j < d; j++) {
      dust.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(1, 3.2), vy: rand(4, 13), sway: rand(6, 20), ph: rand(0, TAU),
        sp: rand(0.2, 0.6), a: rand(0.18, 0.45)
      });
    }
  }

  /* ---------- bintang harapan (chapter 04) ---------- */
  function bandTop() { return Math.max(150, H * 0.22); }
  function bandBottom() { return H - Math.max(210, H * 0.3); }

  function setWishes(count) {
    wishes = [];
    var top = bandTop(), bottom = Math.max(top + 40, bandBottom());
    var order = [];
    for (var i = 0; i < count; i++) order.push(i);
    for (var k = order.length - 1; k > 0; k--) {          // acak urutan kolom
      var r = Math.floor(Math.random() * (k + 1)), t = order[k]; order[k] = order[r]; order[r] = t;
    }
    for (var n = 0; n < count; n++) {
      wishes.push({
        i: n,
        x: ((order[n] + 0.5) / count) * W + rand(-12, 12),
        y: rand(top, bottom),
        vx: (Math.random() < 0.5 ? -1 : 1) * rand(4, 10),
        vy: (Math.random() < 0.5 ? -1 : 1) * rand(2, 5),
        size: rand(5.5, 7.5), ph: rand(0, TAU), rot: rand(0, 1),
        lit: 0, found: false, flash: 0
      });
    }
  }

  function clampWishes() {
    var top = bandTop(), bottom = Math.max(top + 40, bandBottom());
    for (var i = 0; i < wishes.length; i++) {
      var w = wishes[i];
      if (w.y < top) w.y = top;
      if (w.y > bottom) w.y = bottom;
      if (w.x > W + 30) w.x = rand(0, W);
    }
  }

  function markFound(i) {
    for (var k = 0; k < wishes.length; k++) {
      if (wishes[k].i === i) { wishes[k].found = true; wishes[k].flash = 1; }
    }
  }

  /* ---------- mode / tema ---------- */
  function setMode(name) {
    if (!MODES[name]) name = 'dusk';
    mode = name;
    canvas.style.pointerEvents = MODES[name].interactive ? 'auto' : 'none';
  }

  /* ---------- interaksi ---------- */
  function onPointer(e) {
    if (!MODES[mode].interactive) return;
    var x = e.clientX, y = e.clientY;
    var hitR = 38, best = null, bestD = hitR * hitR;
    for (var i = 0; i < wishes.length; i++) {
      var dx = wishes[i].x - x, dy = wishes[i].y - y, d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = wishes[i]; }
    }
    if (best) {
      best.flash = 1;
      burst(best.x, best.y, 14);
      rings.push({ x: best.x, y: best.y, r: 6, life: 0, max: 1.1, big: true });
      if (typeof api.onPick === 'function') api.onPick(best.i);
    } else {
      burst(x, y, 4);
      rings.push({ x: x, y: y, r: 4, life: 0, max: 0.8, big: false });
    }
  }

  function burst(x, y, n) {
    for (var i = 0; i < n && sparks.length < 70; i++) {
      var a = rand(0, TAU), s = rand(30, 110);
      sparks.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.6, 1.2), r: rand(0.8, 2) });
    }
  }

  /* ---------- update ---------- */
  function ease(v, target, dt, speed) { return v + (target - v) * (1 - Math.exp(-dt * speed)); }

  function update(dt, t) {
    var m = MODES[mode];
    cur.stars = ease(cur.stars, m.stars, dt, 2.2);
    cur.dust  = ease(cur.dust,  m.dust,  dt, 2.2);
    cur.tone  = ease(cur.tone,  m.tone,  dt, 2.5);
    cur.wish  = ease(cur.wish,  m.interactive ? 1 : 0, dt, 2.4);

    var sp = reduce ? 0.25 : 1, i;

    for (i = 0; i < dust.length; i++) {
      var p = dust[i];
      p.y -= p.vy * dt * sp;
      p.x += Math.sin(t * p.sp + p.ph) * p.sway * dt * sp;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
    }

    if (cur.wish > 0.02) {
      var top = bandTop(), bottom = Math.max(top + 40, bandBottom());
      for (i = 0; i < wishes.length; i++) {
        var w = wishes[i];
        w.x += w.vx * dt * sp; w.y += w.vy * dt * sp;
        if (w.x < -30) w.x = W + 30; else if (w.x > W + 30) w.x = -30;
        if (w.y < top) { w.y = top; w.vy = Math.abs(w.vy); }
        else if (w.y > bottom) { w.y = bottom; w.vy = -Math.abs(w.vy); }
        w.lit = ease(w.lit, w.found ? 1 : 0, dt, 2);
        w.flash = Math.max(0, w.flash - dt * 1.1);
      }
    }

    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.life += dt;
      if (s.life >= s.max) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96;
    }
    for (i = rings.length - 1; i >= 0; i--) {
      var rg = rings[i];
      rg.life += dt;
      if (rg.life >= rg.max) { rings.splice(i, 1); }
    }

    // bintang jatuh
    if (m.shoot && !reduce) {
      shootTimer -= dt;
      if (shootTimer <= 0 && !shoot) {
        shoot = { x: rand(W * 0.3, W * 1.0), y: rand(0, H * 0.35), vx: -rand(420, 620), vy: rand(160, 260), life: 0, max: rand(0.7, 1.1) };
        shootTimer = rand(8, 15);
      }
    }
    if (shoot) {
      shoot.life += dt; shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt;
      if (shoot.life >= shoot.max) shoot = null;
    }
  }

  /* ---------- gambar ---------- */
  function sparkle(x, y, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4 + rot, rad = (i % 2 === 0) ? r : r * 0.28;
      var px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  function dustColor(a) {
    // warm (ivory/blush) di tema gelap -> rose di tema terang
    var k = cur.tone;
    var r = Math.round(240 + (201 - 240) * k), g = Math.round(214 + (143 - 214) * k), b = Math.round(206 + (145 - 206) * k);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function drawWish(w, t) {
    var A = cur.wish;
    if (A < 0.01) return;
    var pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + w.ph);
    var glowR = w.size * (4.4 + pulse * 1.3 + w.lit * 2.2 + w.flash * 4);
    var a = A * (0.72 + 0.28 * pulse);
    var core = Math.min(1, 0.5 * a + 0.3 * w.lit * A + 0.45 * w.flash);
    var g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, glowR);
    g.addColorStop(0, 'rgba(255,238,228,' + core.toFixed(3) + ')');
    g.addColorStop(0.35, 'rgba(233,203,195,' + (0.2 * a + 0.16 * w.lit * A).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(201,143,145,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(w.x, w.y, glowR, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,242,' + Math.min(1, a + 0.2).toFixed(3) + ')';
    sparkle(w.x, w.y, w.size * (1 + 0.28 * w.lit + 0.5 * w.flash), w.rot);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var i;

    // partikel melayang
    if (cur.dust > 0.02) {
      for (i = 0; i < dust.length; i++) {
        var p = dust[i];
        ctx.fillStyle = dustColor(p.a * cur.dust * 0.45);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.6, 0, TAU); ctx.fill();
        ctx.fillStyle = dustColor(p.a * cur.dust);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
    }

    // bintang latar
    if (cur.stars > 0.02) {
      for (i = 0; i < bgStars.length; i++) {
        var s = bgStars[i];
        var tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
        var al = s.a * tw * cur.stars;
        ctx.fillStyle = 'rgba(248,240,235,' + al.toFixed(3) + ')';
        if (s.glint) {
          sparkle(s.x, s.y, s.r * 3.2, 0);
        } else {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        }
      }
    }

    // bintang harapan
    if (cur.wish > 0.01) {
      for (i = 0; i < wishes.length; i++) drawWish(wishes[i], t);
    }

    // ring
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i], k = rg.life / rg.max;
      ctx.strokeStyle = 'rgba(248,226,218,' + ((1 - k) * (rg.big ? 0.8 : 0.4)).toFixed(3) + ')';
      ctx.lineWidth = rg.big ? 1.6 : 1;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r + k * (rg.big ? 64 : 26), 0, TAU); ctx.stroke();
    }

    // percikan
    for (i = 0; i < sparks.length; i++) {
      var sp = sparks[i], f = 1 - sp.life / sp.max;
      ctx.fillStyle = 'rgba(255,236,226,' + (f * 0.9).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * (0.6 + f), 0, TAU); ctx.fill();
    }

    // bintang jatuh
    if (shoot) {
      var f2 = 1 - shoot.life / shoot.max, len = 0.11;
      var tx = shoot.x - shoot.vx * len, ty = shoot.y - shoot.vy * len;
      var lg = ctx.createLinearGradient(tx, ty, shoot.x, shoot.y);
      lg.addColorStop(0, 'rgba(248,240,235,0)');
      lg.addColorStop(1, 'rgba(248,240,235,' + (0.85 * f2).toFixed(3) + ')');
      ctx.strokeStyle = lg; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(shoot.x, shoot.y); ctx.stroke();
    }
  }

  /* ---------- loop ---------- */
  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min(Math.max((ts - last) / 1000, 0), 0.05);
    last = ts;
    var t = ts / 1000;
    update(dt, t);
    draw(t);
  }

  function startLoop() {
    if (running) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  function init() {
    resize();
    var timer = 0;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(resize, 150); });
    window.addEventListener('orientationchange', function () { clearTimeout(timer); timer = setTimeout(resize, 300); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); else startLoop(); });
    canvas.addEventListener('pointerdown', onPointer);
    setMode('dusk');
    startLoop();
  }
})();
