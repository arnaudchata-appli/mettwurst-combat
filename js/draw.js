'use strict';
// ---------------------------------------------------------------------------
// Dessin procédural des combattants (aucune image : tout est vectoriel)
// Repère : origine aux pieds, personnage tourné vers la droite, y négatif = haut
// ---------------------------------------------------------------------------

function capsulePath(ctx, w, h) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(-r, -r);
  ctx.lineTo(-r, -h + r);
  ctx.arc(0, -h + r, r, Math.PI, 0);
  ctx.lineTo(r, -r);
  ctx.arc(0, -r, r, 0, Math.PI);
  ctx.closePath();
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hGrad(ctx, w, col) {
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, col.dark);
  g.addColorStop(0.28, col.light);
  g.addColorStop(0.55, col.body);
  g.addColorStop(1, col.dark);
  return g;
}

// Remplit une forme avec dégradé, décor découpé, ombrage et contour
function paintBlob(ctx, pathFn, col, w, h, decor) {
  pathFn();
  ctx.fillStyle = hGrad(ctx, w, col);
  ctx.fill();
  ctx.save();
  pathFn();
  ctx.clip();
  if (decor) decor();
  const vg = ctx.createLinearGradient(0, -h, 0, 0);
  vg.addColorStop(0, 'rgba(255,255,255,0.14)');
  vg.addColorStop(0.6, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vg;
  ctx.fillRect(-w, -h - 30, w * 2, h + 60);
  ctx.restore();
  pathFn();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(30,10,5,0.8)';
  ctx.stroke();
}

function grillMarks(ctx, w, h, n, from = 0.22, gap = 0.22) {
  ctx.strokeStyle = 'rgba(35,12,4,0.55)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = -h * (from + i * gap);
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 6, y + 12);
    ctx.lineTo(w / 2 + 6, y - 12);
    ctx.stroke();
  }
}

function specks(ctx, w, h, seed, n, colors, size) {
  const R = seeded(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc((R() - 0.5) * w, -R() * h, size * (0.5 + R()), 0, Math.PI * 2);
    ctx.fill();
  }
}

function shine(ctx, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.22, -h * 0.62, w * 0.08, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

const PAINTERS = {
  mett(ctx, c, w, h) {
    const path = () => capsulePath(ctx, w, h);
    paintBlob(ctx, path, c.colors, w, h, () => {
      specks(ctx, w, h, 7, 26, ['#fbe3d6', '#fbe3d6', '#2a1712'], 2.4);
      grillMarks(ctx, w, h, 3, 0.2, 0.2);
      shine(ctx, w, h);
    });
    // noeud de la saucisse
    ctx.fillStyle = c.colors.dark;
    ctx.beginPath(); ctx.ellipse(0, -h - 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8d9b5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -h - 2); ctx.lineTo(6, -h - 5); ctx.stroke();
  },
  chipo(ctx, c, w, h) {
    const path = () => capsulePath(ctx, w, h);
    paintBlob(ctx, path, c.colors, w, h, () => {
      grillMarks(ctx, w, h, 4, 0.18, 0.18);
      specks(ctx, w, h, 3, 10, ['#8a4a2e'], 1.6);
      shine(ctx, w, h);
    });
    ctx.fillStyle = c.colors.dark;
    ctx.beginPath(); ctx.ellipse(0, -h - 2, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  },
  merguez(ctx, c, w, h) {
    const path = () => capsulePath(ctx, w, h);
    paintBlob(ctx, path, c.colors, w, h, () => {
      specks(ctx, w, h, 11, 30, ['#3b0d05', '#e0702f', '#3b0d05'], 1.8);
      grillMarks(ctx, w, h, 4, 0.18, 0.19);
      shine(ctx, w, h);
    });
    ctx.fillStyle = c.colors.dark;
    ctx.beginPath(); ctx.ellipse(0, -h - 2, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  },
  boeuf(ctx, c, w, h) {
    // os
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w * 0.15, -h * 0.7); ctx.lineTo(-w * 0.42, -h - 30); ctx.stroke();
    ctx.fillStyle = '#efe6d2';
    ctx.beginPath(); ctx.arc(-w * 0.42 - 9, -h - 34, 11, 0, Math.PI * 2); ctx.arc(-w * 0.42 + 8, -h - 40, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,70,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w * 0.18, -h * 0.74); ctx.lineTo(-w * 0.4, -h - 22); ctx.stroke();
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 10, 0);
      ctx.bezierCurveTo(-w / 2 - 14, -h * 0.3, -w / 2 - 6, -h * 0.88, -w * 0.12, -h);
      ctx.bezierCurveTo(w * 0.3, -h * 1.06, w / 2 + 12, -h * 0.72, w / 2, -h * 0.36);
      ctx.bezierCurveTo(w / 2 - 4, -h * 0.04, w * 0.2, 6, -w / 2 + 10, 0);
      ctx.closePath();
    };
    // gras périphérique
    path(); ctx.lineWidth = 16; ctx.strokeStyle = '#f1dcb4'; ctx.stroke();
    paintBlob(ctx, path, c.colors, w, h, () => {
      ctx.strokeStyle = 'rgba(255,225,215,0.5)'; ctx.lineWidth = 3;
      const R = seeded(5);
      for (let i = 0; i < 9; i++) {
        const y = -R() * h, x = (R() - 0.5) * w;
        ctx.beginPath(); ctx.moveTo(x - 18, y);
        ctx.quadraticCurveTo(x, y - 10 + R() * 20, x + 22, y + (R() - 0.5) * 10); ctx.stroke();
      }
      grillMarks(ctx, w * 1.1, h, 3, 0.25, 0.24);
    });
  },
  brochette(ctx, c, w, h) {
    // pique
    ctx.strokeStyle = '#c8a165'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -h - 30); ctx.stroke();
    ctx.fillStyle = '#c8a165';
    ctx.beginPath(); ctx.moveTo(-3, -h - 30); ctx.lineTo(0, -h - 46); ctx.lineTo(3, -h - 30); ctx.fill();
    const chunks = [['onion', 20], ['beef', 28], ['pepper', 22], ['beef', 30], ['tomato', 22], ['beef', 28]];
    let y = 0;
    chunks.forEach(([t, hh], i) => {
      const y0 = y - hh;
      if (t === 'beef') {
        const cw = w;
        roundRectPath(ctx, -cw / 2, y0 + 1, cw, hh - 2, 7);
        const g = ctx.createLinearGradient(-cw / 2, 0, cw / 2, 0);
        g.addColorStop(0, '#4a2412'); g.addColorStop(0.3, '#a8653e'); g.addColorStop(1, '#4a2412');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(25,8,2,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.save(); roundRectPath(ctx, -cw / 2, y0 + 1, cw, hh - 2, 7); ctx.clip();
        ctx.strokeStyle = 'rgba(30,10,3,0.6)'; ctx.lineWidth = 5;
        for (let k = -1; k < 2; k++) { ctx.beginPath(); ctx.moveTo(k * 22 - 10, y0 + hh); ctx.lineTo(k * 22 + 10, y0); ctx.stroke(); }
        ctx.restore();
      } else if (t === 'pepper') {
        const cw = w * 0.92;
        roundRectPath(ctx, -cw / 2, y0 + 1, cw, hh - 2, 9);
        const g = ctx.createLinearGradient(-cw / 2, 0, cw / 2, 0);
        g.addColorStop(0, '#1b5e20'); g.addColorStop(0.35, '#66bb6a'); g.addColorStop(1, '#1b5e20');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0d3010'; ctx.lineWidth = 2; ctx.stroke();
      } else if (t === 'onion') {
        const cw = w * 0.86;
        roundRectPath(ctx, -cw / 2, y0 + 1, cw, hh - 2, 8);
        ctx.fillStyle = '#f3e5f5'; ctx.fill(); ctx.strokeStyle = '#8e4f8e'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(142,79,142,0.6)'; ctx.lineWidth = 1.5;
        for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, y0 + hh / 2, cw / 2 - k * 7, hh / 2 - k * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
      } else if (t === 'tomato') {
        ctx.beginPath(); ctx.ellipse(0, y0 + hh / 2, w * 0.46, hh / 2 + 2, 0, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(-8, y0 + hh / 2 - 4, 2, 0, y0 + hh / 2, w * 0.5);
        g.addColorStop(0, '#ff8a80'); g.addColorStop(0.5, '#e53935'); g.addColorStop(1, '#8e0000');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#5a0000'; ctx.lineWidth = 2; ctx.stroke();
      }
      y = y0;
      if (i === 0) { /* rien */ }
    });
  },
  pilon(ctx, c, w, h) {
    // os
    ctx.strokeStyle = '#f3ead7'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -h * 0.75); ctx.lineTo(0, -h - 28); ctx.stroke();
    ctx.fillStyle = '#f3ead7';
    ctx.beginPath(); ctx.arc(-9, -h - 32, 11, 0, Math.PI * 2); ctx.arc(9, -h - 32, 11, 0, Math.PI * 2); ctx.fill();
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.bezierCurveTo(w * 0.35, -h * 0.95, w * 0.62, -h * 0.45, w * 0.45, -h * 0.1);
      ctx.bezierCurveTo(w * 0.3, h * 0.04, -w * 0.3, h * 0.04, -w * 0.45, -h * 0.1);
      ctx.bezierCurveTo(-w * 0.62, -h * 0.45, -w * 0.35, -h * 0.95, 0, -h);
      ctx.closePath();
    };
    paintBlob(ctx, path, c.colors, w, h, () => {
      specks(ctx, w, h, 21, 40, ['#8d4f17', '#f6d58f', '#a85e1c'], 2.6);
      grillMarks(ctx, w, h, 3, 0.2, 0.22);
      shine(ctx, w * 1.2, h);
    });
  },
  charbon(ctx, c, w, h, f) {
    const path = () => roundRectPath(ctx, -w / 2, -h, w, h, 26);
    const pulse = 0.6 + 0.4 * Math.sin((f ? f.anim : 0) * 0.12);
    paintBlob(ctx, path, c.colors, w, h, () => {
      specks(ctx, w, h, 9, 30, ['#1a1716', '#4a4440'], 4);
      ctx.save();
      ctx.strokeStyle = `rgba(255,${110 + 60 * pulse | 0},20,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.shadowColor = '#ff6d00'; ctx.shadowBlur = 12;
      const cracks = [
        [[-w * 0.4, -h * 0.2], [-w * 0.2, -h * 0.3], [-w * 0.25, -h * 0.45], [0, -h * 0.5]],
        [[w * 0.45, -h * 0.15], [w * 0.2, -h * 0.25], [w * 0.28, -h * 0.4]],
        [[-w * 0.1, -h * 0.05], [w * 0.05, -h * 0.18], [-w * 0.05, -h * 0.3]],
        [[w * 0.4, -h * 0.85], [w * 0.2, -h * 0.75]],
      ];
      for (const cr of cracks) {
        ctx.beginPath(); ctx.moveTo(cr[0][0], cr[0][1]);
        for (let i = 1; i < cr.length; i++) ctx.lineTo(cr[i][0], cr[i][1]);
        ctx.stroke();
      }
      ctx.restore();
    });
  },
};

const ACCESSORIES = {
  tyrol(ctx, c, bw, bh) {
    const y = -bh + 6;
    ctx.fillStyle = '#2e5d32';
    ctx.beginPath(); ctx.ellipse(0, y, 36, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22, y); ctx.lineTo(-16, y - 26); ctx.quadraticCurveTo(0, y - 34, 16, y - 26); ctx.lineTo(22, y); ctx.closePath();
    ctx.fillStyle = '#3a7a3f'; ctx.fill(); ctx.strokeStyle = '#173a1a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c62828'; ctx.fillRect(-21, y - 8, 42, 6);
    ctx.strokeStyle = '#fff8e1'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, y - 8); ctx.quadraticCurveTo(-30, y - 40, -12, y - 50); ctx.stroke();
  },
  headband(ctx, c, bw, bh, fx, fy, f) {
    const y = fy - 20, t = f ? f.anim : 0;
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(-bw / 2 - 2, y - 5, bw + 4, 10);
    ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      ctx.beginPath(); ctx.moveTo(-bw / 2, y);
      ctx.quadraticCurveTo(-bw / 2 - 18, y + 4 + Math.sin(t * 0.3 + k) * 6, -bw / 2 - 34, y + 8 + k * 8 + Math.sin(t * 0.25 + k * 2) * 8);
      ctx.stroke();
    }
  },
  moustache(ctx, c, bw, bh, fx, fy) {
    ctx.fillStyle = '#1a0a05';
    ctx.beginPath();
    ctx.moveTo(fx, fy + 9);
    ctx.quadraticCurveTo(fx - 12, fy + 4, fx - 20, fy + 14);
    ctx.quadraticCurveTo(fx - 10, fy + 12, fx, fy + 13);
    ctx.quadraticCurveTo(fx + 10, fy + 12, fx + 22, fy + 14);
    ctx.quadraticCurveTo(fx + 12, fy + 4, fx, fy + 9);
    ctx.fill();
  },
  brow(ctx, c, bw, bh, fx, fy) {
    ctx.strokeStyle = '#2a0808'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx - 22, fy - 18); ctx.lineTo(fx, fy - 10); ctx.lineTo(fx + 22, fy - 18); ctx.stroke();
  },
  flamecrown(ctx, c, bw, bh, fx, fy, f) {
    const t = f ? f.anim : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = -2; i <= 2; i++) {
      const x = i * 18, hh = 26 + Math.sin(t * 0.25 + i * 1.7) * 9 + (2 - Math.abs(i)) * 8;
      const g = ctx.createLinearGradient(0, -bh, 0, -bh - hh);
      g.addColorStop(0, 'rgba(255,90,0,0.9)'); g.addColorStop(1, 'rgba(255,230,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - 11, -bh + 4); ctx.quadraticCurveTo(x - 6, -bh - hh * 0.6, x, -bh - hh); ctx.quadraticCurveTo(x + 6, -bh - hh * 0.6, x + 11, -bh + 4); ctx.fill();
    }
    ctx.restore();
  },
};

function drawFace(ctx, c, x, y, expr, mouth) {
  ctx.save();
  ctx.translate(x, y);
  const boss = c.id === 'charbon';
  const ex = [-11, 11];
  ctx.lineCap = 'round';
  if (expr === 'ko') {
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 3;
    for (const e of ex) {
      ctx.beginPath(); ctx.moveTo(e - 5, -5); ctx.lineTo(e + 5, 5); ctx.moveTo(e + 5, -5); ctx.lineTo(e - 5, 5); ctx.stroke();
    }
  } else if (expr === 'hurt') {
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ex[0] - 6, -5); ctx.lineTo(ex[0] + 4, 0); ctx.lineTo(ex[0] - 6, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex[1] + 6, -5); ctx.lineTo(ex[1] - 4, 0); ctx.lineTo(ex[1] + 6, 5); ctx.stroke();
  } else if (expr === 'win') {
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 3;
    for (const e of ex) { ctx.beginPath(); ctx.arc(e, 2, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  } else if (expr === 'dizzy') {
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 2;
    for (const e of ex) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.4) {
        const r = a * 0.6;
        ctx.lineTo(e + Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
    }
  } else {
    for (const e of ex) {
      if (boss) {
        ctx.save(); ctx.shadowColor = '#ff6d00'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.ellipse(e, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(e, 0, 7.5, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#1a0a05'; ctx.beginPath(); ctx.arc(e + 3, 1, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e + 4.5, -1, 1.3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-20, -15); ctx.lineTo(-4, -9); ctx.moveTo(4, -9); ctx.lineTo(20, -15); ctx.stroke();
  }
  // bouche
  if (expr === 'win') {
    ctx.fillStyle = '#3a0a05'; ctx.beginPath(); ctx.arc(2, 13, 8, 0, Math.PI); ctx.fill();
  } else if (mouth > 0.3 || expr === 'hurt' || expr === 'ko') {
    const mh = expr === 'hurt' || expr === 'ko' ? 6 : 4 + 5 * mouth;
    ctx.fillStyle = '#3a0a05'; ctx.beginPath(); ctx.ellipse(3, 16, 8, mh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, 16 - mh + 1, 10, 3);
  } else if (expr === 'dizzy') {
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-6, 16); ctx.quadraticCurveTo(-2, 12, 2, 16); ctx.quadraticCurveTo(6, 20, 10, 16); ctx.stroke();
  } else {
    ctx.strokeStyle = boss ? '#ff8a00' : '#1a0a05'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-5, 16); ctx.quadraticCurveTo(3, 12, 11, 16); ctx.stroke();
  }
  ctx.restore();
}

function drawArm(ctx, sx, sy, hand, col, back) {
  const hx = sx + hand[0], hy = sy + hand[1];
  const mx = (sx + hx) / 2 - (hy - sy) * 0.12, my = (sy + hy) / 2 + 12 - Math.abs(hx - sx) * 0.05;
  ctx.strokeStyle = back ? darken(col.limb, 0.7) : col.limb;
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, hx, hy); ctx.stroke();
  // manique de barbecue
  ctx.fillStyle = back ? darken(col.mitt, 0.7) : col.mitt;
  ctx.beginPath(); ctx.arc(hx, hy, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + 3, hy - 9, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(hx, hy, 11, 0, Math.PI * 2); ctx.stroke();
}

function drawLeg(ctx, hx, hy, foot, col, back) {
  const fx = hx + foot[0], fy = hy + foot[1];
  ctx.strokeStyle = back ? darken(col.limb, 0.7) : col.limb;
  ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo((hx + fx) / 2 + 6, (hy + fy) / 2, fx, fy); ctx.stroke();
  ctx.fillStyle = back ? darken(col.shoe, 0.7) : col.shoe;
  ctx.beginPath(); ctx.ellipse(fx + 6, fy - 3, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function crouchPose(P, L) {
  P.hipY = -L * 0.5;
  P.legF = [24, L * 0.5];
  P.legB = [-20, L * 0.5];
  P.squash = 0.8;
}

function computePose(f) {
  const c = f.def, L = c.legLen, t = f.anim, r = c.reach;
  const P = {
    hipY: -L, lean: 0, squash: 1, stretch: 1, rot: 0, spin: null,
    armF: [26, -8], armB: [20, -18], legF: [12, L], legB: [-12, L], expr: 'normal', bob: 0, mouth: 0,
  };
  const breath = Math.sin(t * 0.09);
  let e = 0;
  const m = f.move;
  if (f.state === 'attack' && m) {
    if (f.mf <= m.startup) e = f.mf / m.startup;
    else if (f.mf <= m.startup + m.active) e = 1;
    else e = Math.max(0, 1 - (f.mf - m.startup - m.active) / Math.max(1, m.recovery));
  }
  switch (f.state) {
    case 'idle': case 'intro':
      P.bob = breath * 2.5; P.armF = [26, -8 + breath * 3]; P.armB = [18, -18 + breath * 3];
      break;
    case 'walk': {
      const ph = t * 0.25;
      P.legF = [12 + Math.sin(ph) * 16, L - Math.max(0, Math.cos(ph)) * 10];
      P.legB = [-12 - Math.sin(ph) * 16, L - Math.max(0, -Math.cos(ph)) * 10];
      P.bob = -Math.abs(Math.sin(ph)) * 3;
      P.armF = [26 + Math.sin(ph) * 4, -8]; P.armB = [18 - Math.sin(ph) * 4, -18];
      break;
    }
    case 'crouch': crouchPose(P, L); break;
    case 'block': case 'blockstun':
      if (f.crouch) crouchPose(P, L);
      P.armF = [24, -36]; P.armB = [30, -24];
      P.lean = f.state === 'blockstun' ? -0.18 : -0.06;
      break;
    case 'jump':
      P.legF = [14, L * 0.55]; P.legB = [-10, L * 0.7];
      P.armF = f.vy < 0 ? [24, -34] : [28, -10]; P.armB = f.vy < 0 ? [12, -38] : [16, -12];
      break;
    case 'land':
      P.hipY = -L * 0.8; P.squash = 0.88; P.legF = [16, L * 0.8]; P.legB = [-16, L * 0.8];
      break;
    case 'attack':
      P.mouth = e;
      P.expr = 'attack';
      switch (m.name) {
        case 'punch':
          P.armF = [lerp(26, 34 + 58 * r, e), lerp(-8, -16, e)]; P.lean = 0.12 * e; P.armB = [10, -14];
          break;
        case 'kick':
          P.legF = [lerp(12, 34 + 72 * r, e), lerp(L, -32, e)]; P.lean = -0.22 * e; P.armF = [12, -26]; P.armB = [-4, -20];
          break;
        case 'uppercut':
          P.hipY = lerp(-L * 0.6, -L, e); P.armF = [28, lerp(-8, -112, e)]; P.stretch = 1 + 0.12 * e; P.lean = 0.1 * e;
          break;
        case 'sweep':
          crouchPose(P, L); P.legF = [lerp(24, 40 + 86 * r, e), L * 0.5 - 4]; P.lean = -0.12; P.armF = [10, 10]; P.armB = [-10, 12];
          break;
        case 'airKick':
          P.legF = [lerp(14, 30 + 64 * r, e), lerp(L * 0.55, 14, e)]; P.legB = [-10, L * 0.6]; P.lean = -0.15; P.armF = [14, -30];
          break;
        default: { // special / super
          const ty = m.type;
          if (ty === 'projectile') { P.armF = [lerp(8, 62, e), -22]; P.armB = [lerp(-4, 52, e), -12]; P.lean = 0.16 * e; }
          else if (ty === 'flame') { P.lean = -0.12; P.mouth = 1; P.armF = [8, -44]; P.armB = [2, -40]; }
          else if (ty === 'rising') { P.armF = [22, -118]; P.stretch = 1.12; P.legF = [10, L * 0.8]; P.legB = [-8, L * 0.9]; }
          else {
            P.lean = 0.32 * Math.min(1, e * 1.5); P.armF = [62, -10]; P.armB = [44, -2];
            if (m.spin && e >= 1) P.spin = Math.cos(t * 0.9);
          }
        }
      }
      break;
    case 'hit':
      P.lean = -0.3; P.armF = [-6, -40]; P.armB = [-22, -30]; P.expr = 'hurt';
      break;
    case 'air':
      P.rot = -Math.min(1.45, f.st * 0.07); P.expr = 'hurt';
      P.armF = [-8, -46]; P.armB = [-20, -40]; P.legF = [20, L * 0.6]; P.legB = [-4, L * 0.8];
      break;
    case 'down': case 'dead':
      P.rot = -Math.PI / 2; P.expr = f.state === 'dead' ? 'ko' : 'hurt';
      P.armF = [0, -40]; P.armB = [-10, -36];
      break;
    case 'getup':
      P.rot = -Math.PI / 2 * Math.max(0, 1 - f.st / 16);
      break;
    case 'win':
      P.armF = [12, -72 + Math.sin(t * 0.2) * 8]; P.armB = [-6, -70 - Math.sin(t * 0.2) * 8];
      P.bob = -Math.abs(Math.sin(t * 0.12)) * 14; P.expr = 'win';
      break;
    case 'cast':
      P.armF = [16, -84]; P.armB = [0, -86]; P.expr = 'attack'; P.mouth = 1; P.bob = Math.sin(t * 0.5) * 2;
      break;
    case 'dizzy':
      P.lean = Math.sin(t * 0.08) * 0.2; P.armF = [10, 30]; P.armB = [-6, 32]; P.expr = 'dizzy';
      break;
  }
  return P;
}

function drawShadow(ctx, f, scale = 1) {
  const hgt = Math.max(0, GROUND - f.y);
  const s = Math.max(0.35, 1 - hgt / 400) * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 2, f.def.bodyW * 0.62 * s + 10, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFighter(ctx, f, scale = 1) {
  const c = f.def, P = computePose(f), col = c.colors;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(scale * f.facing, scale);
  if (P.rot) {
    ctx.translate(0, -c.bodyW * 0.45 * Math.abs(Math.sin(P.rot)));
    ctx.rotate(P.rot);
  }
  ctx.translate(0, P.bob);
  let filt = '';
  if (f.flash > 0) filt = 'brightness(2.4)';
  else if (f.charred > 0) filt = `brightness(${1 - 0.85 * f.charred}) saturate(${1 - 0.7 * f.charred})`;
  if (filt) ctx.filter = filt;
  const hip = P.hipY;
  drawLeg(ctx, -8, hip, P.legB, col, true);
  drawLeg(ctx, 8, hip, P.legF, col, false);

  ctx.save();
  ctx.translate(0, hip);
  ctx.rotate(P.lean);
  if (P.spin !== null) ctx.scale(Math.abs(P.spin) < 0.15 ? 0.15 * Math.sign(P.spin || 1) : P.spin, 1);
  const bh = c.bodyH * P.squash * P.stretch, bw = c.bodyW * (1 + (1 - P.squash) * 0.35);
  const shY = -bh * 0.55, shF = bw * 0.32, shB = -bw * 0.2;
  drawArm(ctx, shB, shY, P.armB, col, true);
  ctx.save();
  ctx.scale(bw / c.bodyW, bh / c.bodyH);
  PAINTERS[c.painter](ctx, c, c.bodyW, c.bodyH, f);
  ctx.restore();
  const fy = -bh * c.faceY, fx = bw * 0.1;
  if (ACCESSORIES[c.accessory] && c.accessory !== 'brow') ACCESSORIES[c.accessory](ctx, c, bw, bh, fx, fy, f);
  drawFace(ctx, c, fx, fy, P.expr, P.mouth);
  if (c.accessory === 'brow' && P.expr !== 'win' && P.expr !== 'dizzy') ACCESSORIES.brow(ctx, c, bw, bh, fx, fy, f);
  drawArm(ctx, shF, shY, P.armF, col, false);
  if (f.state === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const a = f.anim * 0.1 + i * 2.1;
      drawStar(ctx, Math.cos(a) * 30, -bh - 18 + Math.sin(a) * 8, 7, '#ffeb3b');
    }
  }
  ctx.restore();
  ctx.restore();
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function drawProjectile(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'onion') {
    ctx.scale(1, 0.75 + 0.25 * Math.cos(p.rot));
    ctx.strokeStyle = '#f3e5f5'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#9c5a9c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
  } else if (p.kind === 'pepper') {
    ctx.rotate(p.rot);
    roundRectPath(ctx, -15, -13, 30, 26, 9);
    const g = ctx.createLinearGradient(-15, 0, 15, 0);
    g.addColorStop(0, '#b71c1c'); g.addColorStop(0.4, '#ef5350'); g.addColorStop(1, '#7f0000');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#3e0000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(4, -21); ctx.stroke();
  } else if (p.kind === 'coal') {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    g.addColorStop(0, 'rgba(255,200,80,0.9)'); g.addColorStop(0.5, 'rgba(255,90,0,0.5)'); g.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(p.rot);
    ctx.fillStyle = '#211c1a'; roundRectPath(ctx, -14, -12, 28, 24, 8); ctx.fill();
    ctx.strokeStyle = '#ff9100'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(0, 2); ctx.lineTo(8, -3); ctx.stroke();
  }
  ctx.restore();
}
