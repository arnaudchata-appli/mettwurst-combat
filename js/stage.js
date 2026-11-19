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
  {
    id: 'autoroute', name: "LA BRETELLE D'AUTOROUTE", highway: true,
    sky: ['#0b1636', '#33397a', '#c4587a', '#ffad66'], stars: true, city: true,
    hills: ['#2a2346', '#1a1630'],
  },
];

const Stage = (() => {
  const cache = new Map();
  let amb = [];
  let cars = [];

  // ----------------------- Échangeur d'autoroute --------------------------
  const DECK = 190; // niveau de la chaussée du pont
  const SIGN_X = 600; // panneau suspendu sous le pont
  const LAMPS = [70, 330, 860]; // lampadaires (x arène)
  const rampOf = (x0, x1) => [[x0 - 60, DECK + 22], [ARENA_W * 0.3, DECK + 120], [x1 + 90, 380]];
  function rampPt(R, t) {
    const u = 1 - t;
    return [u * u * R[0][0] + 2 * u * t * R[1][0] + t * t * R[2][0], u * u * R[0][1] + 2 * u * t * R[1][1] + t * t * R[2][1]];
  }
  function rampTan(R, t) {
    const u = 1 - t;
    return [2 * u * (R[1][0] - R[0][0]) + 2 * t * (R[2][0] - R[1][0]), 2 * u * (R[1][1] - R[0][1]) + 2 * t * (R[2][1] - R[1][1])];
  }
  function concrete(ctx, x, w) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#4a4752'); g.addColorStop(0.4, '#9893a0'); g.addColorStop(1, '#3d3a44');
    return g;
  }
  function drawCone(ctx, x, y) {
    ctx.fillStyle = '#212121'; ctx.fillRect(x - 20, y - 6, 40, 6);
    ctx.beginPath(); ctx.moveTo(x - 15, y - 6); ctx.lineTo(x - 4, y - 56); ctx.lineTo(x + 4, y - 56); ctx.lineTo(x + 15, y - 6); ctx.closePath();
    ctx.fillStyle = '#ff6d00'; ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.moveTo(x - 11, y - 20); ctx.lineTo(x - 8, y - 32); ctx.lineTo(x + 8, y - 32); ctx.lineTo(x + 11, y - 20); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 40); ctx.lineTo(x - 5, y - 46); ctx.lineTo(x + 5, y - 46); ctx.lineTo(x + 6, y - 40); ctx.fill();
  }

  function drawHighwayStatic(ctx, x0, x1) {
    // piliers du pont
    for (let x = x0 + 70; x < x1; x += 280) {
      ctx.fillStyle = concrete(ctx, x - 22, 44); ctx.fillRect(x - 22, DECK + 28, 44, 300);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 22, DECK + 28, 44, 12);
    }
    // tablier du pont
    const dg = ctx.createLinearGradient(0, DECK, 0, DECK + 30);
    dg.addColorStop(0, '#8d8994'); dg.addColorStop(1, '#423f48');
    ctx.fillStyle = dg; ctx.fillRect(x0 - 10, DECK, x1 - x0 + 20, 30);
    ctx.fillStyle = '#2b2930'; ctx.fillRect(x0 - 10, DECK + 28, x1 - x0 + 20, 4);
    // panneau autoroutier suspendu
    const sx = SIGN_X, sy = DECK + 38;
    ctx.fillStyle = '#5f5b66'; ctx.fillRect(sx + 30, DECK + 30, 6, 10); ctx.fillRect(sx + 170, DECK + 30, 6, 10);
    roundRectPath(ctx, sx, sy, 210, 60, 6);
    ctx.fillStyle = '#1d4fa8'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#c62828'; roundRectPath(ctx, sx + 10, sy + 9, 50, 22, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 15px Impact, Arial Black, sans-serif';
    ctx.fillText('A 42', sx + 35, sy + 21);
    ctx.font = '900 17px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'left'; ctx.fillText('BARBECUE  ↗', sx + 70, sy + 21);
    ctx.font = '700 13px Arial, sans-serif';
    ctx.fillText('SORTIE 42  •  Grillades 500 m', sx + 12, sy + 44);
    // bretelle
    const R = rampOf(x0, x1);
    for (const t of [0.3, 0.52, 0.72, 0.9]) {
      const [x, y] = rampPt(R, t);
      ctx.fillStyle = concrete(ctx, x - 15, 30); ctx.fillRect(x - 15, y + 12, 30, 460 - y);
    }
    const ramp = () => { ctx.beginPath(); ctx.moveTo(R[0][0], R[0][1]); ctx.quadraticCurveTo(R[1][0], R[1][1], R[2][0], R[2][1]); };
    ctx.lineCap = 'butt';
    ramp(); ctx.lineWidth = 30; ctx.strokeStyle = '#3a3740'; ctx.stroke();
    ctx.save(); ctx.translate(0, -3);
    ramp(); ctx.lineWidth = 22; ctx.strokeStyle = '#5c5963'; ctx.stroke();
    ramp(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([14, 12]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // lampadaires
    for (const x of LAMPS) {
      ctx.fillStyle = '#3b3842'; ctx.fillRect(x - 3, 300, 6, 138);
      ctx.strokeStyle = '#3b3842'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x, 306); ctx.quadraticCurveTo(x, 290, x + 30, 292); ctx.stroke();
      ctx.fillStyle = '#26232b'; roundRectPath(ctx, x + 22, 288, 26, 9, 4); ctx.fill();
    }
    // glissière de sécurité
    for (let x = x0 - 10; x < x1 + 10; x += 44) {
      ctx.fillStyle = '#5a5862'; ctx.fillRect(x, 414, 6, 44);
      ctx.fillStyle = '#ffab00'; ctx.fillRect(x, 416, 6, 5);
    }
    const gr = ctx.createLinearGradient(0, 420, 0, 438);
    gr.addColorStop(0, '#e0e0e6'); gr.addColorStop(0.5, '#8a8a94'); gr.addColorStop(1, '#c4c4cc');
    ctx.fillStyle = gr; ctx.fillRect(x0 - 10, 422, x1 - x0 + 20, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 - 10, 438, x1 - x0 + 20, 3);
    drawCone(ctx, 64, GROUND - 10);
    drawCone(ctx, 104, GROUND - 10);
    drawCone(ctx, ARENA_W - 70, GROUND - 10);
  }

  function drawCar(ctx, c) {
    ctx.save();
    ctx.fillStyle = c.color;
    roundRectPath(ctx, -34, -20, 68, 14, 5); ctx.fill();
    ctx.fillStyle = darken(c.color, 0.75);
    roundRectPath(ctx, -18, -31, 36, 13, 6); ctx.fill();
    ctx.fillStyle = 'rgba(160,210,255,0.75)';
    ctx.fillRect(-14, -28, 13, 8); ctx.fillRect(1, -28, 13, 8);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-20, -6, 6, 0, Math.PI * 2); ctx.arc(20, -6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createRadialGradient(36, -14, 1, 36, -14, 46);
    hg.addColorStop(0, 'rgba(255,245,190,0.75)'); hg.addColorStop(1, 'rgba(255,245,190,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(34, -14); ctx.lineTo(86, -30); ctx.lineTo(86, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,40,30,0.5)'; ctx.beginPath(); ctx.arc(-34, -14, 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff9c4'; ctx.fillRect(31, -17, 4, 5);
    ctx.fillStyle = '#ff1744'; ctx.fillRect(-35, -17, 4, 5);
    ctx.restore();
  }

  function drawHighwayDynamic(ctx, x0, x1, t) {
    const R = rampOf(x0, x1);
    for (const c of cars) {
      ctx.save();
      if (c.lane === 'ramp') {
        const [x, y] = rampPt(R, c.t), [tx, ty] = rampTan(R, c.t);
        ctx.translate(x, y - 12);
        let a;
        if (tx < 0) { ctx.scale(-1, 1); a = Math.atan2(ty, -tx); } else a = Math.atan2(ty, tx);
        ctx.rotate(a);
        ctx.scale(0.85, 0.85);
      } else {
        ctx.translate(c.x, DECK + (c.dir > 0 ? 2 : -2));
        ctx.scale(c.dir * 0.8, 0.8);
      }
      drawCar(ctx, c);
      ctx.restore();
    }
    // parapet du pont devant les voitures
    ctx.fillStyle = '#7d7984'; ctx.fillRect(x0 - 10, DECK - 9, x1 - x0 + 20, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x0 - 10, DECK - 9, x1 - x0 + 20, 2);
    // lueur des lampadaires (sodium)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    LAMPS.forEach((x, i) => {
      const fl = 0.85 + 0.15 * Math.sin(t * 0.05 + i * 2.3);
      const g = ctx.createRadialGradient(x + 35, 298, 2, x + 35, 360, 150);
      g.addColorStop(0, `rgba(255,170,60,${0.55 * fl})`); g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x + 26, 296); ctx.lineTo(x - 50, 470); ctx.lineTo(x + 120, 470); ctx.lineTo(x + 44, 296); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,220,150,${fl})`;
      ctx.fillRect(x + 25, 296, 20, 3);
    });
    ctx.restore();
  }

  function updateCars(st, V) {
    if (!st.highway) { cars.length = 0; return; }
    const x0 = -V.ox, x1 = ARENA_W + V.ox;
    const COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#eceff1', '#8e24aa', '#fb8c00', '#37474f'];
    if (Math.random() < 0.018) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      cars.push({ lane: 'over', dir, x: dir > 0 ? x0 - 80 : x1 + 80, v: rand(220, 380), color: choice(COLORS) });
    }
    if (Math.random() < 0.007 && !cars.some((c) => c.lane === 'ramp' && c.t < 0.2)) {
      cars.push({ lane: 'ramp', t: 0, v: rand(0.12, 0.18), color: choice(COLORS) });
    }
    for (const c of cars) {
      if (c.lane === 'ramp') c.t += c.v * STEP;
      else c.x += c.dir * c.v * STEP;
    }
    cars = cars.filter((c) => (c.lane === 'ramp' ? c.t < 1.02 : c.x > x0 - 120 && c.x < x1 + 120));
  }

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
    if (st.highway) drawHighwayStatic(ctx, x0, x1);
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
    if (st.highway) drawHighwayDynamic(ctx, x0, x1, t);
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
    updateCars(st, V);
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

  // Vignette d'une arène (partie centrale 960x540 du décor statique)
  function drawThumb(ctx, st, V, canvas, x, y, w, h) {
    const c = getCanvas(st, V, canvas);
    ctx.drawImage(c, V.ox * V.scale, V.oy * V.scale, ARENA_W * V.scale, ARENA_H * V.scale, x, y, w, h);
  }

  return { clearCache, drawBack, drawFloorFx, update, drawThumb };
})();
