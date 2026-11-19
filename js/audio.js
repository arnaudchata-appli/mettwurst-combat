'use strict';
// ---------------------------------------------------------------------------
// Sons 100 % synthétisés (WebAudio) : aucun fichier audio, fonctionne hors ligne
// ---------------------------------------------------------------------------
const Sound = (() => {
  let ctx = null, sfxBus, musicBus, noiseBuf;
  let musicTimer = null, playing = null, wanted = null, step = 0, nextTime = 0;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
    if (wanted) startMusic(wanted);
  }

  function apply() {
    if (!ctx) return;
    sfxBus.gain.value = Settings.data.sfx ? 0.9 : 0;
    musicBus.gain.value = Settings.data.music ? 0.3 : 0;
  }

  const now = () => ctx.currentTime;

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, dur, o = {}, bus = sfxBus, t = now()) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    env(g, t, o.attack || 0.004, o.gain || 0.2, dur);
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.filter;
      osc.connect(f); f.connect(g);
    } else osc.connect(g);
    g.connect(bus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(dur, o = {}, bus = sfxBus, t = now()) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g, t, o.attack || 0.002, o.gain || 0.3, dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const SFX = {
    punch() { noise(0.12, { freq: 900, to: 300, gain: 0.5, q: 0.8 }); tone(150, 0.12, { type: 'sine', to: 50, gain: 0.5 }); },
    kick() { noise(0.16, { freq: 700, to: 200, gain: 0.6, q: 0.8 }); tone(110, 0.18, { type: 'sine', to: 40, gain: 0.6 }); },
    heavy() {
      noise(0.3, { freq: 500, to: 100, gain: 0.7 });
      tone(90, 0.35, { type: 'sine', to: 30, gain: 0.8 });
      noise(0.4, { filter: 'highpass', freq: 3000, gain: 0.12 });
    },
    block() { tone(900, 0.06, { type: 'square', to: 500, gain: 0.1 }); noise(0.08, { filter: 'highpass', freq: 2500, gain: 0.2 }); },
    whoosh() { noise(0.14, { freq: 600, to: 2400, gain: 0.1, q: 2, attack: 0.03 }); },
    jump() { tone(220, 0.12, { type: 'triangle', to: 440, gain: 0.1 }); },
    land() { tone(80, 0.08, { type: 'sine', to: 50, gain: 0.2 }); },
    sizzle() { noise(0.7, { filter: 'highpass', freq: 4500, gain: 0.12, attack: 0.04 }); },
    fire() {
      noise(0.55, { freq: 300, to: 1500, gain: 0.4, q: 0.6, attack: 0.03 });
      noise(0.6, { filter: 'highpass', freq: 3500, gain: 0.1 });
    },
    throw() { tone(300, 0.2, { type: 'sawtooth', to: 900, gain: 0.07, filter: 2000 }); noise(0.18, { freq: 1500, to: 3000, gain: 0.1, q: 3 }); },
    super() {
      tone(110, 0.8, { type: 'sawtooth', to: 440, gain: 0.16, attack: 0.05, filter: 2500 });
      noise(0.9, { freq: 200, to: 3000, gain: 0.3, attack: 0.1 });
    },
    ko() { tone(400, 0.9, { type: 'sawtooth', to: 60, gain: 0.2, filter: 1800 }); noise(0.9, { freq: 800, to: 100, gain: 0.4 }); },
    select() { tone(660, 0.06, { type: 'square', gain: 0.07 }); },
    confirm() { tone(523, 0.08, { type: 'square', gain: 0.09 }); tone(784, 0.16, { type: 'square', gain: 0.09 }, sfxBus, now() + 0.08); },
    back() { tone(400, 0.1, { type: 'square', to: 200, gain: 0.07 }); },
    gong() {
      [110, 165, 220, 330].forEach((f) => tone(f, 1.5, { type: 'sine', gain: 0.2, attack: 0.01 }));
      noise(0.3, { freq: 400, gain: 0.2 });
    },
  };

  function play(name) {
    if (!ctx || !Settings.data.sfx || !SFX[name]) return;
    try { SFX[name](); } catch (e) { /* ignore */ }
  }

  // ------------------------------- Musique --------------------------------
  const NOTE = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function nf(n) {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] - 4) * 12) / 12);
  }
  const _ = null;
  const TRACKS = {
    menu: {
      bpm: 108,
      bass: ['A2', _, _, 'A2', _, _, 'C3', _, 'G2', _, _, 'G2', _, _, 'E2', _, 'F2', _, _, 'F2', _, _, 'A2', _, 'E2', _, _, 'E2', 'G2', _, 'B2', _],
      lead: ['E4', _, _, _, 'C5', _, 'B4', _, 'A4', _, _, _, 'G4', _, _, _, 'A4', _, _, _, 'C5', _, 'D5', _, 'E5', _, _, _, 'D5', _, 'B4', _],
      drums: 'k...h.s.k.h.s...k...h.s.k.hks.h.',
    },
    fight: {
      bpm: 146,
      bass: ['A2', 'A2', _, 'A3', 'A2', _, 'G2', _, 'A2', 'A2', _, 'C3', _, 'D3', 'C3', _, 'F2', 'F2', _, 'F3', 'F2', _, 'E2', _, 'G2', 'G2', _, 'B2', _, 'D3', 'E3', _],
      lead: ['A4', _, 'C5', _, 'E5', _, 'D5', 'C5', _, _, 'B4', _, 'A4', _, _, _, 'F4', _, 'A4', _, 'C5', _, 'B4', 'A4', _, _, 'G#4', _, 'B4', _, 'E5', _],
      drums: 'k.h.s.hkk.h.s.hhk.h.s.hkk.hks.ss',
    },
  };

  function playStep(tr, i, t, sd) {
    const b = tr.bass[i % tr.bass.length];
    if (b) tone(nf(b), sd * 1.6, { type: 'sawtooth', gain: 0.22, filter: 700, attack: 0.005 }, musicBus, t);
    const l = tr.lead[i % tr.lead.length];
    if (l) tone(nf(l), sd * 1.8, { type: 'square', gain: 0.06, filter: 2200, attack: 0.01 }, musicBus, t);
    const d = tr.drums[i % tr.drums.length];
    if (d === 'k') tone(150, 0.16, { type: 'sine', to: 40, gain: 0.7 }, musicBus, t);
    else if (d === 's') noise(0.14, { freq: 1800, gain: 0.35, q: 0.7 }, musicBus, t);
    if (d === 'h' || i % 2 === 0) noise(0.04, { filter: 'highpass', freq: 7000, gain: 0.08 }, musicBus, t);
  }

  function schedule() {
    if (!ctx || !playing) return;
    const tr = TRACKS[playing];
    const sd = 60 / tr.bpm / 4;
    if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.15) {
      try { playStep(tr, step, nextTime, sd); } catch (e) { /* ignore */ }
      nextTime += sd;
      step = (step + 1) % 32;
    }
  }

  function startMusic(name) {
    wanted = name;
    if (!ctx || playing === name) return;
    stopMusic(true);
    playing = name; step = 0; nextTime = ctx.currentTime + 0.08;
    musicTimer = setInterval(schedule, 30);
  }

  function stopMusic(keepWanted) {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null; playing = null;
    if (!keepWanted) wanted = null;
  }

  // ----------------------- Voix de l'annonceur ----------------------------
  let voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /^fr/i.test(v.lang) && v.localService) || vs.find((v) => /^fr/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function say(text) {
    if (!Settings.data.voice || !Settings.data.sfx || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR'; u.rate = 1; u.pitch = 0.4; u.volume = 1;
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  return { init, apply, play, startMusic, stopMusic, say, suspend, resume };
})();
