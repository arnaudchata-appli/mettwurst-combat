'use strict';
// ---------------------------------------------------------------------------
// Combattant : physique, machine à états, coups
// ---------------------------------------------------------------------------
class Fighter {
  constructor(def, side) {
    this.def = def;
    this.side = side;
    this.maxHp = def.hp;
    this.wins = 0;
    this.meter = 0;
    this.moveSerial = 0;
    this.anim = Math.random() * 100;
    this.reset();
  }

  reset() {
    this.x = this.side === 0 ? 290 : ARENA_W - 290;
    this.y = GROUND; this.vx = 0; this.vy = 0; this.push = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = this.maxHp; this.hpLag = this.maxHp;
    this.state = 'idle'; this._ps = 'idle'; this.st = 0;
    this.move = null; this.mf = 0; this.hits = 0; this.hitCd = 0; this.hitConfirmed = false;
    this.stun = 0; this.invuln = 0; this.comboCount = 0; this.juggle = 0;
    this.flash = 0; this.charred = 0; this.crouch = false;
    this.airAttackUsed = false; this.landLag = 0;
    this.yogurts = 3; this.sticky = 0;
    this.prev = {}; this.buf = {};
  }

  // vitesse réduite quand on est couvert de yaourt
  get speedMul() { return this.sticky > 0 ? 0.55 : 1; }

  get onGround() { return this.y >= GROUND - 0.5; }
  get height() { return this.def.legLen + this.def.bodyH; }

  hurtbox() {
    const w = this.def.bodyW * 0.9, full = this.height;
    if (this.state === 'down' || this.state === 'dead') return { x: this.x - full / 2, y: this.y - 40, w: full, h: 40 };
    const h = this.crouch || this.state === 'crouch' ? full * 0.66 : full;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }

  attackBox() {
    const m = this.move;
    if (this.state !== 'attack' || !m || !m.hb) return null;
    if (this.mf <= m.startup || this.mf > m.startup + m.active) return null;
    const hb = m.hb;
    const x = this.facing === 1 ? this.x + hb.x : this.x - hb.x - hb.w;
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h };
  }

  readInput(inp, frame) {
    for (const b of ['punch', 'kick', 'block', 'special', 'yogurt']) {
      if (inp[b] && !this.prev[b]) this.buf[b] = frame;
      this.prev[b] = inp[b];
    }
  }
  pressed(b, frame) { const t = this.buf[b]; return t !== undefined && frame - t <= 7; }
  consume(b) { delete this.buf[b]; }

  face(opp) {
    if (Math.abs(opp.x - this.x) > 4) this.facing = opp.x > this.x ? 1 : -1;
  }

  physics() {
    let landed = false;
    if (this.y < GROUND || this.vy < 0) {
      this.vy += GRAVITY * STEP;
      this.y += this.vy * STEP;
      this.x += this.vx * STEP;
      if (this.y >= GROUND) { this.y = GROUND; this.vy = 0; landed = true; }
    } else {
      this.x += (this.vx + this.push) * STEP;
    }
    this.push *= 0.82;
    if (Math.abs(this.push) < 4) this.push = 0;
    this.x = clamp(this.x, 40, ARENA_W - 40);
    return landed;
  }

  update(inp, opp, g) {
    this.anim++;
    const act = g.canActFor(this);
    if (act) this.readInput(inp, g.frame);
    else { this.prev = Object.assign({}, inp); this.buf = {}; }
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.sticky > 0) {
      this.sticky--;
      if (this.anim % 9 === 0) g.yogurtDrip(this);
    }
    const landed = this.physics();

    switch (this.state) {
      case 'jump':
        if (landed) {
          this.state = 'land'; this.stun = this.landLag || 4; this.landLag = 0; this.vx = 0;
          Sound.play('land');
        } else if (act && !this.airAttackUsed && (this.pressed('punch', g.frame) || this.pressed('kick', g.frame))) {
          this.consume('punch'); this.consume('kick');
          this.airAttackUsed = true;
          this.startMove(this.def.moves.airKick, g);
        }
        break;
      case 'land': if (--this.stun <= 0) this.state = 'idle'; break;
      case 'attack': this.updateMove(inp, opp, g, landed, act); break;
      case 'hit': if (--this.stun <= 0) this.state = 'idle'; break;
      case 'blockstun': if (--this.stun <= 0) this.state = 'block'; break;
      case 'air':
        if (landed) {
          this.vx = 0;
          Sound.play('land');
          g.dust(this);
          if (this.hp <= 0 && !g.finisherPending) this.state = 'dead';
          else { this.state = 'down'; this.stun = this.hp <= 0 ? 46 : 34; }
        }
        break;
      case 'down': if (--this.stun <= 0) { this.state = 'getup'; this.stun = 18; } break;
      case 'getup':
        this.invuln = Math.max(this.invuln, 2);
        if (--this.stun <= 0) { this.state = this.hp <= 0 ? 'dizzy' : 'idle'; this.juggle = 0; }
        break;
      default: break;
    }

    if (FREE.has(this.state) && this.onGround) {
      this.face(opp);
      if (act) this.handleFree(inp, opp, g);
      else {
        this.state = g.isWinner(this) ? 'win' : 'idle';
        this.vx = 0; this.crouch = false;
      }
    }
    if (this.state !== this._ps) { this._ps = this.state; this.st = 0; } else this.st++;
    // barre de vie "retardée"
    if (this.hpLag > this.hp) this.hpLag = Math.max(this.hp, this.hpLag - this.maxHp * 0.006);
    else this.hpLag = this.hp;
  }

  handleFree(inp, opp, g) {
    const M = this.def.moves, fr = g.frame;
    if (g.phase === 'finisher') {
      if (inp.down && this.pressed('special', fr)) { this.consume('special'); g.tryFinisher(this); return; }
    } else if (this.pressed('special', fr)) {
      if (this.meter >= 100) { this.consume('special'); this.startMove(M.super, g); return; }
      if (!(M.special.type === 'projectile' && g.hasProjectile(this))) { this.consume('special'); this.startMove(M.special, g); return; }
    }
    if (this.pressed('yogurt', fr)) {
      this.consume('yogurt');
      if (this.yogurts > 0) { this.startMove(M.yogurt, g); return; }
      Sound.play('back');
    }
    if (this.pressed('punch', fr)) { this.consume('punch'); this.startMove(inp.down ? M.uppercut : M.punch, g); return; }
    if (this.pressed('kick', fr)) { this.consume('kick'); this.startMove(inp.down ? M.sweep : M.kick, g); return; }
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (inp.up) {
      this.state = 'jump'; this.vy = -this.def.jump * (this.sticky > 0 ? 0.8 : 1);
      this.vx = dir * this.def.speed * 1.15 * this.speedMul;
      this.y -= 1; this.airAttackUsed = false; this.crouch = false;
      Sound.play('jump');
      return;
    }
    if (inp.block) { this.state = 'block'; this.crouch = !!inp.down; this.vx = 0; return; }
    if (inp.down) { this.state = 'crouch'; this.crouch = true; this.vx = 0; return; }
    this.crouch = false;
    if (dir) { this.state = 'walk'; this.vx = dir * this.def.speed * this.speedMul * (dir === this.facing ? 1 : 0.72); }
    else { this.state = 'idle'; this.vx = 0; }
  }

  startMove(m, g) {
    this.state = 'attack'; this.move = m; this.mf = 0;
    this.hits = 0; this.hitCd = 0; this.hitConfirmed = false;
    this.moveSerial++;
    if (!m.air) this.vx = 0;
    this.crouch = m.name === 'sweep';
    if (m.name === 'super') { this.meter = 0; g.onSuper(this); }
    else if (m.name === 'yogurt') this.yogurts--;
    else if (m.name === 'special') g.onSpecial(this);
    else Sound.play('whoosh');
  }

  cancelInto(inp, g) {
    const fr = g.frame, M = this.def.moves, allow = this.move.cancel;
    const tryMove = (btn, mv) => {
      if (mv && allow.includes(mv.name) && this.pressed(btn, fr)) { this.consume(btn); this.startMove(mv, g); return true; }
      return false;
    };
    if (this.pressed('special', fr)) {
      if (this.meter >= 100 && g.phase === 'fight') { if (tryMove('special', M.super)) return true; }
      else if (!(M.special.type === 'projectile' && g.hasProjectile(this))) { if (tryMove('special', M.special)) return true; }
    }
    if (this.yogurts > 0 && tryMove('yogurt', M.yogurt)) return true;
    if (tryMove('punch', inp.down ? M.uppercut : M.punch)) return true;
    if (tryMove('kick', inp.down ? M.sweep : M.kick)) return true;
    return false;
  }

  updateMove(inp, opp, g, landed, act) {
    const m = this.move;
    this.mf++;
    if (this.hitCd > 0) this.hitCd--;
    const a0 = m.startup, a1 = m.startup + m.active, end = a1 + m.recovery;
    const active = this.mf > a0 && this.mf <= a1;

    if (m.type === 'dash' || m.type === 'super') {
      this.vx = active ? this.facing * (this.hits > 0 && m.multi ? 140 : m.dashSpeed) : 0;
      if (active && this.anim % 2 < 1) g.trail(this, m.type === 'super');
      if (this.mf === a0 + 1) Sound.play(m.type === 'super' ? 'fire' : 'whoosh');
    } else if (!m.air && m.type !== 'rising') this.vx = 0;

    if ((m.type === 'projectile' || m.type === 'yogurt') && this.mf === a0) g.spawnProjectile(this, m);
    if (m.type === 'rising' && this.mf === a0) {
      this.vy = -m.rise; this.vx = this.facing * m.riseVx; this.y -= 1;
      Sound.play('whoosh');
    }
    if (m.invulnFrames && this.mf <= m.invulnFrames) this.invuln = Math.max(this.invuln, 1);
    if (m.type === 'flame' && active) g.flameBreath(this);
    if (m.type === 'flame' && this.mf === a0 + 1) Sound.play('fire');
    if (m.type === 'rising' && active) g.trail(this, false);

    if (landed && (m.air || m.type === 'rising')) {
      this.state = 'land'; this.stun = m.landLag || 5; this.move = null; this.vx = 0;
      Sound.play('land');
      return;
    }
    if (act && this.hitConfirmed && m.cancel.length && this.mf > a0 && this.cancelInto(inp, g)) return;

    if (this.mf >= end) {
      this.move = null;
      if (!this.onGround) { this.state = 'jump'; this.airAttackUsed = true; this.landLag = m.landLag || 4; }
      else { this.state = 'idle'; this.vx = 0; this.crouch = false; }
    }
  }

  canBlock(dir, m) {
    if (this.state !== 'block' && this.state !== 'blockstun') return false;
    if (!this.onGround) return false;
    if (this.facing === dir) return false; // attaqué de dos
    if (m.low && !this.crouch) return false;
    return true;
  }

  blockHit(dir, m) {
    this.state = 'blockstun';
    this.stun = m.blockstun;
    this.push = dir * m.kb * 0.8;
  }

  takeHit(dir, m, dmg, launch) {
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 5; this.move = null; this.vx = 0; this.crouch = false;
    if (this.hp <= 0) {
      this.state = 'air'; this.vy = -720; this.vx = dir * 240;
      this.y = Math.min(this.y, GROUND - 1); this.juggle = 99;
      return;
    }
    if (launch || !this.onGround || this.state === 'air') {
      this.state = 'air';
      this.vy = launch || -420;
      this.vx = dir * (m.kb * 0.5 + 80);
      this.y = Math.min(this.y, GROUND - 1);
      this.juggle++;
    } else {
      this.state = 'hit';
      this.stun = m.hitstun;
      this.push = dir * m.kb;
    }
  }
}
