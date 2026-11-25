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
const VERSION = '1.5.0';

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

// ---------------------------------------------------------------------------
// Classement interga-lactique (mode Arcade) : 8 entrées, initiales sur 3 lettres.
// Partagé en ligne via Supabase (voir supabase.sql) ; sans réseau, le jeu
// garde les scores de l'appareil et envoie ceux en attente plus tard.
// ---------------------------------------------------------------------------
const ONLINE = {
  url: 'https://wjcwebmbvqudablfbadl.supabase.co',
  key: 'sb_publishable_WfAd8xQlkly1znq30hakBA_MPqHwlA_', // clé « publishable » : publique par conception
};

const HighScores = {
  KEY: 'mettwurst-combat-scores',
  PENDING_KEY: 'mettwurst-combat-scores-pending',
  MAX: 8,
  list: [],      // scores de cet appareil
  global: null,  // classement en ligne (null tant qu'il n'est pas chargé)
  pending: [],   // scores pas encore envoyés
  status: 'off', // off | loading | ok | error
  lastEntry: null,
  get online() { return !!(ONLINE.url && ONLINE.key); },
  // le classement affiché : en ligne si disponible, sinon celui de l'appareil
  get best() { return this.global || this.list; },
  get isGlobal() { return !!this.global; },

  clean(e) {
    if (!e || typeof e.score !== 'number' || !isFinite(e.score)) return null;
    return {
      name: String(e.name || '???').toUpperCase().slice(0, 3),
      score: Math.round(e.score),
      char: String(e.char || e.fighter || ''),
      diff: clamp(+e.diff || 0, 0, 3),
    };
  },
  load() {
    const read = (k) => { try { const l = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    this.list = read(this.KEY).map((e) => this.clean(e)).filter(Boolean).slice(0, this.MAX);
    this.pending = read(this.PENDING_KEY).map((e) => this.clean(e)).filter(Boolean);
  },
  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.list));
      localStorage.setItem(this.PENDING_KEY, JSON.stringify(this.pending));
    } catch (e) { /* ignore */ }
  },
  // rang qu'aurait ce score (à égalité, le plus ancien reste devant)
  rankOf(score, list = this.best) {
    const i = list.findIndex((e) => score > e.score);
    return i < 0 ? list.length : i;
  },
  insert(list, entry) {
    list.splice(this.rankOf(entry.score, list), 0, entry);
    list.length = Math.min(list.length, this.MAX);
  },
  // vrai si ce score entre dans le classement
  qualifies(score) { return score > 0 && this.rankOf(score) < this.MAX; },
  // enregistre un score (appareil + en ligne) et renvoie son rang (0 = premier)
  add(entry) {
    entry = this.clean(entry);
    const rank = this.rankOf(entry.score);
    this.lastEntry = entry;
    this.insert(this.list, entry);
    if (this.global) this.insert(this.global, entry);
    if (this.online) { this.pending.push(entry); this.flush(); }
    this.save();
    return rank < this.MAX ? rank : -1;
  },

  request(path, opts = {}) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 8000);
    return fetch(ONLINE.url.replace(/\/+$/, '') + '/rest/v1/' + path, Object.assign({
      signal: ctrl && ctrl.signal,
      cache: 'no-store',
    }, opts, {
      headers: Object.assign({ apikey: ONLINE.key, 'Content-Type': 'application/json' }, opts.headers || {}),
    })).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    }).finally(() => clearTimeout(timer));
  },
  // recharge le classement en ligne
  refresh() {
    if (!this.online) return Promise.resolve();
    if (this.status !== 'ok') this.status = 'loading';
    return this.request(`scores?select=name,score,fighter,diff&order=score.desc,created_at.asc&limit=${this.MAX}`)
      .then((r) => r.json())
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : []).map((e) => this.clean(e)).filter(Boolean);
        // les scores pas encore envoyés restent visibles
        for (const p of this.pending) if (!list.some((e) => this.same(e, p))) this.insert(list, Object.assign({}, p));
        this.global = list;
        this.status = 'ok';
      })
      .catch(() => { this.status = 'error'; });
  },
  same(a, b) { return a && b && a.name === b.name && a.score === b.score && a.char === b.char; },
  // envoie les scores en attente, un par un
  flush() {
    if (!this.online || this.sending || !this.pending.length) return Promise.resolve();
    this.sending = true;
    const e = this.pending[0];
    return this.request('scores', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ name: e.name, score: e.score, fighter: e.char, diff: e.diff }),
    }).then(() => {
      this.pending.shift(); this.save();
      this.sending = false;
      return this.pending.length ? this.flush() : this.refresh();
    }, (err) => {
      this.sending = false;
      // refusé par le serveur (score invalide) : on l'abandonne et on passe au suivant
      if (/HTTP (400|409|422)/.test(err.message)) { this.pending.shift(); this.save(); return this.flush(); }
    });
  },
};
HighScores.load();
if (HighScores.online) {
  HighScores.flush().then(() => HighScores.refresh());
  window.addEventListener('online', () => HighScores.flush().then(() => HighScores.refresh()));
}

// Points gagnés par le joueur 1 sur un combat d'Arcade
function fightScore(result, opp, difficulty) {
  const st = result.stats || { rounds: [] };
  let pts = 0;
  const detail = [];
  for (const r of st.rounds) {
    if (r.winner !== 0) continue;
    pts += 1000 + Math.round(r.hp * 2000) + r.timer * 20;
    if (r.perfect) { pts += 3000; detail.push('CUISSON PARFAITE'); }
  }
  if (result.winner === 0) {
    pts += 5000;
    if (st.grilled) { pts += 5000; detail.push('GRILLADE FINALE'); }
    if (opp.boss) { pts += 20000; detail.push('BOSS VAINCU'); }
  }
  const mult = 1 + difficulty * 0.5;
  return { points: Math.round(pts * mult / 10) * 10, detail, mult };
}
