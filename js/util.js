'use strict';
// ---------------------------------------------------------------------------
// Constantes et utilitaires partagés
// ---------------------------------------------------------------------------
const ARENA_W = 960;
const ARENA_H = 540;
const GROUND = 468;
const STEP = 1 / 60;
const GRAVITY = 2600;
const FREE = new Set(['idle', 'walk', 'crouch', 'block']);
const VERSION = '1.2.0';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Générateur pseudo-aléatoire déterministe (détails décoratifs stables)
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

const DIFFICULTIES = ['FACILE', 'NORMAL', 'DIFFICILE', 'INFERNAL'];

const Settings = {
  data: { difficulty: 1, music: true, sfx: true, voice: true, bossUnlocked: false, wins: 0 },
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem('mettwurst-combat') || '{}')); } catch (e) { /* ignore */ }
  },
  save() {
    try { localStorage.setItem('mettwurst-combat', JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },
};
Settings.load();
