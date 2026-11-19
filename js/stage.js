'use strict';
// ---------------------------------------------------------------------------
// Arènes : décor statique mis en cache + effets animés (braises, flammes...)
// Coordonnées "vue" : V.ox / V.oy = décalage de l'arène 960x540 dans l'écran
// ---------------------------------------------------------------------------
const STAGES = [
  {
    id: 'jardin', name: 'LE JARDIN DE MAMIE',
    sky: ['#24164a', '#7b2d5b', '#e5654a', '#f7b05b'], sun: '#ffd27a',
    hills: ['#5a2a48', '#3a1a34'], fence: '#6b4430', trees: true, lights: true, bottles: true,
  },
  {
    id: 'nuit', name: 'LE GRILL DE MINUIT',
    sky: ['#03040c', '#0c1430', '#232a58', '#4b3b6b'], moon: true, stars: true,
    hills: ['#161c3a', '#0b0f22'], fence: '#2e2638', city: true, lights: true, bottles: true,
  },
  {
    id: 'fournaise', name: 'LA FOURNAISE', inferno: true,
    sky: ['#120000', '#3a0404', '#7a1505', '#c8400a'], hills: ['#2a0505', '#160202'],
  },
];

const Stage = (() => {
  const cache = new Map();
  let amb = [];

  function clearCache() { cache.clear(); }

  function hillsPath(ctx, x0, x1, base, amp, freq, phase) {
    ctx.beginPath();
    ctx.moveTo(x0, ARENA_H + 400);
    for (let x = x0; x <= x1 + 20; x += 20) {
      ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(x * freq + phase)) - amp * 0.3 * Math.sin(x * freq * 2.7 + phase * 2));
    }
    ctx.lineTo(x1 + 20, ARENA_H + 400);
    ctx.closePath();
  }

  function drawBottle(ctx, x, y, color, cap, label) {
    ctx.save();
    ctx.translate(x, y);
    roundRectPath(ctx, -26, -120, 52, 120, 16);
    const g = ctx.createLinearGradient(-26, 0, 26, 0);
    g.addColorStop(0, darken(color, 0.55)); g.addColorStop(0.35, color); g.addColorStop(1, darken(color, 0.5));
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = cap;
    roundRectPath(ctx, -12, -150, 24, 34, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -150); ctx.lineTo(0, -166); ctx.lineTo(5, -150); ctx.fill();
    ctx.fillStyle = '#fff8e1'; roundRectPath(ctx, -22, -86, 44, 34, 5); ctx.fill();
    ctx.fillStyle = darken(color, 0.6); ctx.font = '900 11px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, -69);
    ctx.restore();
  }

  function drawFloorStatic(ctx, V, st) {
    const x0 = -V.ox - 10, x1 = ARENA_W + V.ox + 10;
    const top = GROUND - 12, bot = ARENA_H + V.oy + 10;
    ctx.fillStyle = st.inferno ? '#2a0602' : '#1a0a06';
    ctx.fillRect(x0, top, x1 - x0, bot - top);
    // braises
    const R = seeded(st.id.length * 77 + 3);
    const n = Math.round((x1 - x0) / 9);
    for (let i = 0; i < n; i++) {
      const x = x0 + R() * (x1 - x0), y = top + 8 + R() * (bot - top), r = 8 + R() * 16;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      const hot = R() < (st.inferno ? 0.7 : 0.45);
      g.addColorStop(0, hot ? '#ffb347' : '#3a2a26');
      g.addColorStop(0.5, hot ? '#e2470e' : '#221715');
      g.addColorStop(1, '#120705');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    // grille du barbecue en perspective
    const cx = ARENA_W / 2, vy = top - 320;
    ctx.lineCap = 'butt';
    for (let k = -22; k <= 22; k++) {
      const xb = cx + k * 70;
      const xt = cx + (xb - cx) * ((top - vy) / (bot - vy));
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(xt, top); ctx.lineTo(xb, bot); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,160,160,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xt - 1.5, top); ctx.lineTo(xb - 2, bot); ctx.stroke();
    }
    for (let i = 0; i <= 7; i++) {
      const y = top + Math.pow(i / 7, 1.6) * (bot - top);
      ctx.fillStyle = '#202020'; ctx.fillRect(x0, y - 2 - i * 0.5, x1 - x0, 4 + i);
      ctx.fillStyle = 'rgba(190,190,190,0.5)'; ctx.fillRect(x0, y - 2 - i * 0.5, x1 - x0, 1.5);
    }
    // rebord avant
    const lg = ctx.createLinearGradient(0, top - 6, 0, top + 6);
    lg.addColorStop(0, '#8a8a8a'); lg.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = lg; ctx.fillRect(x0, top - 4, x1 - x0, 8);
  }

  function drawStatic(ctx, st, V) {
    const W = V.w, H = V.h;
    const sky = ctx.createLinearGradient(0, 0, 0, V.oy + GROUND);
    st.sky.forEach((c, i) => sky.addColorStop(i / (st.sky.length - 1), c));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(V.ox, V.oy);
    const x0 = -V.ox, x1 = ARENA_W + V.ox;
    if (st.stars) {
      const R = seeded(99);
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`;
        ctx.fillRect(x0 + R() * (x1 - x0), -V.oy + R() * (V.oy + 300), R() * 2 + 0.6, R() * 2 + 0.6);
      }
    }
    if (st.sun) {
      const g = ctx.createRadialGradient(690, 230, 10, 690, 230, 160);
      g.addColorStop(0, 'rgba(255,230,150,0.9)'); g.addColorStop(0.3, 'rgba(255,170,90,0.35)'); g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g; ctx.fillRect(500, 60, 380, 340);
      ctx.fillStyle = st.sun; ctx.beginPath(); ctx.arc(690, 230, 52, 0, Math.PI * 2); ctx.fill();
    }
    if (st.moon) {
      ctx.fillStyle = 'rgba(255,250,220,0.15)'; ctx.beginPath(); ctx.arc(720, 110, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6d5'; ctx.beginPath(); ctx.arc(720, 110, 40, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,160,0.5)';
      ctx.beginPath(); ctx.arc(708, 100, 8, 0, Math.PI * 2); ctx.arc(732, 122, 6, 0, Math.PI * 2); ctx.fill();
    }
    if (st.inferno) {
      // dôme intérieur du barbecue
      const g = ctx.createRadialGradient(480, 420, 50, 480, 300, 700);
      g.addColorStop(0, 'rgba(255,90,0,0.55)'); g.addColorStop(1, 'rgba(40,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, -V.oy, x1 - x0, GROUND + V.oy);
      ctx.strokeStyle = 'rgba(20,0,0,0.75)'; ctx.lineWidth = 14;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.ellipse(480, GROUND + 40, 600 + i * 140, 420 + i * 60, 0, Math.PI, 0); ctx.stroke();
      }
    }
    ctx.fillStyle = st.hills[0]; hillsPath(ctx, x0, x1, 330, 70, 0.006, 1); ctx.fill();
    ctx.fillStyle = st.hills[1]; hillsPath(ctx, x0, x1, 380, 60, 0.009, 4); ctx.fill();
    if (st.city) {
      const R = seeded(12);
      for (let x = x0; x < x1; x += 50 + R() * 40) {
        const w = 40 + R() * 50, h = 60 + R() * 120;
        ctx.fillStyle = '#0a0d1e'; ctx.fillRect(x, 380 - h, w, h + 40);
        for (let wy = 380 - h + 10; wy < 370; wy += 16) {
          for (let wx = x + 6; wx < x + w - 8; wx += 12) {
            if (R() < 0.35) { ctx.fillStyle = R() < 0.5 ? '#ffd54f' : '#ffb74d'; ctx.fillRect(wx, wy, 6, 8); }
          }
        }
      }
    }
    if (st.trees) {
      const R = seeded(31);
      for (let i = 0; i < 9; i++) {
        const x = x0 + (i + R() * 0.6) * ((x1 - x0) / 9), s = 0.8 + R() * 0.6;
        ctx.fillStyle = '#2a1424'; ctx.fillRect(x - 6 * s, 300, 12 * s, 100);
        ctx.fillStyle = i % 2 ? '#3b1a35' : '#331630';
        ctx.beginPath();
        ctx.arc(x, 290 - 20 * s, 45 * s, 0, Math.PI * 2);
        ctx.arc(x - 34 * s, 300, 32 * s, 0, Math.PI * 2);
        ctx.arc(x + 34 * s, 302, 34 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (st.fence) {
      for (let x = x0 - 20; x < x1 + 20; x += 34) {
        ctx.fillStyle = st.fence;
        ctx.beginPath(); ctx.moveTo(x, 455); ctx.lineTo(x, 330); ctx.lineTo(x + 14, 318); ctx.lineTo(x + 28, 330); ctx.lineTo(x + 28, 455); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 22, 330, 6, 125);
      }
      ctx.fillStyle = darken(st.fence, 0.7);
      ctx.fillRect(x0 - 20, 352, x1 - x0 + 40, 12); ctx.fillRect(x0 - 20, 418, x1 - x0 + 40, 12);
    }
    if (st.bottles) {
      drawBottle(ctx, 58, GROUND - 12, '#c62828', '#b71c1c', 'KETCHUP');
      drawBottle(ctx, ARENA_W - 58, GROUND - 12, '#f9c623', '#f57f17', 'MOUTARDE');
    }
    drawFloorStatic(ctx, V, st);
    ctx.restore();
  }

  function getCanvas(st, V, canvas) {
    const key = `${st.id}:${canvas.width}x${canvas.height}`;
    let c = cache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = canvas.width; c.height = canvas.height;
      const x = c.getContext('2d');
      x.setTransform(V.scale, 0, 0, V.scale, 0, 0);
      drawStatic(x, st, V);
      cache.set(key, c);
    }
    return c;
  }

  // Fond complet (en coordonnées vue)
  function drawBack(ctx, st, V, canvas, t) {
    ctx.drawImage(getCanvas(st, V, canvas), 0, 0, V.w, V.h);
    ctx.save();
    ctx.translate(V.ox, V.oy);
    const x0 = -V.ox, x1 = ARENA_W + V.ox;
    if (st.inferno) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const x = x0 + (i / 13) * (x1 - x0), h = 150 + Math.sin(t * 0.05 + i * 1.3) * 50 + Math.sin(t * 0.13 + i) * 25;
        const g = ctx.createLinearGradient(0, GROUND - 12, 0, GROUND - 12 - h);
        g.addColorStop(0, 'rgba(255,80,0,0.55)'); g.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 60, GROUND - 12);
        ctx.quadraticCurveTo(x - 30 + Math.sin(t * 0.1 + i) * 20, GROUND - 12 - h * 0.6, x, GROUND - 12 - h);
        ctx.quadraticCurveTo(x + 30, GROUND - 12 - h * 0.5, x + 60, GROUND - 12); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (st.lights) {
      // guirlande guinguette
      const poles = [x0 + 20, 180, 480, 780, x1 - 20];
      for (let i = 0; i < poles.length - 1; i++) {
        const a = poles[i], b = poles[i + 1], sag = 40;
        ctx.strokeStyle = 'rgba(20,10,10,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a, 130); ctx.quadraticCurveTo((a + b) / 2, 130 + sag * 2, b, 130); ctx.stroke();
        const nb = Math.max(3, Math.round((b - a) / 45));
        for (let k = 1; k < nb; k++) {
          const u = k / nb, x = lerp(a, b, u), y = 130 + 4 * sag * u * (1 - u) + 6;
          const col = ['255,214,79', '255,138,101', '129,212,250', '174,213,129'][(i * 7 + k) % 4];
          const fl = 0.65 + 0.35 * Math.sin(t * 0.07 + k * 1.9 + i);
          ctx.fillStyle = `rgba(${col},${0.22 * fl})`;
          ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(${col},${0.7 + 0.3 * fl})`;
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // Lueur des braises + flammèches au sol (en coordonnées arène)
  function drawFloorFx(ctx, st, V, t) {
    const x0 = -V.ox, x1 = ARENA_W + V.ox, top = GROUND - 12, bot = ARENA_H + V.oy;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.04);
    const g = ctx.createLinearGradient(0, top - 60, 0, bot);
    g.addColorStop(0, 'rgba(255,90,20,0)');
    g.addColorStop(0.25, `rgba(255,90,20,${(st.inferno ? 0.22 : 0.12) + 0.06 * pulse})`);
    g.addColorStop(1, `rgba(255,60,10,${0.1 + 0.05 * pulse})`);
    ctx.fillStyle = g; ctx.fillRect(x0, top - 60, x1 - x0, bot - top + 60);
    for (const p of amb) {
      const a = p.life / p.max;
      if (p.type === 'tongue') {
        const h = p.size * Math.sin(Math.PI * (1 - a));
        const fg = ctx.createLinearGradient(0, p.y, 0, p.y - h);
        fg.addColorStop(0, 'rgba(255,120,20,0.8)'); fg.addColorStop(1, 'rgba(255,230,90,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.moveTo(p.x - 9, p.y); ctx.quadraticCurveTo(p.x + Math.sin(t * 0.3 + p.x) * 6, p.y - h * 0.7, p.x, p.y - h);
        ctx.quadraticCurveTo(p.x + 4, p.y - h * 0.5, p.x + 9, p.y); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,${150 + (a * 80) | 0},50,${a})`;
        ctx.fillRect(p.x, p.y, 2.5, 2.5);
      }
    }
    ctx.restore();
  }

  function update(st, V) {
    const x0 = -V.ox, x1 = ARENA_W + V.ox;
    const rate = st.inferno ? 0.5 : 0.25;
    if (Math.random() < rate) amb.push({ type: 'ember', x: rand(x0, x1), y: GROUND + rand(-5, 40), vx: rand(-15, 15), vy: rand(-90, -40), life: 120, max: 120 });
    if (Math.random() < rate * 0.8) amb.push({ type: 'tongue', x: rand(x0, x1), y: GROUND - 8 + rand(0, 50), size: rand(18, st.inferno ? 60 : 38), life: 30, max: 30 });
    for (const p of amb) {
      p.life--;
      if (p.type === 'ember') { p.x += (p.vx + Math.sin(p.life * 0.1) * 20) * STEP; p.y += p.vy * STEP; }
    }
    amb = amb.filter((p) => p.life > 0);
    if (amb.length > 300) amb.splice(0, amb.length - 300);
  }

  return { clearCache, drawBack, drawFloorFx, update };
})();
