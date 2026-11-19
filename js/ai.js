'use strict';
// ---------------------------------------------------------------------------
// Intelligence artificielle : produit les mêmes entrées qu'un joueur humain
// level : 0 (facile) -> 3.5 (boss infernal)
// ---------------------------------------------------------------------------
const AI_KEYS = {
  punch: { punch: true }, kick: { kick: true }, uppercut: { down: true, punch: true },
  sweep: { down: true, kick: true }, special: { special: true },
};

class AI {
  constructor(level) {
    const l = this.lv = clamp(level, 0, 3.5);
    this.p = {
      block: 0.08 + 0.21 * l,
      think: Math.round(34 - 8 * l),
      aggr: 0.42 + 0.12 * l,
      anti: 0.06 + 0.24 * l,
      skill: 0.2 + 0.24 * l,
    };
    this.q = []; this.cool = 30; this.seenSerial = -1; this.guard = 0; this.guardLow = false;
    this.seenProj = new WeakSet(); this.aaCool = 0; this.finT = 0;
    this.willFinish = Math.random() < 0.55 + l * 0.15;
  }

  get(me, opp, g) {
    const o = { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, special: false };
    if (!g.canActFor(me)) { this.q.length = 0; this.guard = 0; return o; }
    const fwd = me.facing === 1 ? 'right' : 'left', back = me.facing === 1 ? 'left' : 'right';
    const dist = Math.abs(opp.x - me.x);

    if (g.phase === 'finisher') {
      this.finT++;
      if (this.willFinish && this.finT > 70 && this.finT % 12 === 0) { o.down = true; o.special = true; }
      return o;
    }
    if (this.aaCool > 0) this.aaCool--;

    // Réaction aux attaques adverses
    if (opp.state === 'attack' && opp.moveSerial !== this.seenSerial) {
      this.seenSerial = opp.moveSerial;
      const m = opp.move;
      const range = m.hb ? m.hb.x + m.hb.w + me.def.bodyW * 0.5 + 30 : 0;
      const threat = m.type === 'dash' || m.type === 'super' || (m.type !== 'projectile' && dist < range + 40);
      if (threat && Math.random() < this.p.block) {
        this.guard = m.startup + m.active + (m.multi ? m.active : 0) + 6;
        this.guardLow = m.low ? Math.random() < 0.45 + this.lv * 0.15 : Math.random() < 0.2;
        this.q.length = 0;
      }
    }
    // Projectiles qui arrivent
    for (const pr of g.projectiles) {
      if (pr.owner !== opp || this.seenProj.has(pr)) continue;
      const toward = (pr.vx > 0) === (me.x > pr.x);
      if (!toward) { this.seenProj.add(pr); continue; }
      if (Math.abs(pr.x - me.x) < 250) {
        this.seenProj.add(pr);
        const r = Math.random();
        if (r < this.p.block * 0.65) { this.guard = 26; this.guardLow = false; this.q.length = 0; }
        else if (r < this.p.block) this.q = [{ f: 1, i: { up: true, [fwd]: true } }, { f: 22, i: { [fwd]: true } }];
      }
    }
    if (this.guard > 0) {
      this.guard--;
      o.block = true; o.down = this.guardLow;
      return o;
    }
    // Anti-aérien
    if (opp.y < GROUND - 40 && dist < 200 && this.aaCool <= 0 && FREE.has(me.state)) {
      this.aaCool = 40;
      if (Math.random() < this.p.anti) {
        this.q = me.def.moves.special.type === 'rising'
          ? [{ f: 1, i: { special: true } }, { f: 6, i: {} }]
          : [{ f: 1, i: { down: true, punch: true } }, { f: 6, i: {} }];
      }
    }
    // Coup de pied sauté
    if (me.state === 'jump' && !me.airAttackUsed && dist < 160 && Math.random() < 0.25) { o.kick = true; return o; }

    if (this.q.length) {
      const s = this.q[0];
      Object.assign(o, s.i);
      if (--s.f <= 0) this.q.shift();
      return o;
    }
    if (--this.cool > 0) return o;
    if (!FREE.has(me.state)) return o;
    this.cool = randi(Math.round(this.p.think * 0.3), Math.round(this.p.think * 0.7));
    this.q = this.plan(me, opp, dist, fwd, back, g);
    return o;
  }

  plan(me, opp, dist, fwd, back, g) {
    const M = me.def.moves, sp = M.special, P = this.p, r = Math.random();
    const press = (i, w) => [{ f: 1, i }, { f: w || randi(5, 8), i: {} }];
    const pReach = me.def.bodyW * 0.3 + M.punch.hb.w + opp.def.bodyW * 0.4;
    const kReach = me.def.bodyW * 0.3 + M.kick.hb.w + opp.def.bodyW * 0.4;

    if (me.meter >= 100 && dist < 320 && r < 0.35 + this.lv * 0.1) return press({ special: true });
    if (dist > kReach + 6) {
      if (me.yogurts > 0 && opp.sticky <= 0 && r < 0.08 + 0.03 * this.lv) return press({ yogurt: true }, 14);
      if (sp.type === 'projectile' && !g.hasProjectile(me) && r < 0.18 + 0.08 * this.lv) return press({ special: true }, 14);
      if (sp.type === 'dash' && dist < 360 && r < 0.14) return press({ special: true });
      if (sp.type === 'flame' && dist < 210 && r < 0.3) return press({ special: true });
      if (r < 0.3) return [{ f: 1, i: { up: true, [fwd]: true } }, { f: 14, i: { [fwd]: true } }];
      if (r < 0.36) return [{ f: randi(8, 18), i: { [back]: true } }];
      return [{ f: randi(10, 26), i: { [fwd]: true } }];
    }
    if (dist > pReach && r < 0.5) {
      if (Math.random() < 0.5) return press(AI_KEYS.kick);
      return [{ f: randi(5, 10), i: { [fwd]: true } }];
    }
    if (r < P.aggr) {
      const strings = [
        ['punch', 'punch', 'kick'], ['punch', 'punch', 'special'], ['punch', 'kick'], ['kick', 'special'],
        ['punch', 'uppercut'], ['sweep'], ['uppercut'], ['punch', 'punch', 'punch'], ['kick'], ['punch', 'sweep'],
      ];
      const s = choice(strings), out = [];
      for (let i = 0; i < s.length; i++) {
        if (i > 0 && Math.random() > P.skill + 0.2) break;
        out.push(...press(AI_KEYS[s[i]], randi(5, 8)));
      }
      return out;
    }
    if (r < P.aggr + 0.22) return [{ f: randi(14, 30), i: { block: true, down: Math.random() < 0.45 } }];
    if (r < 0.92) return [{ f: randi(8, 18), i: { [back]: true } }];
    return [{ f: 1, i: { up: true } }, { f: 20, i: {} }];
  }
}
