'use strict';
// ---------------------------------------------------------------------------
// Les combattants du barbecue
// Hitbox : {x, y, w, h} relative aux pieds, personnage tourné vers la droite.
// Frames à 60 i/s : startup (préparation), active (coup actif), recovery.
// ---------------------------------------------------------------------------
function mv(o) {
  return Object.assign({
    name: 'move', type: 'normal', startup: 5, active: 3, recovery: 10, dmg: 40,
    hb: null, kb: 180, hitstun: 16, blockstun: 10, launch: 0, low: false, air: false,
    multi: false, hitEvery: 0, maxHits: 1, cancel: [], sfx: 'punch',
  }, o);
}

function buildMoves(c) {
  const top = c.legLen + c.bodyH;
  const sh = -(c.legLen + c.bodyH * 0.55);
  const r = c.reach, p = c.power;
  const fx = c.bodyW * 0.3;
  const m = {
    punch: mv({
      name: 'punch', startup: 4, active: 3, recovery: 8, dmg: 36 * p,
      hb: { x: fx, y: sh - 22, w: 58 * r + 12, h: 36 }, kb: 150, hitstun: 17, blockstun: 10,
      sfx: 'punch', cancel: ['punch', 'kick', 'uppercut', 'sweep', 'special', 'super'],
    }),
    kick: mv({
      name: 'kick', startup: 7, active: 4, recovery: 13, dmg: 52 * p,
      hb: { x: fx - 6, y: -c.legLen - 40, w: 74 * r + 16, h: 42 }, kb: 260, hitstun: 20, blockstun: 12,
      sfx: 'kick', cancel: ['special', 'super'],
    }),
    uppercut: mv({
      name: 'uppercut', startup: 6, active: 5, recovery: 22, dmg: 80 * p,
      hb: { x: fx - 12, y: -top - 30, w: 52 * r + 16, h: top * 0.75 }, kb: 110, launch: -980, blockstun: 14,
      sfx: 'heavy', cancel: ['special', 'super'],
    }),
    sweep: mv({
      name: 'sweep', startup: 8, active: 4, recovery: 18, dmg: 50 * p,
      hb: { x: fx - 14, y: -38, w: 86 * r + 16, h: 36 }, kb: 120, launch: -360, low: true, blockstun: 12,
      sfx: 'kick', cancel: ['special', 'super'],
    }),
    airKick: mv({
      name: 'airKick', startup: 4, active: 14, recovery: 4, dmg: 58 * p,
      hb: { x: fx - 12, y: -c.legLen - 26, w: 66 * r + 12, h: 48 }, kb: 200, hitstun: 22, blockstun: 12,
      sfx: 'kick', air: true,
    }),
    super: mv({
      name: 'super', type: 'super', startup: 32, active: 30, recovery: 24, dmg: 46 * p,
      hb: { x: -10, y: -top, w: c.bodyW * 0.5 + 70, h: top }, kb: 60, hitstun: 18, blockstun: 8,
      multi: true, hitEvery: 5, maxHits: 6, finalLaunch: -900, dashSpeed: 780, sfx: 'heavy',
    }),
  };
  m.special = mv(Object.assign({ name: 'special', sfx: 'throw' }, c.special(c, top, fx, p)));
  return m;
}

const ROSTER = [
  {
    id: 'mett', name: 'METTWURST', title: 'Le Hachoir de Hambourg',
    desc: "Saucisse crue au cœur d'acier. Équilibré, il bombarde ses ennemis de rondelles d'oignon.",
    hp: 1000, speed: 235, jump: 1020, power: 1, reach: 1,
    legLen: 38, bodyW: 78, bodyH: 140, faceY: 0.76,
    colors: { body: '#d4645a', dark: '#9b3a31', light: '#f0a092', limb: '#6d2620', mitt: '#2e7d32', shoe: '#3b2418' },
    painter: 'mett', accessory: 'tyrol', specialName: 'ZWIEBEL-WURF', superName: 'METT-EXPLOSION',
    special: (c, top, fx, p) => ({
      type: 'projectile', startup: 13, active: 1, recovery: 20, dmg: 70 * p, kb: 220, hitstun: 24, blockstun: 14,
      proj: { kind: 'onion', speed: 540, w: 44, h: 40, y: -(c.legLen + c.bodyH * 0.6) },
    }),
  },
  {
    id: 'boeuf', name: 'CÔTE DE BŒUF', title: 'Le Colosse Persillé',
    desc: "Lent mais dévastateur. Sa charge à l'os encaisse les coups sans broncher.",
    hp: 1200, speed: 180, jump: 930, power: 1.25, reach: 1.05,
    legLen: 36, bodyW: 112, bodyH: 132, faceY: 0.6,
    colors: { body: '#b3262c', dark: '#6e1218', light: '#e0575a', limb: '#5a1014', mitt: '#5d4037', shoe: '#212121' },
    painter: 'boeuf', accessory: 'brow', specialName: "CHARGE À L'OS", superName: 'RÔTISSAGE ROYAL',
    special: (c, top, fx, p) => ({
      type: 'dash', startup: 14, active: 20, recovery: 18, dmg: 100 * p, sfx: 'heavy',
      hb: { x: 10, y: -top + 10, w: c.bodyW * 0.5 + 40, h: top - 30 }, dashSpeed: 700, armor: true,
      kb: 380, launch: -520, blockstun: 16,
    }),
  },
  {
    id: 'chipo', name: 'CHIPOLATA', title: 'La Furie Fine',
    desc: 'Petite, rapide, insaisissable. Sa tornade enchaîne les coups à toute vitesse.',
    hp: 880, speed: 300, jump: 1100, power: 0.85, reach: 0.9,
    legLen: 42, bodyW: 50, bodyH: 140, faceY: 0.8,
    colors: { body: '#e6a582', dark: '#b06a48', light: '#fbd2b8', limb: '#8a4a2e', mitt: '#1565c0', shoe: '#0d47a1' },
    painter: 'chipo', accessory: 'headband', specialName: 'TORNADE CHIPO', superName: 'CHIPO-CYCLONE',
    special: (c, top, fx, p) => ({
      type: 'dash', spin: true, startup: 8, active: 26, recovery: 14, dmg: 26 * p, sfx: 'kick',
      hb: { x: -20, y: -top, w: c.bodyW + 60, h: top }, dashSpeed: 560,
      multi: true, hitEvery: 6, maxHits: 4, finalLaunch: -620, kb: 60, hitstun: 16, blockstun: 8,
    }),
  },
  {
    id: 'brochette', name: 'BROCHETTE', title: 'Le Pique-Assiette',
    desc: 'Longue portée grâce à sa pique en bois. Lance des poivrons brûlants.',
    hp: 980, speed: 220, jump: 1000, power: 0.95, reach: 1.35,
    legLen: 38, bodyW: 64, bodyH: 150, faceY: 0.6,
    colors: { body: '#7b3f22', dark: '#4a2412', light: '#a8653e', limb: '#5d4037', mitt: '#f9a825', shoe: '#33691e' },
    painter: 'brochette', accessory: null, specialName: 'POIVRON VOLANT', superName: 'MILLE PIQUES',
    special: (c, top, fx, p) => ({
      type: 'projectile', startup: 12, active: 1, recovery: 22, dmg: 64 * p, kb: 220, hitstun: 24, blockstun: 14,
      proj: { kind: 'pepper', speed: 640, w: 40, h: 36, y: -(c.legLen + c.bodyH * 0.55) },
    }),
  },
  {
    id: 'merguez', name: 'MERGUEZ', title: 'La Flamme du Désert',
    desc: "Pimentée à l'extrême. Crache un souffle de harissa enflammée.",
    hp: 950, speed: 250, jump: 1040, power: 1.05, reach: 1,
    legLen: 40, bodyW: 52, bodyH: 150, faceY: 0.8,
    colors: { body: '#a8321e', dark: '#6b1a0e', light: '#d9603f', limb: '#4e1408', mitt: '#ff8f00', shoe: '#3e2723' },
    painter: 'merguez', accessory: 'moustache', specialName: 'SOUFFLE HARISSA', superName: 'HARISSA INFERNALE',
    special: (c, top, fx, p) => ({
      type: 'flame', startup: 12, active: 32, recovery: 16, dmg: 17 * p, sfx: 'fire',
      hb: { x: fx, y: -(c.legLen + c.bodyH * 0.98), w: 175, h: 64 },
      multi: true, hitEvery: 6, maxHits: 6, kb: 50, hitstun: 14, blockstun: 8,
    }),
  },
  {
    id: 'pilon', name: 'PILON', title: 'Le Poulet Volant',
    desc: 'Croustillant et explosif. Son uppercut plumé fait décoller tout le monde.',
    hp: 1000, speed: 240, jump: 1080, power: 1, reach: 0.95,
    legLen: 36, bodyW: 96, bodyH: 118, faceY: 0.6,
    colors: { body: '#d08a3a', dark: '#8d4f17', light: '#f2c27a', limb: '#6b3b10', mitt: '#c62828', shoe: '#ffb300' },
    painter: 'pilon', accessory: null, specialName: 'UPPERCUT PLUMÉ', superName: 'PILON VOLANT',
    special: (c, top, fx, p) => ({
      type: 'rising', startup: 3, active: 16, recovery: 6, dmg: 95 * p, sfx: 'heavy',
      hb: { x: fx - 14, y: -top - 10, w: 62, h: top }, rise: 1050, riseVx: 160, launch: -900,
      invulnFrames: 10, kb: 120, blockstun: 16, landLag: 16,
    }),
  },
  {
    id: 'charbon', name: 'MAÎTRE CHARBON', title: 'Seigneur des Braises', boss: true,
    desc: "Le maître du grill. Personne n'est jamais ressorti cru de son barbecue.",
    hp: 1400, speed: 215, jump: 950, power: 1.25, reach: 1.1,
    legLen: 36, bodyW: 116, bodyH: 148, faceY: 0.68,
    colors: { body: '#2f2b29', dark: '#141110', light: '#55504c', limb: '#1a1716', mitt: '#ff6d00', shoe: '#0a0a0a' },
    painter: 'charbon', accessory: 'flamecrown', specialName: 'BOULE DE BRAISE', superName: 'BRAISE ÉTERNELLE',
    special: (c, top, fx, p) => ({
      type: 'projectile', startup: 14, active: 1, recovery: 20, dmg: 80 * p, kb: 260, hitstun: 24, blockstun: 16,
      launch: -450, proj: { kind: 'coal', speed: 500, w: 40, h: 40, y: -(c.legLen + c.bodyH * 0.55) },
    }),
  },
];
ROSTER.forEach((c) => { c.moves = buildMoves(c); });

const rosterById = (id) => ROSTER.find((c) => c.id === id);
