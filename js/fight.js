'use strict';
// ---------------------------------------------------------------------------
// Un match : rounds, coups, projectiles, particules, HUD, grillade finale
// ---------------------------------------------------------------------------
class Fight {
  // o : { p1, p2 (définitions), mode, ai: [AI|null, AI|null], stage, onEnd(result) }
  constructor(o) {
    this.o = o;
    this.f = [new Fighter(o.p1, 0), new Fighter(o.p2, 1)];
    this.ctrl = o.ai || [null, null];
    this.stage = o.stage;
    this.round = 0; this.frame = 0;
    this.projectiles = []; this.particles = [];
    this.hitstop = 0; this.shake = 0; this.slow = 0; this.dim = 0;
    this.banner = null; this.combo = [null, null]; this.freeze = null;
    this.paused = false; this.done = false;
    this.finisherPending = false; this.roundWinner = null; this.result = null;
    this.startRound();
  }

  // ------------------------------- Rounds ---------------------------------
  isFinalRound() { return this.f[0].wins === 1 && this.f[1].wins === 1; }

  startRound() {
    this.round++;
    this.timer = 99; this.timerFrames = 0;
    for (const f of this.f) f.reset();
    this.projectiles.length = 0;
    this.phase = 'call'; this.pt = 0;
    this.roundWinner = null; this.finisherPending = false; this.dim = 0;
    const label = this.isFinalRound() ? 'ROUND FINAL' : 'ROUND ' + this.round;
    this.showBanner(label, null, 80);
    Sound.say(this.isFinalRound() ? 'Round final' : 'Round ' + this.round);
  }

  canActFor(f) {
    if (this.phase === 'fight') return true;
    if (this.phase === 'finisher') return f === this.roundWinner;
    return false;
  }
  isWinner(f) {
    return (this.phase === 'roundEnd' || this.phase === 'matchEnd') && f === this.roundWinner;
  }
  matchWinner() {
    if (this.f[0].wins >= 2) return 0;
    if (this.f[1].wins >= 2) return 1;
    if (this.round >= 7) return this.f[0].hp >= this.f[1].hp ? 0 : 1;
    return null;
  }

  showBanner(text, sub, dur, big) { this.banner = { text, sub, dur, t: 0, big: !!big }; }

  checkKO() {
    if (this.phase !== 'fight') return;
    const dead = this.f.filter((f) => f.hp <= 0);
    if (!dead.length) return;
    this.phase = 'ko'; this.pt = 0; this.slow = 50;
    this.projectiles.length = 0;
    Sound.play('ko'); Sound.say('K.O.');
    this.showBanner('K.O. !', null, 110, true);
    if (dead.length === 2) this.roundWinner = null;
    else {
      this.roundWinner = this.f[1 - dead[0].side];
      if (this.roundWinner.wins + 1 >= 2) this.finisherPending = true;
    }
  }

  timeOver() {
    this.phase = 'ko'; this.pt = 0;
    this.projectiles.length = 0;
    const [a, b] = this.f;
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    this.roundWinner = Math.abs(ra - rb) < 0.001 ? null : (ra > rb ? a : b);
    this.showBanner('TEMPS ÉCOULÉ !', null, 100, true);
    Sound.say('Temps écoulé');
    Sound.play('gong');
  }

  settled() {
    return this.f.every((f) => (f.hp > 0 ? f.onGround && f.state !== 'air' && f.state !== 'attack'
      : (f.state === 'dead' || f.state === 'dizzy')));
  }

  endRound() {
    const w = this.roundWinner;
    if (w) w.wins++;
    if (this.finisherPending && w) {
      this.phase = 'finisher'; this.pt = 0;
      this.showBanner('GRILLE-LE !', '↓ + SPÉCIAL', 320, true);
      Sound.say('Grille-le !');
      return;
    }
    this.phase = 'roundEnd'; this.pt = 0;
    if (w) {
      const perfect = w.hp >= w.maxHp;
      this.showBanner(w.def.name + ' GAGNE', perfect ? 'CUISSON PARFAITE !' : null, 150);
      Sound.say(perfect ? 'Cuisson parfaite !' : w.def.name.toLowerCase() + ' gagne');
    } else {
      this.showBanner('ÉGALITÉ', null, 150);
      Sound.say('Égalité');
    }
  }

  matchEnd() {
    this.phase = 'matchEnd'; this.pt = 0;
    const wi = this.matchWinner();
    this.roundWinner = this.f[wi];
    this.result = { winner: wi };
    if (!this.banner || this.banner.text !== 'BIEN CUIT !') {
      this.showBanner(this.f[wi].def.name, 'REMPORTE LE COMBAT !', 170);
      Sound.say(this.f[wi].def.name.toLowerCase() + ' remporte le combat');
    }
  }

  tryFinisher(f) {
    if (this.phase !== 'finisher' || f !== this.roundWinner) return;
    this.phase = 'finisherAnim'; this.pt = 0;
    this.finisherPending = false;
    f.state = 'cast'; f.vx = 0;
    this.showBanner('GRILLADE FINALE !', null, 90, true);
    Sound.play('super');
    Sound.say('Grillade finale !');
  }

  finisherMissed() {
    this.finisherPending = false;
    const loser = this.f[1 - this.roundWinner.side];
    if (loser.state === 'dizzy') {
      loser.state = 'air'; loser.vy = -420; loser.vx = -loser.facing * 180; loser.y = GROUND - 1;
    }
    this.matchEnd();
  }

  updateFinisherAnim() {
    const w = this.roundWinner, l = this.f[1 - w.side];
    const t = this.pt;
    this.dim = Math.min(1, t / 20);
    if (t > 30 && t < 160) {
      for (let i = 0; i < 4; i++) {
        this.addP({
          type: 'flame', x: l.x + rand(-60, 60), y: GROUND + rand(-5, 10), vx: rand(-30, 30), vy: rand(-520, -260),
          life: randi(24, 40), size: rand(18, 34), grow: -0.3,
        });
      }
      if (t % 4 === 0) this.addP({ type: 'smoke', x: l.x + rand(-40, 40), y: GROUND - rand(60, 160), vx: rand(-20, 20), vy: rand(-80, -40), life: 70, size: rand(14, 24), grow: 0.6 });
      l.charred = Math.min(1, (t - 30) / 90);
      this.shake = Math.max(this.shake, 3);
      if (t % 22 === 0) Sound.play('fire');
    }
    if (t === 160) { l.state = 'air'; l.vy = -200; l.vx = 0; l.y = GROUND - 1; Sound.play('ko'); }
    if (t === 185) { this.showBanner('BIEN CUIT !', 'GRILLADE FINALE', 200, true); Sound.say('Bien cuit !'); }
    if (t === 190) { w.state = 'win'; }
    if (t > 200) this.dim = Math.max(0, 1 - (t - 200) / 20);
    if (t >= 300) { this.matchEnd(); }
  }

  // ------------------------------- Boucle ---------------------------------
  update() {
    if (this.paused) return;
    this.frame++; this.pt++;
    switch (this.phase) {
      case 'call':
        if (this.pt === 82) { this.showBanner('GRILLEZ !', null, 50, true); Sound.say('Grillez !'); Sound.play('gong'); }
        if (this.pt >= 105) { this.phase = 'fight'; this.pt = 0; }
        break;
      case 'fight':
        if (++this.timerFrames >= 60) { this.timerFrames = 0; this.timer--; if (this.timer <= 0) this.timeOver(); }
        break;
      case 'ko':
        if (this.pt > 100 && this.settled()) this.endRound();
        else if (this.pt > 400) this.endRound();
        break;
      case 'roundEnd':
        if (this.pt > 150) { if (this.matchWinner() !== null) this.matchEnd(); else this.startRound(); }
        break;
      case 'finisher':
        if (this.pt > 320) this.finisherMissed();
        break;
      case 'finisherAnim':
        this.updateFinisherAnim();
        break;
      case 'matchEnd':
        if (this.pt > 190 && !this.done) { this.done = true; this.o.onEnd(this.result); }
        break;
    }
    if (this.shake > 0) { this.shake *= 0.86; if (this.shake < 0.3) this.shake = 0; }
    if (this.phase !== 'finisherAnim' && this.dim > 0) this.dim = Math.max(0, this.dim - 0.03);
    this.updateParticles();
    Stage.update(this.stage, View);
    if (this.banner && ++this.banner.t > this.banner.dur) this.banner = null;
    for (let i = 0; i < 2; i++) if (this.combo[i] && ++this.combo[i].t > 80) this.combo[i] = null;

    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.slow > 0) { this.slow--; if (this.slow % 2) return; }

    const twoP = this.o.mode === 'versus';
    const inputs = this.f.map((f, i) => (this.ctrl[i] ? this.ctrl[i].get(f, this.f[1 - i], this) : Input.player(i, twoP)));
    for (let i = 0; i < 2; i++) {
      const f = this.f[i];
      if (this.freeze && this.freeze.f === f) continue;
      f.update(inputs[i], this.f[1 - i], this);
    }
    if (this.freeze && --this.freeze.n <= 0) this.freeze = null;
    this.pushApart();
    this.checkHits(0, 1);
    this.checkHits(1, 0);
    this.updateProjectiles();
    this.checkKO();
  }

  pushApart() {
    const [a, b] = this.f;
    if (a.state === 'dead' || b.state === 'dead') return;
    const ha = a.hurtbox(), hb = b.hurtbox();
    if (!(ha.y < hb.y + hb.h && ha.y + ha.h > hb.y)) return;
    const minD = (a.def.bodyW + b.def.bodyW) * 0.38;
    const dx = b.x - a.x;
    if (Math.abs(dx) >= minD) return;
    const s = dx === 0 ? a.facing : Math.sign(dx);
    const over = (minD - Math.abs(dx)) / 2;
    a.x = clamp(a.x - s * over, 40, ARENA_W - 40);
    b.x = clamp(b.x + s * over, 40, ARENA_W - 40);
    if (Math.abs(b.x - a.x) < minD - 0.5) {
      if (a.x <= 40 || a.x >= ARENA_W - 40) b.x = clamp(a.x + s * minD, 40, ARENA_W - 40);
      else a.x = clamp(b.x - s * minD, 40, ARENA_W - 40);
    }
  }

  checkHits(ai, di) {
    const A = this.f[ai], D = this.f[di], m = A.move;
    if (!m || A.state !== 'attack' || !m.hb) return;
    const box = A.attackBox();
    if (!box) return;
    if (m.multi) { if (A.hits >= m.maxHits || A.hitCd > 0) return; }
    else if (A.hits > 0) return;
    if (!overlap(box, D.hurtbox())) return;
    this.resolve(A, D, m, box, null);
  }

  resolve(A, D, m, box, proj) {
    if (D.invuln > 0 || D.state === 'down' || D.state === 'dead' || D.state === 'getup') return false;
    if (D.state === 'air' && D.juggle >= 3) return false;
    if (this.phase === 'finisherAnim') return false;
    const dir = proj ? Math.sign(proj.vx) : A.facing;
    if (!proj) { A.hits++; A.hitCd = m.hitEvery || 99; A.hitConfirmed = true; }
    const hb = D.hurtbox();
    const cx = (Math.max(box.x, hb.x) + Math.min(box.x + box.w, hb.x + hb.w)) / 2;
    const cy = (Math.max(box.y, hb.y) + Math.min(box.y + box.h, hb.y + hb.h)) / 2;

    if (D.state === 'dizzy') {
      // frapper l'adversaire sonné annule la grillade finale
      D.flash = 5;
      this.burst(cx, cy, D.def.colors.body, 14);
      Sound.play('heavy');
      this.finisherMissed();
      return true;
    }

    if (D.canBlock(dir, m)) {
      D.hp = Math.max(1, D.hp - m.dmg * 0.12);
      D.blockHit(dir, m);
      this.sparks(cx, cy, '#bbdefb', 8);
      Sound.play('block');
      this.hitstop = 4;
      A.meter = Math.min(100, A.meter + 3); D.meter = Math.min(100, D.meter + 4);
      if (!proj && (D.x <= 41 || D.x >= ARENA_W - 41)) A.push = -dir * m.kb * 0.7;
      return true;
    }
    // super armure (charge de la côte de bœuf)
    if (D.state === 'attack' && D.move && D.move.armor && D.mf <= D.move.startup + D.move.active) {
      D.hp = Math.max(0, D.hp - m.dmg * 0.6);
      D.flash = 4; this.hitstop = 6;
      this.sparks(cx, cy, '#fff59d', 8);
      Sound.play('block');
      return true;
    }
    const inCombo = D.state === 'hit' || D.state === 'air';
    D.comboCount = inCombo ? D.comboCount + 1 : 1;
    const scale = Math.max(0.35, 1 - 0.12 * (D.comboCount - 1));
    const dmg = Math.round(m.dmg * scale);
    let launch = m.launch;
    if (!proj && m.multi && m.finalLaunch && A.hits >= m.maxHits) launch = m.finalLaunch;
    D.takeHit(dir, m, dmg, launch);
    if (m.sticky) {
      D.sticky = m.sticky;
      this.burst(cx, cy, '#fffdf4', 22);
      Sound.play('squish');
      this.combo[A.side] = { n: 0, t: 20, label: 'SPLASH ! TOUT COLLANT !' };
    } else if (D.comboCount >= 2) this.combo[A.side] = { n: D.comboCount, t: 0 };
    this.burst(cx, cy, D.def.colors.body, 6 + Math.round(dmg / 8));
    this.sparks(cx, cy, '#fff8e1', 5 + Math.round(dmg / 15));
    this.hitstop = dmg >= 80 ? 10 : dmg >= 50 ? 7 : 5;
    this.shake = Math.max(this.shake, Math.min(14, dmg * 0.12));
    Sound.play(dmg >= 80 || m.sfx === 'heavy' ? 'heavy' : m.sfx === 'kick' ? 'kick' : 'punch');
    if (dmg >= 60) Sound.play('sizzle');
    A.meter = Math.min(100, A.meter + dmg * 0.12 + 3);
    D.meter = Math.min(100, D.meter + dmg * 0.08 + 2);
    if (!proj && (D.x <= 41 || D.x >= ARENA_W - 41)) A.push = -dir * m.kb * 0.6;
    return true;
  }

  // ---------------------------- Projectiles -------------------------------
  spawnProjectile(f, m) {
    const p = m.proj;
    this.projectiles.push({
      owner: f, kind: p.kind, m, x: f.x + f.facing * (f.def.bodyW * 0.5 + 12), y: f.y + p.y,
      vx: f.facing * p.speed, w: p.w, h: p.h, life: 220, rot: 0, dead: false,
    });
    if (p.kind === 'yogurt') {
      Sound.play('squish');
      const hx = f.x + f.facing * (f.def.bodyW * 0.32 + 50), hy = f.y + p.y;
      for (let i = 0; i < 14; i++) {
        const a = rand(-Math.PI, 0), s = rand(120, 380);
        this.addP({ type: 'drop', x: hx, y: hy, vx: Math.cos(a) * s + f.facing * 120, vy: Math.sin(a) * s, g: 1400, life: randi(18, 34), size: rand(2.5, 5.5), color: i % 4 ? '#fffdf4' : '#f8bbd0' });
      }
      this.combo[f.side] = { n: 0, t: 30, label: 'POT DE YAOURT !' };
    } else Sound.play('throw');
  }
  hasProjectile(f) { return this.projectiles.some((p) => p.owner === f && !p.dead && p.kind !== 'yogurt'); }
  yogurtDrip(f) {
    this.addP({
      type: 'drop', x: f.x + rand(-f.def.bodyW * 0.4, f.def.bodyW * 0.4), y: f.y - rand(f.def.legLen, f.height * 0.9),
      vx: 0, vy: 30, g: 900, life: 40, size: rand(2.5, 4), color: '#fffdf4',
    });
  }

  updateProjectiles() {
    const P = this.projectiles;
    for (const p of P) {
      p.x += p.vx * STEP; p.rot += 0.3; p.life--;
      if (p.kind === 'yogurt' && this.frame % 3 === 0) {
        this.addP({ type: 'drop', x: p.x - Math.sign(p.vx) * 20, y: p.y + rand(-8, 8), vx: -p.vx * 0.15, vy: rand(-40, 40), g: 1200, life: 24, size: rand(2.5, 4.5), color: '#fffdf4' });
      }
      if (p.kind === 'coal' && this.frame % 2 === 0) this.addP({ type: 'flame', x: p.x - Math.sign(p.vx) * 14, y: p.y + rand(-6, 6), vx: -p.vx * 0.1, vy: rand(-60, -20), life: 16, size: 14, grow: -0.5 });
      if (p.x < -80 || p.x > ARENA_W + 80 || p.life <= 0) p.dead = true;
    }
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const a = P[i], b = P[j];
        if (a.dead || b.dead || a.owner === b.owner) continue;
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
          a.dead = b.dead = true;
          this.sparks((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffe082', 14);
          Sound.play('block');
        }
      }
    }
    for (const p of P) {
      if (p.dead) continue;
      const D = this.f[1 - p.owner.side];
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      if (overlap(box, D.hurtbox()) && this.resolve(p.owner, D, p.m, box, p)) {
        p.dead = true;
        this.burst(p.x, p.y, { onion: '#f3e5f5', pepper: '#e53935', yogurt: '#fffdf4' }[p.kind] || '#ff9100', 10);
      }
    }
    this.projectiles = P.filter((p) => !p.dead);
  }

  // ---------------------------- Particules --------------------------------
  addP(p) {
    if (this.particles.length < 600) { p.max = p.life; this.particles.push(p); }
  }
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0), s = rand(150, 480);
      this.addP({ type: 'drop', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 1400, life: randi(20, 40), size: rand(2.5, 6), color: i % 3 ? color : '#ffcc66' });
    }
  }
  sparks(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(250, 600);
      this.addP({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randi(8, 14), size: rand(1.5, 3), color, drag: 0.86 });
    }
  }
  dust(f) {
    for (let i = 0; i < 8; i++) {
      this.addP({ type: 'smoke', x: f.x + rand(-40, 40), y: GROUND - 6, vx: rand(-60, 60), vy: rand(-50, -10), life: 40, size: rand(8, 14), grow: 0.4 });
    }
  }
  trail(f, big) {
    const n = big ? 3 : 1;
    for (let i = 0; i < n; i++) {
      this.addP({
        type: 'flame', x: f.x - f.facing * rand(10, 40), y: f.y - rand(20, f.height),
        vx: -f.facing * rand(40, 120), vy: rand(-80, -20), life: randi(14, 22), size: rand(10, big ? 26 : 16), grow: -0.4,
      });
    }
  }
  flameBreath(f) {
    const mx = f.x + f.facing * (f.def.bodyW * 0.35), my = f.y - (f.def.legLen + f.def.bodyH * 0.82);
    for (let i = 0; i < 3; i++) {
      this.addP({ type: 'flame', x: mx, y: my + rand(-6, 6), vx: f.facing * rand(420, 640), vy: rand(-90, 60), life: randi(16, 22), size: rand(8, 14), grow: 0.9, drag: 0.95 });
    }
  }
  onSpecial(f) {
    this.combo[f.side] = { n: 0, t: 30, label: f.def.specialName };
  }
  onSuper(f) {
    this.freeze = { f: this.f[1 - f.side], n: 30 };
    this.dim = 1;
    this.showBanner(f.def.superName, 'SUPER !', 60);
    Sound.play('super');
    for (let i = 0; i < 30; i++) {
      this.addP({ type: 'flame', x: f.x + rand(-40, 40), y: f.y - rand(0, f.height), vx: rand(-40, 40), vy: rand(-300, -100), life: randi(20, 36), size: rand(12, 24), grow: -0.3 });
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.life--;
      if (p.g) p.vy += p.g * STEP;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      p.x += p.vx * STEP; p.y += p.vy * STEP;
      if (p.grow) p.size = Math.max(0.5, p.size + p.grow);
      if (p.type === 'drop' && p.y > GROUND + 4) {
        p.life = 0;
        if (Math.random() < 0.3) this.addP({ type: 'smoke', x: p.x, y: GROUND - 2, vx: 0, vy: -30, life: 25, size: 4, grow: 0.3 });
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  drawParticles(ctx, front) {
    for (const p of this.particles) {
      const a = p.life / p.max;
      if (p.type === 'smoke') {
        if (front) continue;
        ctx.fillStyle = `rgba(90,80,75,${0.35 * a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (!front) continue;
      else if (p.type === 'drop') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      }
    }
    if (!front) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      if (p.type !== 'flame') continue;
      const a = p.life / p.max;
      const r = Math.max(1, p.size);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,240,150,${0.9 * a})`);
      g.addColorStop(0.4, `rgba(255,130,20,${0.7 * a})`);
      g.addColorStop(1, 'rgba(200,30,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------- Rendu ----------------------------------
  draw(ctx) {
    const V = View;
    ctx.save();
    if (this.shake) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    Stage.drawBack(ctx, this.stage, V, canvas, this.frame);
    ctx.save();
    ctx.translate(V.ox, V.oy);
    Stage.drawFloorFx(ctx, this.stage, V, this.frame);
    if (this.dim > 0) {
      ctx.fillStyle = `rgba(10,0,0,${0.6 * this.dim})`;
      ctx.fillRect(-V.ox - 20, -V.oy - 20, V.w + 40, V.h + 40);
    }
    for (const f of this.f) drawShadow(ctx, f);
    this.drawParticles(ctx, false);
    const order = this.f[0].state === 'attack' ? [this.f[1], this.f[0]] : [this.f[0], this.f[1]];
    for (const f of order) drawFighter(ctx, f);
    for (const p of this.projectiles) drawProjectile(ctx, p);
    this.drawParticles(ctx, true);
    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.translate(V.ox, V.oy);
    this.drawHUD(ctx);
    this.drawBanner(ctx);
    ctx.restore();
  }

  drawHUD(ctx) {
    const BW = 370, BH = 24, Y = 22;
    for (let i = 0; i < 2; i++) {
      const f = this.f[i];
      const x = i === 0 ? 24 : ARENA_W - 24 - BW;
      roundRectPath(ctx, x - 4, Y - 4, BW + 8, BH + 8, 8);
      ctx.fillStyle = 'rgba(20,8,4,0.85)'; ctx.fill();
      ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 2; ctx.stroke();
      const rl = f.hpLag / f.maxHp, r = f.hp / f.maxHp;
      ctx.fillStyle = '#c62828';
      if (i === 0) ctx.fillRect(x, Y, BW * rl, BH); else ctx.fillRect(x + BW * (1 - rl), Y, BW * rl, BH);
      const g = ctx.createLinearGradient(0, Y, 0, Y + BH);
      if (r > 0.25) { g.addColorStop(0, '#f4ff81'); g.addColorStop(0.5, '#9ccc65'); g.addColorStop(1, '#33691e'); }
      else { const fl = Math.sin(this.frame * 0.3) > 0; g.addColorStop(0, fl ? '#ffab91' : '#ffcc80'); g.addColorStop(1, '#bf360c'); }
      ctx.fillStyle = g;
      if (i === 0) ctx.fillRect(x, Y, BW * r, BH); else ctx.fillRect(x + BW * (1 - r), Y, BW * r, BH);
      UI.text(ctx, f.def.name, i === 0 ? x : x + BW, Y + BH + 18, 20, '#fff', i === 0 ? 'left' : 'right');
      // jauge de braise (super)
      const MW = 170, my = Y + BH + 34, mx = i === 0 ? x : x + BW - MW;
      roundRectPath(ctx, mx - 2, my - 2, MW + 4, 14, 6);
      ctx.fillStyle = 'rgba(20,8,4,0.85)'; ctx.fill();
      const mr = f.meter / 100;
      const mg = ctx.createLinearGradient(mx, 0, mx + MW, 0);
      mg.addColorStop(0, '#ff6f00'); mg.addColorStop(1, '#ffd54f');
      ctx.fillStyle = mg;
      if (i === 0) ctx.fillRect(mx, my, MW * mr, 10); else ctx.fillRect(mx + MW * (1 - mr), my, MW * mr, 10);
      if (f.meter >= 100 && Math.floor(this.frame / 12) % 2) {
        UI.text(ctx, 'SUPER PRÊT !', i === 0 ? mx + MW + 10 : mx - 10, my + 5, 16, '#ffd54f', i === 0 ? 'left' : 'right');
      }
      // pots de yaourt restants
      for (let k = 0; k < 3; k++) {
        const px = i === 0 ? mx + 10 + k * 22 : mx + MW - 10 - k * 22;
        ctx.globalAlpha = k < f.yogurts ? 1 : 0.2;
        drawYogurtPot(ctx, px, my + 30, 0.55, 0);
        ctx.globalAlpha = 1;
      }
      // victoires
      for (let k = 0; k < 2; k++) {
        const wx = i === 0 ? ARENA_W / 2 - 58 - k * 22 : ARENA_W / 2 + 58 + k * 22;
        ctx.fillStyle = k < f.wins ? '#ffb300' : 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(wx, 62, 9, 6, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // combo / nom du coup spécial
      const c = this.combo[i];
      if (c) {
        const cx = i === 0 ? 150 : ARENA_W - 150;
        const s = 1 + Math.max(0, 0.4 - c.t * 0.05);
        if (c.label) UI.text(ctx, c.label, cx, 150, 24 * s, '#ffe082');
        else UI.text(ctx, `${c.n} COUPS !`, cx, 150, 34 * s, '#ffd54f', 'center', { grad: true });
      }
    }
    // chrono
    roundRectPath(ctx, ARENA_W / 2 - 34, 10, 68, 50, 10);
    ctx.fillStyle = 'rgba(20,8,4,0.9)'; ctx.fill();
    ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 2; ctx.stroke();
    UI.text(ctx, String(Math.max(0, this.timer)), ARENA_W / 2, 37, 36, this.timer <= 10 ? '#ff7043' : '#fff');
  }

  drawBanner(ctx) {
    const b = this.banner;
    if (!b) return;
    const t = b.t;
    const s = t < 14 ? easeOutBack(t / 14) : 1;
    const a = Math.min(1, (b.dur - t) / 14);
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(ARENA_W / 2, 225);
    ctx.scale(s, s);
    const size = b.big ? 92 : 64;
    UI.text(ctx, b.text, 0, 0, size, '#fff', 'center', { grad: true, sw: size * 0.14 });
    if (b.sub) UI.text(ctx, b.sub, 0, size * 0.75, 30, '#fff3e0');
    ctx.restore();
  }
}
