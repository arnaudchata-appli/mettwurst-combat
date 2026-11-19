'use strict';
// ---------------------------------------------------------------------------
// Entrées : clavier, écran tactile (manette virtuelle) et manettes physiques
// ---------------------------------------------------------------------------
const Input = (() => {
  const keys = new Set();
  const pointers = new Map();
  let actions = [];   // actions de menu de la frame : up/down/left/right/confirm/back/gpback/pause
  let taps = [];      // appuis (coordonnées vue)
  let touchActive = false;
  let pad = blank();
  const gp = [blank(), blank()];
  const L = { dpad: { x: 0, y: 0, r: 90 }, buttons: [], pause: { x: 0, y: 0, r: 22 } };

  function blank() {
    return { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, special: false, yogurt: false };
  }

  const KEY_ACTIONS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm', KeyJ: 'confirm',
    Escape: 'back', Backspace: 'back', KeyP: 'pause',
  };
  const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace']);

  window.addEventListener('keydown', (e) => {
    Sound.init();
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!keys.has(e.code) && KEY_ACTIONS[e.code]) {
      actions.push(KEY_ACTIONS[e.code]);
      if (e.code === 'Escape') actions.push('pause');
    }
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pointers.clear(); });

  let toView = (x, y) => ({ x, y });
  function attach(canvas, converter) {
    toView = converter;
    const down = (e) => {
      e.preventDefault();
      Sound.init();
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (!touchActive) { touchActive = true; if (Input.onFirstTouch) Input.onFirstTouch(); }
      }
      const p = toView(e.clientX, e.clientY);
      pointers.set(e.pointerId, p);
      taps.push(p);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    };
    const move = (e) => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, toView(e.clientX, e.clientY)); };
    const up = (e) => { pointers.delete(e.pointerId); };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function layout(V) {
    const r = Math.min(V.h * 0.17, 88);
    L.dpad = { x: 26 + r * 1.15, y: V.h - r * 1.25, r };
    const br = Math.min(V.h * 0.085, 46);
    const bx = V.w - 26, by = V.h - 20;
    L.buttons = [
      { id: 'punch', label: 'POING', x: bx - br * 3.2, y: by - br * 1.2, r: br, color: '#e53935' },
      { id: 'kick', label: 'PIED', x: bx - br * 1.05, y: by - br * 2.2, r: br, color: '#fb8c00' },
      { id: 'block', label: 'GARDE', x: bx - br * 5.4, y: by - br * 1.0, r: br * 0.88, color: '#1e88e5' },
      { id: 'special', label: 'SPÉCIAL', x: bx - br * 2.6, y: by - br * 3.6, r: br * 0.95, color: '#8e24aa' },
      { id: 'yogurt', label: 'YAOURT', x: bx - br * 4.6, y: by - br * 3.2, r: br * 0.88, color: '#90a4ae' },
    ];
    L.pause = { x: V.w / 2, y: V.oy + 102, r: 20 };
  }

  function computePad() {
    pad = blank();
    if (!touchActive) return;
    const d = L.dpad;
    for (const p of pointers.values()) {
      const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy);
      if (dist < d.r * 1.7 && p.x < d.x + d.r * 1.8) {
        if (dist < d.r * 0.2) continue;
        const c = dx / dist, s = dy / dist;
        if (c > 0.42) pad.right = true;
        if (c < -0.42) pad.left = true;
        if (s < -0.55) pad.up = true;
        if (s > 0.55) pad.down = true;
        continue;
      }
      for (const b of L.buttons) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.22) pad[b.id] = true;
      }
    }
  }

  function pollPads() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    let n = 0;
    for (const g of list) {
      if (!g || n > 1) continue;
      const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      const s = {
        left: b(14) || ax < -0.5, right: b(15) || ax > 0.5, up: b(12) || ay < -0.6, down: b(13) || ay > 0.6,
        punch: b(2), kick: b(0), special: b(1), yogurt: b(3), block: b(4) || b(5) || b(6) || b(7),
        start: b(9), select: b(8),
      };
      const o = gp[n];
      if (s.up && !o.up) actions.push('up');
      if (s.down && !o.down) actions.push('down');
      if (s.left && !o.left) actions.push('left');
      if (s.right && !o.right) actions.push('right');
      if (s.kick && !o.kick) actions.push('confirm');
      if (s.special && !o.special) actions.push('gpback');
      if ((s.start && !o.start) || (s.select && !o.select)) actions.push('pause');
      gp[n] = s;
      n++;
    }
    for (; n < 2; n++) gp[n] = blank();
  }

  function poll() {
    pollPads();
    computePad();
  }

  function endFrame() {
    actions = [];
    taps = [];
  }

  function merge(o, s) {
    for (const k in o) if (s[k]) o[k] = true;
  }

  // État d'un joueur. twoP = mode 2 joueurs sur le même clavier.
  function player(slot, twoP) {
    const o = blank();
    const any = (...c) => c.some((k) => keys.has(k));
    if (!twoP) {
      o.left = any('ArrowLeft', 'KeyA'); o.right = any('ArrowRight', 'KeyD');
      o.up = any('ArrowUp', 'KeyW', 'Space'); o.down = any('ArrowDown', 'KeyS');
      o.punch = any('KeyJ', 'KeyF'); o.kick = any('KeyK', 'KeyG');
      o.block = any('KeyL', 'KeyH', 'ShiftLeft', 'ShiftRight'); o.special = any('KeyI', 'KeyT', 'KeyU');
      o.yogurt = any('KeyO', 'KeyY');
      merge(o, pad); merge(o, gp[0]); merge(o, gp[1]);
    } else if (slot === 0) {
      o.left = any('KeyA'); o.right = any('KeyD'); o.up = any('KeyW'); o.down = any('KeyS');
      o.punch = any('KeyF'); o.kick = any('KeyG'); o.block = any('KeyH'); o.special = any('KeyT'); o.yogurt = any('KeyY');
      merge(o, pad); merge(o, gp[0]);
    } else {
      o.left = any('ArrowLeft'); o.right = any('ArrowRight'); o.up = any('ArrowUp'); o.down = any('ArrowDown');
      o.punch = any('Numpad1', 'KeyB'); o.kick = any('Numpad2', 'KeyN');
      o.block = any('Numpad3', 'KeyM'); o.special = any('Numpad0', 'Numpad5', 'Comma');
      o.yogurt = any('Numpad4', 'Period');
      merge(o, gp[1]);
    }
    return o;
  }

  return {
    attach, layout, poll, endFrame, player, L,
    get actions() { return actions; },
    get taps() { return taps; },
    get touchActive() { return touchActive; },
    get pad() { return pad; },
    onFirstTouch: null,
    forceTouch() { touchActive = true; },
  };
})();
