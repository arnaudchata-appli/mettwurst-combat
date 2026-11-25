'use strict';
// ---------------------------------------------------------------------------
// Boucle principale, mise à l'échelle et écrans du jeu
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const View = { scale: 1, w: ARENA_W, h: ARENA_H, ox: 0, oy: 0, dpr: 1 };
let scene = null;
let globalT = 0;

function resize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2, 1100 / Math.max(1, Math.min(cw, ch)));
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  View.dpr = dpr;
  View.scale = Math.min(canvas.width / ARENA_W, canvas.height / ARENA_H);
  View.w = canvas.width / View.scale;
  View.h = canvas.height / View.scale;
  View.ox = (View.w - ARENA_W) / 2;
  View.oy = (View.h - ARENA_H) / 2;
  Stage.clearCache();
  Input.layout(View);
  if (scene && scene.layout) scene.layout();
}

Input.attach(canvas, (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((cx - r.left) * (canvas.width / r.width)) / View.scale,
    y: ((cy - r.top) * (canvas.height / r.height)) / View.scale,
  };
});

const isStandalone = () => window.matchMedia('(display-mode: fullscreen)').matches
  || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    const lock = () => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { /* ignore */ }
}
Input.onFirstTouch = () => { if (!isStandalone()) goFullscreen(); };

function go(s) {
  if (scene && scene.leave) scene.leave();
  scene = s;
  if (s.layout) s.layout();
  if (s.enter) s.enter();
}

// Fond de menu animé
function menuBackground(c, stage = STAGES[0], dark = 0.35) {
  Stage.update(stage, View);
  Stage.drawBack(c, stage, View, canvas, globalT);
  c.save();
  c.translate(View.ox, View.oy);
  Stage.drawFloorFx(c, stage, View, globalT);
  c.restore();
  c.fillStyle = `rgba(10,3,2,${dark})`;
  c.fillRect(0, 0, View.w, View.h);
}

function makeDummy(def, side, x, y) {
  const f = new Fighter(def, side);
  f.x = x; f.y = y;
  return f;
}

// =============================== ÉCRAN TITRE ===============================
class TitleScene {
  enter() {
    Sound.startMusic('menu');
    this.t = 0;
    this.d1 = makeDummy(rosterById('mett'), 0, 0, 0);
    this.d2 = makeDummy(rosterById('boeuf'), 1, 0, 0);
    this.d2.facing = -1;
  }
  layout() {
    const w = Math.min(330, View.w * 0.4), h = 50, x = View.w / 2 - w / 2;
    let y = View.h * 0.38;
    const gap = Math.min(58, (View.h - y - 20) / 6);
    const items = [
      { label: 'ARCADE', action: () => go(new SelectScene('arcade')) },
      { label: 'VERSUS ORDI', action: () => go(new SelectScene('cpu')) },
      { label: '2 JOUEURS', action: () => go(new SelectScene('versus')) },
      { label: 'CLASSEMENT INTERGA-LACTIQUE', size: 20, action: () => go(new HighScoreScene()) },
      { label: 'COMMENT JOUER', action: () => go(new HowToScene()) },
      { label: 'OPTIONS', action: () => go(new OptionsScene()) },
    ].map((it) => { const b = Object.assign({ x, y, w, h: Math.min(h, gap - 8) }, it); y += gap; return b; });
    const f = this.menu ? this.menu.focus : 0;
    this.menu = new UI.Menu(items, { focus: f });
  }
  update() {
    this.t++;
    this.d1.anim++; this.d2.anim++;
    this.menu.update();
  }
  draw(c) {
    menuBackground(c, STAGES[0], 0.2);
    c.save();
    c.translate(View.ox, View.oy);
    this.d1.x = 150; this.d1.y = GROUND; this.d2.x = ARENA_W - 150; this.d2.y = GROUND;
    drawShadow(c, this.d1, 1.3); drawShadow(c, this.d2, 1.3);
    c.restore();
    c.save(); c.translate(View.ox, View.oy);
    c.translate(this.d1.x, GROUND); c.scale(1.3, 1.3); c.translate(-this.d1.x, -GROUND);
    drawFighter(c, this.d1);
    c.restore();
    c.save(); c.translate(View.ox, View.oy);
    c.translate(this.d2.x, GROUND); c.scale(1.3, 1.3); c.translate(-this.d2.x, -GROUND);
    drawFighter(c, this.d2);
    c.restore();
    UI.logo(c, View.w / 2, View.h * 0.15, Math.min(1, View.h / 600), this.t);
    this.menu.draw(c, this.t);
    c.globalAlpha = 0.6;
    UI.text(c, 'v' + VERSION + '  •  100 % grillé maison', View.w - 12, View.h - 14, 13, '#fff', 'right', { sw: 3 });
    c.globalAlpha = 1;
  }
}

// ========================== SÉLECTION DES PERSONNAGES =======================
class SelectScene {
  constructor(mode) {
    this.mode = mode; // arcade | cpu | versus
    this.list = ROSTER.filter((c) => !c.boss || Settings.data.bossUnlocked);
    this.stepIdx = 0; // 0 : joueur 1, 1 : adversaire
    this.cursor = [0, 1];
    this.picks = [null, null];
    this.t = 0;
    this.dummies = this.list.map((d) => makeDummy(d, 0, 0, 0));
  }
  enter() { Sound.startMusic('menu'); }
  layout() {
    const n = this.list.length;
    const cw = Math.min(104, (View.w - 40) / n - 8), ch = cw * 1.12;
    const total = n * (cw + 8) - 8;
    this.cells = this.list.map((d, i) => ({ x: View.w / 2 - total / 2 + i * (cw + 8), y: View.h - ch - 70, w: cw, h: ch }));
    this.okBtn = { x: View.w / 2 - 120, y: View.h - 60, w: 240, h: 48, label: 'VALIDER' };
    this.backBtn = { x: 14, y: 12, w: 130, h: 42, label: 'RETOUR', size: 22 };
  }
  get title() {
    if (this.stepIdx === 0) return this.mode === 'versus' ? 'JOUEUR 1 : CHOISIS TON GRILLADIN' : 'CHOISIS TON GRILLADIN';
    return this.mode === 'versus' ? 'JOUEUR 2 : CHOISIS TON GRILLADIN' : "CHOISIS L'ADVERSAIRE";
  }
  confirm() {
    Sound.play('confirm');
    const def = this.list[this.cursor[this.stepIdx]];
    this.picks[this.stepIdx] = def;
    if (this.mode === 'arcade') { Flow.startArcade(def); return; }
    if (this.stepIdx === 0) {
      this.stepIdx = 1;
      if (this.cursor[1] === this.cursor[0]) this.cursor[1] = (this.cursor[0] + 1) % this.list.length;
      return;
    }
    go(new ArenaSelectScene(this.mode, this.picks[0], this.picks[1]));
  }
  back() {
    Sound.play('back');
    if (this.stepIdx === 1) { this.stepIdx = 0; this.picks[0] = null; } else go(new TitleScene());
  }
  update() {
    this.t++;
    for (const d of this.dummies) d.anim++;
    const n = this.list.length, s = this.stepIdx;
    for (const a of Input.actions) {
      if (a === 'left' || a === 'up') { this.cursor[s] = (this.cursor[s] - 1 + n) % n; Sound.play('select'); }
      else if (a === 'right' || a === 'down') { this.cursor[s] = (this.cursor[s] + 1) % n; Sound.play('select'); }
      else if (a === 'confirm') { this.confirm(); return; }
      else if (a === 'back' || a === 'gpback') { this.back(); return; }
    }
    for (const p of Input.taps) {
      if (UI.inside(p, this.backBtn)) { this.back(); return; }
      if (UI.inside(p, this.okBtn)) { this.confirm(); return; }
      for (let i = 0; i < this.cells.length; i++) {
        if (UI.inside(p, this.cells[i])) {
          if (this.cursor[s] === i) { this.confirm(); return; }
          this.cursor[s] = i; Sound.play('select');
        }
      }
    }
  }
  drawPreview(c, def, x, side, label, color) {
    const f = makeDummy(def, side, x, 0);
    f.anim = this.t;
    f.facing = side === 0 ? 1 : -1;
    const gy = this.cells[0].y - 24;
    const s = Math.min(1.25, (gy - 140) / 200);
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath(); c.ellipse(x, gy, 70 * s, 12 * s, 0, 0, Math.PI * 2); c.fill();
    c.translate(x, gy); c.scale(s, s); c.translate(-x, -gy);
    f.y = gy;
    drawFighter(c, f);
    c.restore();
    UI.text(c, label, x, 92, 18, color);
  }
  drawStats(c, def, x, y, w) {
    const stats = [
      ['PUISSANCE', (def.power - 0.75) / 0.55],
      ['VITESSE', (def.speed - 160) / 150],
      ['RÉSISTANCE', (def.hp - 800) / 650],
      ['PORTÉE', (def.reach - 0.8) / 0.6],
    ];
    stats.forEach(([n, v], i) => {
      const yy = y + i * 24;
      UI.text(c, n, x, yy, 14, '#ffe0b2', 'left', { sw: 3 });
      const bx = x + 110;
      roundRectPath(c, bx, yy - 7, w - 110, 14, 6); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fill();
      const g = c.createLinearGradient(bx, 0, bx + w - 110, 0);
      g.addColorStop(0, '#ff6f00'); g.addColorStop(1, '#ffd54f');
      c.fillStyle = g;
      roundRectPath(c, bx, yy - 7, Math.max(8, (w - 110) * clamp(v, 0.08, 1)), 14, 6); c.fill();
    });
  }
  draw(c) {
    menuBackground(c, STAGES[1], 0.45);
    UI.text(c, this.title, View.w / 2, 34, Math.min(34, View.w / 26), '#fff', 'center', { grad: true });
    UI.button(c, this.backBtn, false, this.t);
    const cur = this.list[this.cursor[this.stepIdx]];
    // aperçus
    const p1 = this.stepIdx === 0 ? cur : this.picks[0];
    this.drawPreview(c, p1, View.w * 0.17, 0, this.mode === 'versus' ? 'JOUEUR 1' : 'TOI', '#ef5350');
    if (this.stepIdx === 1) this.drawPreview(c, cur, View.w * 0.83, 1, this.mode === 'versus' ? 'JOUEUR 2' : 'ORDI', '#42a5f5');
    // infos
    const cx = View.w / 2, iw = Math.min(380, View.w * 0.4);
    UI.text(c, cur.name, cx, 88, 40, '#fff', 'center', { grad: true });
    UI.text(c, cur.title.toUpperCase(), cx, 122, 18, '#ffcc80');
    UI.wrap(c, cur.desc, cx, 150, iw, 15, '#fff3e0');
    this.drawStats(c, cur, cx - iw / 2, 204, iw);
    UI.text(c, 'SPÉCIAL : ' + cur.specialName, cx, 304, 15, '#ffd54f', 'center', { sw: 3 });
    // grille
    this.cells.forEach((cell, i) => {
      const d = this.list[i], sel = i === this.cursor[this.stepIdx], p1sel = this.stepIdx === 1 && this.picks[0] === d;
      roundRectPath(c, cell.x, cell.y, cell.w, cell.h, 10);
      const g = c.createLinearGradient(0, cell.y, 0, cell.y + cell.h);
      g.addColorStop(0, sel ? '#ffb300' : '#5d1f12'); g.addColorStop(1, sel ? '#bf360c' : '#2a0c06');
      c.fillStyle = g; c.fill();
      c.lineWidth = sel ? 4 : 2; c.strokeStyle = sel ? '#fff' : p1sel ? '#ef5350' : '#ff8a65'; c.stroke();
      c.save();
      roundRectPath(c, cell.x, cell.y, cell.w, cell.h, 10); c.clip();
      const f = this.dummies[i];
      f.x = cell.x + cell.w / 2; f.y = cell.y + cell.h - 6;
      const s = (cell.h * 0.9) / (d.legLen + d.bodyH + 40);
      c.translate(f.x, f.y); c.scale(s, s); c.translate(-f.x, -f.y);
      drawFighter(c, f);
      c.restore();
      if (sel) UI.text(c, this.stepIdx === 0 ? 'J1' : this.mode === 'versus' ? 'J2' : 'CPU', cell.x + 16, cell.y + 14, 14, this.stepIdx === 0 ? '#ef5350' : '#42a5f5');
    });
    UI.button(c, this.okBtn, true, this.t);
    if (!Settings.data.bossUnlocked) {
      c.globalAlpha = 0.7;
      UI.text(c, 'Termine le mode Arcade pour débloquer un combattant secret…', View.w / 2, View.h - 74 - this.cells[0].h - 14, 13, '#ffe0b2', 'center', { sw: 3 });
      c.globalAlpha = 1;
    }
  }
}

// ============================ CHOIX DE L'ARÈNE =============================
class ArenaSelectScene {
  constructor(mode, p1, p2) {
    this.mode = mode; this.p1 = p1; this.p2 = p2; this.t = 0;
    this.options = [...STAGES, null]; // null = hasard
    this.cursor = Math.max(0, STAGES.findIndex((s) => s.id === 'autoroute')); // autoroute par défaut
  }
  enter() { Sound.startMusic('menu'); }
  layout() {
    const n = this.options.length;
    const w = Math.min(200, (View.w - 40) / n - 12), h = w * 0.5625;
    const total = n * (w + 12) - 12;
    this.cards = this.options.map((s, i) => ({ x: View.w / 2 - total / 2 + i * (w + 12), y: View.h * 0.42, w, h }));
    this.okBtn = { x: View.w / 2 - 120, y: View.h - 66, w: 240, h: 50, label: 'COMBATTRE !' };
    this.backBtn = { x: 14, y: 12, w: 130, h: 42, label: 'RETOUR', size: 22 };
  }
  get stage() { return this.options[this.cursor]; }
  confirm() {
    Sound.play('confirm');
    Flow.startVersus(this.mode, this.p1, this.p2, this.stage);
  }
  back() {
    Sound.play('back');
    const s = new SelectScene(this.mode);
    s.stepIdx = 1; s.picks[0] = this.p1;
    s.cursor = [s.list.indexOf(this.p1), Math.max(0, s.list.indexOf(this.p2))];
    go(s);
  }
  update() {
    this.t++;
    const n = this.options.length;
    for (const a of Input.actions) {
      if (a === 'left' || a === 'up') { this.cursor = (this.cursor - 1 + n) % n; Sound.play('select'); }
      else if (a === 'right' || a === 'down') { this.cursor = (this.cursor + 1) % n; Sound.play('select'); }
      else if (a === 'confirm') { this.confirm(); return; }
      else if (a === 'back' || a === 'gpback') { this.back(); return; }
    }
    for (const p of Input.taps) {
      if (UI.inside(p, this.backBtn)) { this.back(); return; }
      if (UI.inside(p, this.okBtn)) { this.confirm(); return; }
      for (let i = 0; i < this.cards.length; i++) {
        if (UI.inside(p, this.cards[i])) {
          if (this.cursor === i) { this.confirm(); return; }
          this.cursor = i; Sound.play('select');
        }
      }
    }
  }
  draw(c) {
    const st = this.stage;
    if (st) menuBackground(c, st, 0.35);
    else {
      // hasard : les arènes défilent en fond
      menuBackground(c, STAGES[Math.floor(this.t / 40) % STAGES.length], 0.55);
    }
    UI.text(c, "CHOISIS L'ARÈNE", View.w / 2, 40, Math.min(44, View.w / 20), '#fff', 'center', { grad: true });
    UI.button(c, this.backBtn, false, this.t);
    UI.text(c, `${this.p1.name}  VS  ${this.p2.name}`, View.w / 2, 84, 20, '#ffe0b2');
    this.cards.forEach((r, i) => {
      const s = this.options[i], sel = i === this.cursor;
      const grow = sel ? 1.08 + Math.sin(this.t * 0.15) * 0.015 : 1;
      c.save();
      c.translate(r.x + r.w / 2, r.y + r.h / 2); c.scale(grow, grow); c.translate(-r.w / 2, -r.h / 2);
      roundRectPath(c, 0, 0, r.w, r.h, 10);
      c.save(); c.clip();
      if (s) Stage.drawThumb(c, s, View, canvas, 0, 0, r.w, r.h);
      else {
        const g = c.createLinearGradient(0, 0, 0, r.h);
        g.addColorStop(0, '#5d1f12'); g.addColorStop(1, '#2a0c06');
        c.fillStyle = g; c.fillRect(0, 0, r.w, r.h);
        UI.text(c, '?', r.w / 2, r.h / 2, r.h * 0.6, '#ffb300');
      }
      c.restore();
      roundRectPath(c, 0, 0, r.w, r.h, 10);
      c.lineWidth = sel ? 4 : 2; c.strokeStyle = sel ? '#fff' : '#ff8a65'; c.stroke();
      c.restore();
      if (s && s.inferno) UI.text(c, 'BOSS', r.x + r.w - 26, r.y + 14, 13, '#ff7043', 'center', { sw: 3 });
    });
    const r = this.cards[this.cursor];
    UI.text(c, st ? st.name : 'HASARD', View.w / 2, r.y + r.h + 40, Math.min(34, View.w / 26), '#fff', 'center', { grad: true });
    const def = this.cards[this.options.findIndex((s) => s && s.id === 'autoroute')];
    if (def) UI.text(c, 'PAR DÉFAUT', def.x + def.w / 2, def.y - 20, 14, '#ffcc80', 'center', { sw: 3 });
    UI.button(c, this.okBtn, true, this.t);
  }
}

// ================================ ÉCRAN VS =================================
class VSScene {
  constructor(p1, p2, sub, next) { this.p1 = p1; this.p2 = p2; this.sub = sub; this.next = next; this.t = 0; }
  enter() {
    Sound.play('gong');
    Sound.say(this.p1.name.toLowerCase() + ' contre ' + this.p2.name.toLowerCase());
    this.f1 = makeDummy(this.p1, 0, 0, 0); this.f2 = makeDummy(this.p2, 1, 0, 0); this.f2.facing = -1;
  }
  update() {
    this.t++; this.f1.anim++; this.f2.anim++;
    if (this.t > 170 || (this.t > 25 && (Input.taps.length || Input.actions.includes('confirm')))) this.next();
  }
  draw(c) {
    menuBackground(c, STAGES[2], 0.3);
    const k = Math.min(1, this.t / 18);
    const s = Math.min(1.5, View.h / 360);
    const gy = View.h * 0.82;
    const x1 = lerp(-200, View.w * 0.25, k), x2 = lerp(View.w + 200, View.w * 0.75, k);
    for (const [f, x] of [[this.f1, x1], [this.f2, x2]]) {
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(x, gy, 80 * s, 14 * s, 0, 0, Math.PI * 2); c.fill();
      f.x = x; f.y = gy;
      c.translate(x, gy); c.scale(s, s); c.translate(-x, -gy);
      drawFighter(c, f);
      c.restore();
    }
    UI.text(c, this.p1.name, View.w * 0.25, View.h * 0.12, 34, '#ef5350');
    UI.text(c, this.p2.name, View.w * 0.75, View.h * 0.12, 34, '#42a5f5');
    const vs = 1 + Math.max(0, 1 - this.t / 15) * 2;
    c.save(); c.translate(View.w / 2, View.h * 0.45); c.scale(vs, vs);
    UI.text(c, 'VS', 0, 0, 110, '#fff', 'center', { grad: true, sw: 14 });
    c.restore();
    if (this.sub) UI.text(c, this.sub, View.w / 2, View.h * 0.62, 24, '#ffe0b2');
  }
}

// ================================ COMBAT ===================================
class FightScene {
  constructor(cfg) {
    this.cfg = cfg;
    this.fight = new Fight(cfg);
    this.pauseMenu = null;
  }
  enter() { Sound.startMusic('fight'); }
  layout() { if (this.pauseMenu) this.openPause(); }
  openPause() {
    this.fight.paused = true;
    const w = 300, h = 52, x = View.w / 2 - w / 2, y = View.h / 2 - 70;
    this.pauseMenu = new UI.Menu([
      { x, y, w, h, label: 'REPRENDRE', action: () => this.closePause() },
      { x, y: y + 64, w, h, label: 'RECOMMENCER', action: () => go(new FightScene(Object.assign({}, this.cfg, { ai: this.cfg.ai && this.cfg.ai.map((a) => (a ? new AI(a.lv) : null)) }))) },
      { x, y: y + 128, w, h, label: 'QUITTER', action: () => (this.cfg.mode === 'arcade' ? Flow.gameOver() : go(new TitleScene())) },
    ], { onBack: () => this.closePause() });
  }
  closePause() { this.pauseMenu = null; this.fight.paused = false; }
  update() {
    if (this.pauseMenu) { this.pauseMenu.update(); return; }
    if (Input.actions.includes('pause')) { this.openPause(); Sound.play('select'); return; }
    for (const p of Input.taps) {
      const pb = Input.L.pause;
      if (Math.hypot(p.x - pb.x, p.y - pb.y) < pb.r * 1.5) { this.openPause(); Sound.play('select'); return; }
    }
    this.fight.update();
  }
  draw(c) {
    this.fight.draw(c);
    UI.drawPauseButton(c);
    if (Input.touchActive && !this.pauseMenu) UI.drawTouch(c);
    if (this.pauseMenu) {
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, View.w, View.h);
      UI.text(c, 'PAUSE', View.w / 2, View.h / 2 - 120, 60, '#fff', 'center', { grad: true });
      this.pauseMenu.draw(c, globalT);
    }
  }
}

// ============================ ÉCRAN DE RÉSULTAT ============================
class ResultScene {
  constructor(def, title, sub, buttons, countdown) {
    this.def = def; this.title = title; this.sub = sub; this.buttons = buttons; this.t = 0;
    this.countdown = countdown || null;
  }
  enter() {
    Sound.startMusic('menu');
    this.f = makeDummy(this.def, 0, 0, 0);
    this.f.state = this.countdown ? 'dizzy' : 'win';
  }
  layout() {
    const n = this.buttons.length, w = Math.min(260, (View.w - 60) / n - 16), h = 52;
    const total = n * (w + 16) - 16;
    this.menu = new UI.Menu(this.buttons.map((b, i) => Object.assign({ x: View.w / 2 - total / 2 + i * (w + 16), y: View.h - 86, w, h }, b)), { horizontal: true });
  }
  update() {
    this.t++; this.f.anim++;
    if (this.countdown && this.t % 60 === 0) {
      this.countdown--;
      if (this.countdown <= 0) { if (this.onTimeout) this.onTimeout(); else go(new TitleScene()); return; }
    }
    this.menu.update();
  }
  draw(c) {
    menuBackground(c, STAGES[0], 0.45);
    const s = Math.min(1.6, View.h / 330), gy = View.h - 120;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(View.w / 2, gy, 80 * s, 14 * s, 0, 0, Math.PI * 2); c.fill();
    this.f.x = View.w / 2; this.f.y = gy;
    c.translate(View.w / 2, gy); c.scale(s, s); c.translate(-View.w / 2, -gy);
    drawFighter(c, this.f);
    c.restore();
    UI.text(c, this.title, View.w / 2, 56, Math.min(58, View.w / 16), '#fff', 'center', { grad: true });
    if (this.sub) UI.text(c, this.sub, View.w / 2, 104, 24, '#ffe0b2');
    if (this.countdown) UI.text(c, String(this.countdown), View.w / 2, 150, 48, '#ff7043');
    if (this.info) drawScoreInfo(c, this.info, View.w * 0.17, View.h * 0.42);
    this.menu.draw(c, this.t);
  }
}

// ================================ FIN ARCADE ===============================
class EndingScene {
  constructor(def, unlocked, info, onDone) {
    this.def = def; this.unlocked = unlocked; this.t = 0; this.conf = [];
    this.info = info || null; this.onDone = onDone || (() => go(new TitleScene()));
  }
  enter() {
    Sound.startMusic('menu');
    Sound.say(this.def.name.toLowerCase() + ', roi du barbecue !');
    this.f = makeDummy(this.def, 0, 0, 0); this.f.state = 'win';
  }
  layout() {
    this.menu = new UI.Menu([{ x: View.w / 2 - 130, y: View.h - 76, w: 260, h: 52, label: 'SUITE', action: () => this.onDone() }]);
  }
  update() {
    this.t++; this.f.anim++;
    if (this.conf.length < 140) {
      this.conf.push({ x: rand(0, View.w), y: -20, vy: rand(60, 160), vx: rand(-30, 30), r: rand(0, 6), c: choice(['#ffb300', '#e53935', '#8bc34a', '#f3e5f5', '#ff7043']) });
    }
    for (const p of this.conf) { p.y += p.vy * STEP; p.x += p.vx * STEP; p.r += 0.1; if (p.y > View.h + 20) { p.y = -20; p.x = rand(0, View.w); } }
    this.menu.update();
  }
  draw(c) {
    menuBackground(c, STAGES[0], 0.35);
    for (const p of this.conf) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c;
      c.beginPath(); c.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    const s = Math.min(1.6, View.h / 330), gy = View.h - 110;
    c.save();
    this.f.x = View.w / 2; this.f.y = gy;
    c.translate(View.w / 2, gy); c.scale(s, s); c.translate(-View.w / 2, -gy);
    drawFighter(c, this.f);
    c.restore();
    UI.text(c, 'FÉLICITATIONS !', View.w / 2, 50, 54, '#fff', 'center', { grad: true });
    UI.text(c, this.def.name + ' EST LE ROI DU BARBECUE !', View.w / 2, 100, Math.min(28, View.w / 32), '#ffe0b2');
    if (this.unlocked) UI.text(c, 'NOUVEAU COMBATTANT DÉBLOQUÉ : MAÎTRE CHARBON !', View.w / 2, 140, 20, '#ff7043');
    if (this.info) drawScoreInfo(c, this.info, View.w * 0.17, View.h * 0.45);
    this.menu.draw(c, this.t);
  }
}

// ================================ SCORES ===================================
const fmtScore = (n) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Panneau « points gagnés / score total » des écrans de résultat d'Arcade
// info : { gained, total, detail: [] }
function drawScoreInfo(c, info, x, y) {
  const w = Math.min(250, View.w * 0.3), lines = info.detail || [];
  const h = 96 + lines.length * 20 + (info.gained != null ? 30 : 0);
  roundRectPath(c, x - w / 2, y - 30, w, h, 12);
  c.fillStyle = 'rgba(20,8,4,0.7)'; c.fill();
  c.lineWidth = 2; c.strokeStyle = '#ffab40'; c.stroke();
  let yy = y - 8;
  if (info.gained != null) { UI.text(c, '+' + fmtScore(info.gained) + ' PTS', x, yy, 22, '#ffd54f'); yy += 30; }
  for (const d of lines) { UI.text(c, d, x, yy, 13, '#ffcc80', 'center', { sw: 3 }); yy += 20; }
  UI.text(c, 'SCORE', x, yy + 4, 15, '#ffe0b2', 'center', { sw: 3 });
  UI.text(c, fmtScore(info.total), x, yy + 34, 32, '#fff', 'center', { grad: true });
}

// ======================== SAISIE DES INITIALES =============================
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
class NameEntryScene {
  // onDone(rang) : appelé une fois le score enregistré
  constructor(score, def, onDone) {
    this.score = score; this.def = def; this.onDone = onDone; this.t = 0;
    const last = (Settings.data.initials || 'AAA').toUpperCase();
    this.idx = [0, 1, 2].map((i) => Math.max(0, LETTERS.indexOf(last[i] || 'A')));
    this.cursor = 0;
    this.typed = [];
    this.rank = HighScores.rankOf(score);
  }
  enter() {
    Sound.startMusic('menu');
    Sound.say('Nouveau record !');
    this.f = makeDummy(this.def, 0, 0, 0); this.f.state = 'win';
    // saisie directe au clavier physique
    this.onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = (e.key || '').toUpperCase();
      if (k.length === 1 && LETTERS.includes(k)) this.typed.push(k);
    };
    window.addEventListener('keydown', this.onKey);
  }
  leave() { window.removeEventListener('keydown', this.onKey); }
  layout() {
    const bw = Math.min(96, View.w * 0.1), bh = bw * 1.2, gap = bw * 0.35;
    const total = 3 * bw + 2 * gap, x0 = View.w / 2 - total / 2, y = View.h * 0.42;
    this.boxes = [0, 1, 2].map((i) => ({ x: x0 + i * (bw + gap), y, w: bw, h: bh }));
    this.ups = this.boxes.map((b) => ({ x: b.x, y: b.y - 50, w: b.w, h: 42 }));
    this.downs = this.boxes.map((b) => ({ x: b.x, y: b.y + b.h + 8, w: b.w, h: 42 }));
    this.okBtn = { x: View.w / 2 - 120, y: View.h - 66, w: 240, h: 50, label: 'VALIDER' };
  }
  get name() { return this.idx.map((i) => LETTERS[i]).join(''); }
  spin(slot, d) {
    const n = LETTERS.length;
    this.idx[slot] = (this.idx[slot] + d + n) % n;
    Sound.play('select');
  }
  validate() {
    if (this.saved) return;
    this.saved = true;
    Sound.play('confirm');
    const name = this.name;
    Settings.data.initials = name; Settings.save();
    const rank = HighScores.add({
      name, score: this.score, char: this.def.id, diff: Settings.data.difficulty, date: Date.now(),
    });
    this.onDone(rank);
  }
  update() {
    this.t++; this.f.anim++;
    if (this.typed.length) {
      // une lettre tapée : on ignore les actions générées par la même touche (J, ZQSD…)
      for (const k of this.typed) {
        this.idx[this.cursor] = LETTERS.indexOf(k);
        Sound.play('select');
        if (this.cursor < 2) this.cursor++;
      }
      this.typed.length = 0;
      return;
    }
    for (const a of Input.actions) {
      if (a === 'up') this.spin(this.cursor, -1);
      else if (a === 'down') this.spin(this.cursor, 1);
      else if (a === 'left') { this.cursor = (this.cursor + 2) % 3; Sound.play('select'); }
      else if (a === 'right') { this.cursor = (this.cursor + 1) % 3; Sound.play('select'); }
      else if (a === 'confirm') {
        if (this.cursor < 2) { this.cursor++; Sound.play('select'); } else { this.validate(); return; }
      } else if (a === 'back' || a === 'gpback') { if (this.cursor > 0) { this.cursor--; Sound.play('back'); } }
    }
    for (const p of Input.taps) {
      if (UI.inside(p, this.okBtn)) { this.validate(); return; }
      for (let i = 0; i < 3; i++) {
        if (UI.inside(p, this.ups[i])) { this.cursor = i; this.spin(i, -1); }
        else if (UI.inside(p, this.downs[i])) { this.cursor = i; this.spin(i, 1); }
        else if (UI.inside(p, this.boxes[i])) { this.cursor = i; Sound.play('select'); }
      }
    }
  }
  draw(c) {
    menuBackground(c, STAGES[0], 0.55);
    UI.text(c, 'NOUVEAU RECORD !', View.w / 2, 46, Math.min(56, View.w / 16), '#fff', 'center', { grad: true });
    UI.text(c, `${this.rank + 1}${this.rank === 0 ? 'ER' : 'E'} PLACE  •  ${fmtScore(this.score)} POINTS`, View.w / 2, 96, 24, '#ffe0b2');
    UI.text(c, 'ENTRE TES INITIALES', View.w / 2, this.ups[0].y - 26, 18, '#ffcc80', 'center', { sw: 3 });
    // grilladin à gauche
    const s = Math.min(1.1, View.h / 480), gy = View.h - 90, fx = View.w * 0.15;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(fx, gy, 70 * s, 12 * s, 0, 0, Math.PI * 2); c.fill();
    this.f.x = fx; this.f.y = gy;
    c.translate(fx, gy); c.scale(s, s); c.translate(-fx, -gy);
    drawFighter(c, this.f);
    c.restore();
    for (let i = 0; i < 3; i++) {
      const b = this.boxes[i], sel = i === this.cursor;
      roundRectPath(c, b.x, b.y, b.w, b.h, 12);
      const g = c.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, sel ? '#ffb300' : '#5d1f12'); g.addColorStop(1, sel ? '#bf360c' : '#2a0c06');
      c.fillStyle = g; c.fill();
      c.lineWidth = sel ? 4 : 2; c.strokeStyle = sel ? '#fff' : '#ff8a65'; c.stroke();
      const bob = sel ? Math.sin(this.t * 0.2) * 2 : 0;
      UI.text(c, LETTERS[this.idx[i]], b.x + b.w / 2, b.y + b.h / 2 + 3 + bob, b.h * 0.7, '#fff', 'center', { grad: sel });
      for (const [r, up] of [[this.ups[i], true], [this.downs[i], false]]) {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2, k = 13;
        c.fillStyle = sel ? '#ffca28' : 'rgba(255,224,178,0.6)';
        c.beginPath();
        if (up) { c.moveTo(cx, cy - k); c.lineTo(cx + k * 1.3, cy + k * 0.7); c.lineTo(cx - k * 1.3, cy + k * 0.7); }
        else { c.moveTo(cx, cy + k); c.lineTo(cx + k * 1.3, cy - k * 0.7); c.lineTo(cx - k * 1.3, cy - k * 0.7); }
        c.closePath(); c.fill();
      }
    }
    c.globalAlpha = 0.7;
    UI.text(c, '↑ ↓ changer la lettre   ← → changer de case   (ou tape au clavier)', View.w / 2, this.downs[0].y + 70, 14, '#ffe0b2', 'center', { sw: 3 });
    c.globalAlpha = 1;
    UI.button(c, this.okBtn, this.cursor === 2, this.t);
  }
}

// ========================== CLASSEMENT INTERGA-LACTIQUE ==========================
class HighScoreScene {
  // highlight : vrai pour faire clignoter le score qui vient d'être saisi
  constructor(highlight = false, onBack) {
    this.highlight = !!highlight; this.t = 0;
    this.onBack = onBack || (() => go(new TitleScene()));
  }
  enter() { Sound.startMusic('menu'); HighScores.refresh(); }
  layout() {
    this.menu = new UI.Menu([{ x: View.w / 2 - 110, y: View.h - 60, w: 220, h: 46, label: 'RETOUR', action: () => this.onBack() }],
      { onBack: () => this.onBack() });
  }
  update() { this.t++; this.menu.update(); }
  draw(c) {
    menuBackground(c, STAGES[1], 0.6);
    UI.text(c, 'CLASSEMENT INTERGA-LACTIQUE', View.w / 2, 40, Math.min(44, View.w / 22), '#fff', 'center', { grad: true });
    const H = HighScores;
    const sub = H.isGlobal ? 'MODE ARCADE  •  TOUS LES JOUEURS DE LA GALAXIE'
      : H.online && H.status === 'loading' ? 'CONNEXION À LA GALAXIE…'
        : H.online ? 'HORS LIGNE  •  SCORES DE CET APPAREIL' : 'MODE ARCADE  •  SCORES DE CET APPAREIL';
    UI.text(c, sub, View.w / 2, 78, 16, H.online && !H.isGlobal ? '#ff8a65' : '#ffcc80', 'center', { sw: 3 });
    const list = H.best;
    const hlIdx = this.highlight ? list.findIndex((e) => H.same(e, H.lastEntry)) : -1;
    const w = Math.min(720, View.w - 40), x = View.w / 2 - w / 2;
    const top = 104, bottom = View.h - 74, rowH = Math.min(36, (bottom - top - 28) / HighScores.MAX);
    const fs = Math.max(13, Math.min(22, rowH * 0.6));
    const col = { rank: x + w * 0.07, name: x + w * 0.2, score: x + w * 0.5, char: x + w * 0.68, diff: x + w * 0.96 };
    UI.text(c, 'RANG', col.rank, top + 10, 13, '#ffb300', 'center', { sw: 3 });
    UI.text(c, 'NOM', col.name, top + 10, 13, '#ffb300', 'center', { sw: 3 });
    UI.text(c, 'SCORE', col.score, top + 10, 13, '#ffb300', 'right', { sw: 3 });
    UI.text(c, 'GRILLADIN', col.char, top + 10, 13, '#ffb300', 'left', { sw: 3 });
    UI.text(c, 'DIFFICULTÉ', col.diff, top + 10, 13, '#ffb300', 'right', { sw: 3 });
    const medal = ['#ffd54f', '#e0e0e0', '#ff8a65'];
    for (let i = 0; i < HighScores.MAX; i++) {
      const e = list[i], y = top + 28 + i * rowH + rowH / 2, hl = i === hlIdx;
      roundRectPath(c, x, y - rowH / 2 + 2, w, rowH - 4, 8);
      c.fillStyle = hl ? `rgba(255,179,0,${0.35 + Math.sin(this.t * 0.15) * 0.15})` : i % 2 ? 'rgba(20,8,4,0.45)' : 'rgba(60,20,10,0.5)';
      c.fill();
      if (hl) { c.lineWidth = 2; c.strokeStyle = '#fff3c4'; c.stroke(); }
      const color = i < 3 ? medal[i] : '#fff3e0';
      UI.text(c, String(i + 1), col.rank, y, fs, color, 'center', { sw: 3 });
      if (!e) {
        c.globalAlpha = 0.35;
        UI.text(c, '- - -', col.name, y, fs, '#fff', 'center', { sw: 3 });
        UI.text(c, '0', col.score, y, fs, '#fff', 'right', { sw: 3 });
        c.globalAlpha = 1;
        continue;
      }
      const def = rosterById(e.char);
      UI.text(c, e.name, col.name, y, fs + 2, hl ? '#fff' : color, 'center', { sw: 3 });
      UI.text(c, fmtScore(e.score), col.score, y, fs, '#fff', 'right', { sw: 3 });
      UI.text(c, def ? def.name : '?', col.char, y, fs * 0.8, '#ffe0b2', 'left', { sw: 3 });
      UI.text(c, DIFFICULTIES[e.diff] || '', col.diff, y, fs * 0.7, '#ffcc80', 'right', { sw: 3 });
    }
    if (!list.length) UI.text(c, 'AUCUN SCORE : FINIS UNE PARTIE D\'ARCADE !', View.w / 2, top + 28 + rowH * 5, 20, '#ffcc80');
    this.menu.draw(c, this.t);
  }
}

// ================================ OPTIONS ==================================
class OptionsScene {
  constructor() { this.t = 0; }
  layout() {
    const D = Settings.data, w = Math.min(460, View.w * 0.6), h = 50, x = View.w / 2 - w / 2;
    const gap = Math.min(62, (View.h - 120) / 6);
    let y = 100;
    const mk = (label, action) => { const b = { x, y, w, h: Math.min(h, gap - 8), label, action, size: 24 }; y += gap; return b; };
    const refresh = () => { Settings.save(); Sound.apply(); this.layout(); };
    const f = this.menu ? this.menu.focus : 0;
    this.menu = new UI.Menu([
      mk('DIFFICULTÉ : ' + DIFFICULTIES[D.difficulty], () => { D.difficulty = (D.difficulty + 1) % DIFFICULTIES.length; refresh(); }),
      mk('MUSIQUE : ' + (D.music ? 'OUI' : 'NON'), () => { D.music = !D.music; refresh(); }),
      mk('BRUITAGES : ' + (D.sfx ? 'OUI' : 'NON'), () => { D.sfx = !D.sfx; refresh(); }),
      mk('VOIX DU PRÉSENTATEUR : ' + (D.voice ? 'OUI' : 'NON'), () => { D.voice = !D.voice; refresh(); }),
      mk('PLEIN ÉCRAN', () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else goFullscreen();
      }),
      mk('RETOUR', () => go(new TitleScene())),
    ], { focus: f, onBack: () => go(new TitleScene()) });
  }
  update() { this.t++; this.menu.update(); }
  draw(c) {
    menuBackground(c, STAGES[1], 0.5);
    UI.text(c, 'OPTIONS', View.w / 2, 50, 54, '#fff', 'center', { grad: true });
    this.menu.draw(c, this.t);
  }
}

// ============================== COMMENT JOUER ==============================
class HowToScene {
  constructor() { this.t = 0; }
  layout() {
    this.menu = new UI.Menu([{ x: View.w / 2 - 110, y: View.h - 62, w: 220, h: 48, label: 'RETOUR', action: () => go(new TitleScene()) }],
      { onBack: () => go(new TitleScene()) });
  }
  update() { this.t++; this.menu.update(); }
  draw(c) {
    menuBackground(c, STAGES[1], 0.65);
    UI.text(c, 'COMMENT JOUER', View.w / 2, 40, 46, '#fff', 'center', { grad: true });
    const colW = Math.min(440, View.w / 2 - 30);
    const lx = View.w / 2 - colW - 10, rx = View.w / 2 + 10;
    const sz = Math.max(12, Math.min(16, View.h / 36));
    const lh = sz * 1.55;
    const left = [
      ['DÉPLACEMENTS', 'h'],
      ['← →  avancer / reculer'], ['↑  sauter    ↓  s\'accroupir'],
      ['POING / PIED  attaquer'], ['GARDE  bloquer (accroupi contre les balayettes)'],
      ['', ''],
      ['CLAVIER (1 joueur)', 'h'],
      ['Flèches ou ZQSD + J poing, K pied, L garde, I spécial, O yaourt'],
      ['CLAVIER (2 joueurs)', 'h'],
      ['J1 : ZQSD + F G H T Y    J2 : flèches + B N M , .'],
      ['Manettes Bluetooth / USB reconnues'],
    ];
    const right = [
      ['COUPS', 'h'],
      ['↓ + POING  uppercut (fait décoller)'], ['↓ + PIED  balayette (attaque basse)'],
      ['PIED en l\'air  coup de pied sauté'],
      ['SPÉCIAL  coup secret de ton grilladin'],
      ['YAOURT  écrase un pot : l\'adversaire devient collant (3 pots/round)'],
      ['ENCHAÎNE  Poing → Poing → Pied → Spécial'],
      ['', ''],
      ['JAUGE DE BRAISE', 'h'],
      ['Elle se remplit en frappant et en encaissant.'],
      ['Pleine : SPÉCIAL déclenche ton SUPER !'],
      ['FIN DU MATCH', 'h'],
      ['« GRILLE-LE ! » → ↓ + SPÉCIAL = GRILLADE FINALE'],
    ];
    const drawCol = (lines, x) => {
      let y = 90;
      for (const [s, k] of lines) {
        if (k === 'h') { UI.text(c, s, x, y, sz + 4, '#ffb300', 'left', { sw: 3 }); y += lh * 1.1; }
        else if (s) {
          c.font = `600 ${sz}px "Segoe UI", Roboto, Arial, sans-serif`;
          c.fillStyle = '#fff3e0'; c.textAlign = 'left'; c.textBaseline = 'middle';
          c.fillText(s, x, y); y += lh;
        } else y += lh * 0.4;
      }
    };
    drawCol(left, lx); drawCol(right, rx);
    this.menu.draw(c, this.t);
  }
}

// ============================ ENCHAÎNEMENT DES MODES =======================
const Flow = {
  arcade: null,
  startArcade(p1) {
    const ladder = shuffle(ROSTER.filter((c) => !c.boss && c.id !== p1.id));
    if (p1.id !== 'charbon') ladder.push(rosterById('charbon'));
    this.arcade = { p1, ladder, idx: 0, score: 0 };
    HighScores.refresh(); // pour savoir, en fin de partie, si le score entre au classement
    this.nextArcade();
  },
  // Fin de partie d'Arcade : saisie des initiales si le score entre au tableau.
  // next(rang) : la suite ; par défaut, le tableau des scores.
  gameOver(next) {
    const a = this.arcade;
    const score = a ? a.score : 0;
    if (a) a.score = 0;
    const done = next || ((rank) => go(rank >= 0 ? new HighScoreScene(true) : new TitleScene()));
    if (a && HighScores.qualifies(score)) go(new NameEntryScene(score, a.p1, done));
    else done(-1);
  },
  nextArcade() {
    const a = this.arcade, opp = a.ladder[a.idx];
    // l'autoroute en premier (arène par défaut), puis les autres
    const normal = STAGES.filter((s) => !s.inferno).sort((a, b) => (b.id === 'autoroute') - (a.id === 'autoroute'));
    const stage = opp.boss ? STAGES.find((s) => s.inferno) : normal[a.idx % normal.length];
    const lvl = Settings.data.difficulty + (a.idx / Math.max(1, a.ladder.length - 1)) * 0.8 + (opp.boss ? 0.3 : 0);
    const sub = (opp.boss ? 'COMBAT FINAL  •  ' + stage.name : `COMBAT ${a.idx + 1} / ${a.ladder.length}  •  ${stage.name}`)
      + '  •  SCORE ' + fmtScore(a.score);
    const startFight = () => go(new FightScene({
      p1: a.p1, p2: opp, mode: 'arcade', ai: [null, new AI(lvl)], stage,
      onEnd: (r) => this.arcadeResult(r),
    }));
    go(new VSScene(a.p1, opp, sub, startFight));
  },
  arcadeResult(r) {
    const a = this.arcade;
    const opp = a.ladder[a.idx];
    const sc = fightScore(r, opp, Settings.data.difficulty);
    a.score += sc.points;
    const info = { gained: sc.points, total: a.score, detail: sc.detail };
    if (r.winner === 0) {
      a.idx++;
      if (a.idx >= a.ladder.length) {
        const unlocked = !Settings.data.bossUnlocked;
        Settings.data.bossUnlocked = true;
        Settings.data.wins++;
        Settings.save();
        go(new EndingScene(a.p1, unlocked, info, () => this.gameOver()));
        return;
      }
      const res = new ResultScene(a.p1, 'VICTOIRE !', `${opp.name} EST CUIT À POINT`, [
        { label: 'COMBAT SUIVANT', action: () => this.nextArcade() },
        { label: 'ABANDONNER', action: () => this.gameOver() },
      ]);
      res.info = info;
      go(res);
    } else {
      // continuer remet le score à zéro (après l'avoir enregistré s'il le mérite)
      const res = new ResultScene(a.p1, 'DÉFAITE…', 'TU AS ÉTÉ GRILLÉ ! CONTINUER ?', [
        { label: 'CONTINUER', action: () => this.gameOver(() => this.nextArcade()) },
        { label: 'MENU', action: () => this.gameOver() },
      ], 10);
      res.info = info;
      info.detail = info.detail.concat(['CONTINUER REMET LE SCORE À 0']);
      res.onTimeout = () => this.gameOver();
      go(res);
    }
  },
  // chosen : arène choisie, ou null pour le hasard
  startVersus(mode, p1, p2, chosen) {
    const stage = chosen || choice(STAGES.filter((s) => !s.inferno || p1.boss || p2.boss));
    const ai = mode === 'cpu' ? [null, new AI(Settings.data.difficulty + 0.2)] : [null, null];
    const again = () => this.startVersus(mode, p1, p2, chosen);
    go(new VSScene(p1, p2, stage.name, () => go(new FightScene({
      p1, p2, mode, ai, stage,
      onEnd: (r) => {
        const w = r.winner === 0 ? p1 : p2;
        const who = mode === 'versus' ? `JOUEUR ${r.winner + 1} GAGNE !` : (r.winner === 0 ? 'VICTOIRE !' : 'DÉFAITE…');
        go(new ResultScene(w, who, w.name + ' REMPORTE LE COMBAT', [
          { label: 'REVANCHE', action: again },
          { label: 'PERSONNAGES', action: () => go(new SelectScene(mode)) },
          { label: 'MENU', action: () => go(new TitleScene()) },
        ]));
      },
    }))));
  },
};

// ============================== BOUCLE PRINCIPALE ==========================
let last = performance.now(), acc = 0;
const portrait = () => window.innerHeight > window.innerWidth * 1.05 && (Input.touchActive || matchMedia('(pointer: coarse)').matches);

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  const rotate = portrait();
  let n = 0;
  while (acc >= STEP && n < 5) {
    Input.poll();
    if (!rotate) { globalT++; scene.update(); }
    Input.endFrame();
    acc -= STEP; n++;
  }
  if (n >= 5) acc = 0;
  ctx.setTransform(View.scale, 0, 0, View.scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  scene.draw(ctx);
  if (rotate) {
    ctx.fillStyle = 'rgba(10,3,2,0.92)';
    ctx.fillRect(0, 0, View.w, View.h);
    UI.text(ctx, '↻', View.w / 2, View.h / 2 - 60, 90, '#ffb300');
    UI.text(ctx, 'TOURNE TON TÉLÉPHONE', View.w / 2, View.h / 2 + 30, Math.min(40, View.w / 14), '#fff', 'center', { grad: true });
    UI.text(ctx, 'EN MODE PAYSAGE', View.w / 2, View.h / 2 + 70, Math.min(26, View.w / 20), '#ffe0b2');
  }
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Sound.suspend();
    if (scene instanceof FightScene && !scene.pauseMenu) scene.openPause();
  } else Sound.resume();
});

resize();
// Mode démo (ordi contre ordi) : index.html#demo=mett,boeuf,0
if (/touch/.test(location.hash)) Input.forceTouch();
if (/select/.test(location.hash)) go(new SelectScene('cpu'));
if (/arena/.test(location.hash)) go(new ArenaSelectScene('cpu', ROSTER[0], ROSTER[1]));
if (/scores/.test(location.hash)) go(new HighScoreScene());
if (/initiales/.test(location.hash)) go(new NameEntryScene(123450, ROSTER[0], (r) => go(new HighScoreScene(r >= 0))));
const demo = /^#demo(?:=([a-z]+),([a-z]+)(?:,(\d))?)?/.exec(location.hash || '');
if (demo) {
  const p1 = rosterById(demo[1]) || choice(ROSTER), p2 = rosterById(demo[2]) || choice(ROSTER);
  go(new FightScene({ p1, p2, mode: 'cpu', ai: [new AI(2), new AI(2)], stage: STAGES[+(demo[3] || 0) % STAGES.length], onEnd: () => go(new TitleScene()) }));
} else if (!scene) go(new TitleScene());
// Avance rapide pour le débogage : #demo=...&ff=1200
if (/yog/.test(location.hash) && scene.fight) {
  const F = scene.fight.f;
  F[0].x = 260; F[1].x = 760;
  F[0].startMove(F[0].def.moves.yogurt, scene.fight);
  F[1].sticky = 300;
}
const ff = /ff=(\d+)/.exec(location.hash || '');
if (ff) for (let i = 0; i < +ff[1]; i++) { scene.update(); Input.endFrame(); }
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  // Quand une nouvelle version du jeu est installée, on recharge une fois
  // la page pour l'utiliser immédiatement.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(() => {});
  });
}
