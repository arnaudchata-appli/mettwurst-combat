'use strict';
// ---------------------------------------------------------------------------
// Interface : textes, boutons, menus, manette tactile
// ---------------------------------------------------------------------------
const UI = (() => {
  const FONT = 'Impact, "Arial Black", "Franklin Gothic Heavy", "Segoe UI Black", sans-serif';

  function text(ctx, str, x, y, size, color = '#fff', align = 'center', o = {}) {
    ctx.font = `900 ${Math.round(size)}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (o.stroke !== false) {
      ctx.lineWidth = o.sw || Math.max(3, size * 0.14);
      ctx.strokeStyle = o.stroke || '#1a0a05';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    if (o.grad) {
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      g.addColorStop(0, '#fff8c4'); g.addColorStop(0.45, '#ffc107'); g.addColorStop(1, '#e64a19');
      ctx.fillStyle = g;
    } else ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function wrap(ctx, str, x, y, maxW, size, color, lh = 1.3, align = 'center') {
    ctx.font = `600 ${size}px "Segoe UI", Roboto, Arial, sans-serif`;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
    return lines.length;
  }

  function button(ctx, b, focused, t) {
    const pulse = focused ? 1 + Math.sin(t * 0.15) * 0.03 : 1;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.scale(pulse, pulse);
    roundRectPath(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 12);
    const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2);
    if (b.disabled) { g.addColorStop(0, '#555'); g.addColorStop(1, '#333'); }
    else if (focused) { g.addColorStop(0, '#ffca28'); g.addColorStop(1, '#e65100'); }
    else { g.addColorStop(0, '#8d2b1a'); g.addColorStop(1, '#4a120a'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = focused ? '#fff3c4' : '#ffab40'; ctx.stroke();
    text(ctx, b.label, 0, 1, b.size || Math.min(30, b.h * 0.52), focused ? '#fff' : '#ffe0b2');
    ctx.restore();
  }

  const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

  class Menu {
    constructor(items, opts = {}) {
      this.items = items; this.focus = opts.focus || 0; this.onBack = opts.onBack || null;
      this.horizontal = !!opts.horizontal;
    }
    update() {
      const n = this.items.length;
      for (const a of Input.actions) {
        const prev = this.horizontal ? 'left' : 'up', next = this.horizontal ? 'right' : 'down';
        if (a === prev || a === (this.horizontal ? 'up' : 'left')) { this.focus = (this.focus - 1 + n) % n; Sound.play('select'); }
        else if (a === next || a === (this.horizontal ? 'down' : 'right')) { this.focus = (this.focus + 1) % n; Sound.play('select'); }
        else if (a === 'confirm') { this.activate(this.focus); return true; }
        else if ((a === 'back' || a === 'gpback') && this.onBack) { Sound.play('back'); this.onBack(); return true; }
      }
      for (const p of Input.taps) {
        for (let i = 0; i < n; i++) {
          if (inside(p, this.items[i])) { this.focus = i; this.activate(i); return true; }
        }
      }
      return false;
    }
    activate(i) {
      const it = this.items[i];
      if (it.disabled) { Sound.play('back'); return; }
      Sound.play('confirm');
      it.action();
    }
    draw(ctx, t) {
      this.items.forEach((b, i) => button(ctx, b, i === this.focus, t));
    }
  }

  function drawTouch(ctx) {
    const L = Input.L, pad = Input.pad;
    ctx.save();
    const d = L.dpad;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(20,8,4,0.6)';
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 3; ctx.stroke();
    const arrows = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [k, ax, ay] of arrows) {
      const cx = d.x + ax * d.r * 0.6, cy = d.y + ay * d.r * 0.6, s = d.r * 0.22;
      ctx.fillStyle = pad[k] ? '#ffca28' : '#fff3e0';
      ctx.beginPath();
      ctx.moveTo(cx + ax * s, cy + ay * s);
      ctx.lineTo(cx - ay * s - ax * s * 0.6, cy + ax * s - ay * s * 0.6);
      ctx.lineTo(cx + ay * s - ax * s * 0.6, cy - ax * s - ay * s * 0.6);
      ctx.closePath(); ctx.fill();
    }
    for (const b of L.buttons) {
      ctx.globalAlpha = pad[b.id] ? 0.85 : 0.5;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (pad[b.id] ? 0.93 : 1), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = pad[b.id] ? 1 : 0.8;
      text(ctx, b.label, b.x, b.y + 1, b.r * (b.label.length > 5 ? 0.34 : 0.42), '#fff');
    }
    ctx.restore();
  }

  function drawPauseButton(ctx) {
    const p = Input.L.pause;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = 'rgba(20,8,4,0.8)';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x - 7, p.y - 8, 5, 16); ctx.fillRect(p.x + 2, p.y - 8, 5, 16);
    ctx.restore();
  }

  function logo(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // halo de flammes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = -6; i <= 6; i++) {
      const fx = i * 42, h = 70 + Math.sin(t * 0.12 + i * 1.7) * 22 + (6 - Math.abs(i)) * 6;
      const g = ctx.createLinearGradient(0, 30, 0, 30 - h - 40);
      g.addColorStop(0, 'rgba(255,90,0,0.55)'); g.addColorStop(1, 'rgba(255,220,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(fx - 34, 34);
      ctx.quadraticCurveTo(fx - 12 + Math.sin(t * 0.2 + i) * 8, -h * 0.5, fx, -h);
      ctx.quadraticCurveTo(fx + 14, -h * 0.4, fx + 34, 34); ctx.fill();
    }
    ctx.restore();
    ctx.rotate(-0.04);
    text(ctx, 'METTWURST', 0, -8, 84, '#fff', 'center', { grad: true, sw: 12 });
    ctx.rotate(0.06);
    text(ctx, 'COMBAT', 0, 64, 62, '#ff5722', 'center', { sw: 10 });
    ctx.restore();
  }

  return { text, wrap, button, Menu, inside, drawTouch, drawPauseButton, logo, FONT };
})();
