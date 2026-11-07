/* ==========================================================================
   music.js — musik latar
   - Default: melodi ambient yang dibuat langsung oleh browser (WebAudio),
     jadi tidak butuh file audio apa pun.
   - Jika config.music.src diisi (mis. "assets/music.mp3"), file itu dipakai.
   - Tidak pernah berbunyi sebelum ada sentuhan/klik dari pengunjung.
   ========================================================================== */
(function () {
  'use strict';

  var cfg = {};
  var ctx = null, master = null, bus = null;
  var audio = null, useFile = false;
  var playing = false, resumeOnShow = false;
  var chordTimer = null, melodyTimer = null, suspendTimer = null;
  var chordStep = 0, melodyIdx = 2;

  // Cmaj7 -> Am7 -> Fmaj7 -> G6 (nomor MIDI)
  var CHORDS = [[48, 52, 55, 59], [45, 52, 55, 60], [41, 53, 57, 64], [43, 50, 55, 64]];
  var SCALE = [72, 74, 76, 79, 81, 84, 86]; // pentatonik C mayor

  var api = {
    onstate: null,
    userTouched: false,
    init: init, start: start, pause: pause, toggle: toggle,
    isPlaying: function () { return playing; }
  };
  window.Music = api;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function notify() { if (typeof api.onstate === 'function') api.onstate(playing); }
  function vol() { var v = Number(cfg.volume); return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5; }

  function init(musicCfg) {
    cfg = musicCfg || {};
    if (cfg.src) {
      try {
        audio = new Audio();
        audio.loop = true;
        audio.preload = 'none';
        audio.volume = vol();
        audio.src = cfg.src;
        audio.addEventListener('error', function () {
          // File tidak ditemukan -> kembali ke musik bawaan
          if (useFile) { var was = playing; useFile = false; playing = false; if (was) start(); }
        });
        useFile = true;
      } catch (e) { useFile = false; }
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (playing) { resumeOnShow = true; pause(true); }
      } else if (resumeOnShow) {
        resumeOnShow = false; start(true);
      }
    });
  }

  function impulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function ensureCtx() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);

      bus = ctx.createGain();
      var conv = ctx.createConvolver();
      conv.buffer = impulse(2.8, 2.4);
      var wet = ctx.createGain(); wet.gain.value = 0.55;
      bus.connect(master);
      bus.connect(conv); conv.connect(wet); wet.connect(master);
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function pad(notes, t0, dur) {
    notes.forEach(function (m) {
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      o1.type = 'triangle'; o2.type = 'sine';
      o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 1.004;
      f.type = 'lowpass'; f.frequency.value = 850;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 2.6);
      g.gain.setTargetAtTime(0.0001, t0 + dur - 0.4, 1.3);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(bus);
      o1.start(t0); o2.start(t0);
      o1.stop(t0 + dur + 7); o2.stop(t0 + dur + 7);
    });
  }

  function bell(m, t0) {
    var o = ctx.createOscillator(), h = ctx.createOscillator();
    var g = ctx.createGain(), gh = ctx.createGain();
    o.type = 'sine'; h.type = 'sine';
    o.frequency.value = hz(m); h.frequency.value = hz(m) * 2.01;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.06, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4);
    gh.gain.value = 0.2;
    o.connect(g); h.connect(gh); gh.connect(g); g.connect(bus);
    o.start(t0); h.start(t0);
    o.stop(t0 + 3.6); h.stop(t0 + 3.6);
  }

  function chordLoop() {
    if (!playing || !ctx) return;
    pad(CHORDS[chordStep % CHORDS.length], ctx.currentTime + 0.05, 8);
    chordStep++;
    chordTimer = setTimeout(chordLoop, 8000);
  }

  function melodyLoop() {
    if (!playing || !ctx) return;
    if (Math.random() < 0.72) {
      melodyIdx += Math.floor(Math.random() * 5) - 2;
      melodyIdx = Math.max(0, Math.min(SCALE.length - 1, melodyIdx));
      bell(SCALE[melodyIdx], ctx.currentTime + 0.05);
    }
    melodyTimer = setTimeout(melodyLoop, 1200 + Math.random() * 2400);
  }

  function clearTimers() {
    clearTimeout(chordTimer); clearTimeout(melodyTimer); clearTimeout(suspendTimer);
  }

  function start(silent) {
    if (!silent) api.userTouched = true;
    if (playing) return;

    if (useFile && audio) {
      var p = audio.play();
      playing = true; notify();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { useFile = false; playing = false; start(true); });
      }
      return;
    }

    if (!ensureCtx()) { notify(); return; }
    clearTimers();
    var go = function () {
      playing = true;
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(vol(), now, 0.9);
      chordLoop(); melodyLoop();
      notify();
    };
    if (ctx.state === 'suspended' && ctx.resume) {
      var r = ctx.resume();
      if (r && typeof r.then === 'function') r.then(go, go); else go();
    } else { go(); }
  }

  function pause(silent) {
    if (!silent) api.userTouched = true;
    if (!playing) return;
    playing = false;
    if (useFile && audio) { audio.pause(); notify(); return; }
    if (ctx && master) {
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.2);
      clearTimeout(chordTimer); clearTimeout(melodyTimer);
      suspendTimer = setTimeout(function () { if (!playing && ctx && ctx.suspend) ctx.suspend(); }, 1200);
    }
    notify();
  }

  function toggle() { if (playing) pause(); else start(); }
})();
