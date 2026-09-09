// ============================================================
// Árvore de classes de tanques — inspirada no Diep.io
// IMPORTANTE: este arquivo é duplicado em client/src/classes.js
// Mantenha os dois em sincronia caso edite algo aqui.
// ============================================================

export const BASE_BARREL_LENGTH = 34;
export const BASE_BARREL_WIDTH = 15;
export const BASE_RELOAD = 0.5; // segundos
export const BASE_BULLET_RADIUS = 8;

export const TIER_UNLOCK_LEVELS = [1, 15, 30, 45]; // nível mínimo para cada tier (0..3)

const DEFAULT_CLASS = {
  parent: null,
  tier: 0,
  speedMult: 1,
  maxHealthMult: 1,
  bodyDamageMult: 1,
  stealth: false,
  viewRangeMult: 1,
  barrels: [{ angle: 0, side: 0, length: 1, width: 1 }]
};

const RAW_CLASSES = {
  basic: {
    name: 'Básico',
    tier: 0,
    parent: null,
    barrels: [{ angle: 0, side: 0, length: 1, width: 1 }]
  },

  // ---------- TIER 1 (nível 15) ----------
  twin: {
    name: 'Twin',
    tier: 1,
    parent: 'basic',
    barrels: [
      { angle: 0, side: 0.55, length: 0.9, width: 0.85 },
      { angle: 0, side: -0.55, length: 0.9, width: 0.85 }
    ]
  },
  machineGun: {
    name: 'Metralhadora',
    tier: 1,
    parent: 'basic',
    barrels: [
      { angle: 0, side: 0, length: 0.8, width: 1.5, reloadMult: 0.55, damageMult: 0.75, spread: 9 }
    ]
  },
  flankGuard: {
    name: 'Guarda-Flanco',
    tier: 1,
    parent: 'basic',
    barrels: [
      { angle: 0, side: 0, length: 0.85, width: 1 },
      { angle: Math.PI, side: 0, length: 0.7, width: 0.95 }
    ]
  },
  sniper: {
    name: 'Sniper',
    tier: 1,
    parent: 'basic',
    stealth: true,
    speedMult: 0.92,
    barrels: [
      { angle: 0, side: 0, length: 1.6, width: 0.8, reloadMult: 1.5, damageMult: 1.35, speedMult: 1.5 }
    ]
  },

  // ---------- TIER 2 (nível 30) ----------
  tripleShot: {
    name: 'Triplo Tiro',
    tier: 2,
    parent: 'twin',
    barrels: [
      { angle: 0, side: 0, length: 1, width: 0.85 },
      { angle: 0.28, side: 0.5, length: 0.85, width: 0.75 },
      { angle: -0.28, side: -0.5, length: 0.85, width: 0.75 }
    ]
  },
  twinFlank: {
    name: 'Twin Flanco',
    tier: 2,
    parent: 'twin',
    barrels: [
      { angle: 0, side: 0.55, length: 0.9, width: 0.8 },
      { angle: 0, side: -0.55, length: 0.9, width: 0.8 },
      { angle: Math.PI, side: 0, length: 0.7, width: 0.9 }
    ]
  },
  gunner: {
    name: 'Artilheiro',
    tier: 2,
    parent: 'machineGun',
    barrels: [
      { angle: 0.12, side: 0.35, length: 0.75, width: 1.2, reloadMult: 0.5, damageMult: 0.6, spread: 10 },
      { angle: -0.12, side: -0.35, length: 0.75, width: 1.2, reloadMult: 0.5, damageMult: 0.6, spread: 10 },
      { angle: 0, side: 0, length: 0.85, width: 1.2, reloadMult: 0.5, damageMult: 0.6, spread: 10 }
    ]
  },
  destroyer: {
    name: 'Destruidor',
    tier: 2,
    parent: 'machineGun',
    speedMult: 0.85,
    maxHealthMult: 1.15,
    barrels: [
      { angle: 0, side: 0, length: 1.3, width: 2.2, reloadMult: 2.3, damageMult: 2.8, speedMult: 0.8 }
    ]
  },
  triAngle: {
    name: 'Tri-Ângulo',
    tier: 2,
    parent: 'flankGuard',
    barrels: [
      { angle: 0, side: 0, length: 0.9, width: 1 },
      { angle: Math.PI - 0.35, side: 0, length: 0.7, width: 0.9 },
      { angle: Math.PI + 0.35, side: 0, length: 0.7, width: 0.9 }
    ]
  },
  quadTank: {
    name: 'Quad Tank',
    tier: 2,
    parent: 'flankGuard',
    speedMult: 0.9,
    maxHealthMult: 1.1,
    barrels: [
      { angle: 0, side: 0, length: 0.85, width: 1 },
      { angle: Math.PI / 2, side: 0, length: 0.85, width: 1 },
      { angle: Math.PI, side: 0, length: 0.85, width: 1 },
      { angle: -Math.PI / 2, side: 0, length: 0.85, width: 1 }
    ]
  },
  assassin: {
    name: 'Assassino',
    tier: 2,
    parent: 'sniper',
    stealth: true,
    speedMult: 1.05,
    maxHealthMult: 0.85,
    barrels: [
      { angle: 0, side: 0, length: 2.1, width: 0.65, reloadMult: 1.7, damageMult: 1.7, speedMult: 2.1 }
    ]
  },
  hunter: {
    name: 'Caçador',
    tier: 2,
    parent: 'sniper',
    stealth: true,
    barrels: [
      { angle: 0, side: 0, length: 1.6, width: 0.8, reloadMult: 1.5, damageMult: 1.35, speedMult: 1.5 },
      { angle: 0, side: 0, length: 1.0, width: 0.6, reloadMult: 0.9, damageMult: 0.8, speedMult: 1.2 }
    ]
  },

  // ---------- TIER 3 (nível 45) ----------
  pentaShot: {
    name: 'Penta Tiro',
    tier: 3,
    parent: 'tripleShot',
    barrels: [
      { angle: 0, side: 0, length: 1, width: 0.8 },
      { angle: 0.22, side: 0.4, length: 0.9, width: 0.7 },
      { angle: -0.22, side: -0.4, length: 0.9, width: 0.7 },
      { angle: 0.44, side: 0.8, length: 0.8, width: 0.65 },
      { angle: -0.44, side: -0.8, length: 0.8, width: 0.65 }
    ]
  },
  spreadShot: {
    name: 'Tiro Espalhado',
    tier: 3,
    parent: 'twinFlank',
    barrels: [
      { angle: 0, side: 0, length: 0.95, width: 0.8 },
      { angle: 0.25, side: 0.45, length: 0.85, width: 0.7 },
      { angle: -0.25, side: -0.45, length: 0.85, width: 0.7 },
      { angle: Math.PI, side: 0, length: 0.7, width: 0.9 }
    ]
  },
  streamliner: {
    name: 'Torrente',
    tier: 3,
    parent: 'gunner',
    barrels: [
      { angle: 0.1, side: 0.3, length: 0.7, width: 1, reloadMult: 0.4, damageMult: 0.5, spread: 6 },
      { angle: -0.1, side: -0.3, length: 0.7, width: 1, reloadMult: 0.4, damageMult: 0.5, spread: 6 },
      { angle: 0.03, side: 0.1, length: 0.8, width: 1, reloadMult: 0.4, damageMult: 0.5, spread: 6 },
      { angle: -0.03, side: -0.1, length: 0.8, width: 1, reloadMult: 0.4, damageMult: 0.5, spread: 6 }
    ]
  },
  annihilator: {
    name: 'Aniquilador',
    tier: 3,
    parent: 'destroyer',
    speedMult: 0.8,
    maxHealthMult: 1.25,
    barrels: [
      { angle: 0, side: 0, length: 1.5, width: 2.5, reloadMult: 2.6, damageMult: 3.6, speedMult: 0.75 },
      { angle: 0.3, side: 0.6, length: 0.8, width: 1, reloadMult: 1, damageMult: 1 },
      { angle: -0.3, side: -0.6, length: 0.8, width: 1, reloadMult: 1, damageMult: 1 }
    ]
  },
  fighter: {
    name: 'Combatente',
    tier: 3,
    parent: 'triAngle',
    speedMult: 1.25,
    barrels: [
      { angle: 0, side: 0, length: 0.9, width: 1, reloadMult: 0.8 },
      { angle: Math.PI - 0.35, side: 0, length: 0.7, width: 0.9, reloadMult: 0.8 },
      { angle: Math.PI + 0.35, side: 0, length: 0.7, width: 0.9, reloadMult: 0.8 }
    ]
  },
  octoTank: {
    name: 'Octo Tank',
    tier: 3,
    parent: 'quadTank',
    speedMult: 0.85,
    maxHealthMult: 1.2,
    barrels: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      angle: (i * Math.PI) / 4,
      side: 0,
      length: 0.8,
      width: 0.95
    }))
  },
  ranger: {
    name: 'Batedor',
    tier: 3,
    parent: 'assassin',
    stealth: true,
    viewRangeMult: 1.3,
    maxHealthMult: 0.85,
    barrels: [
      { angle: 0, side: 0, length: 2.3, width: 0.6, reloadMult: 1.9, damageMult: 1.9, speedMult: 2.3 }
    ]
  },
  stalker: {
    name: 'Perseguidor',
    tier: 3,
    parent: 'hunter',
    stealth: true,
    barrels: [
      { angle: 0, side: 0, length: 1.7, width: 0.8, reloadMult: 1.4, damageMult: 1.6, speedMult: 1.6 },
      { angle: 0, side: 0, length: 1.1, width: 0.6, reloadMult: 0.85, damageMult: 0.95, speedMult: 1.3 }
    ]
  }
};

export const TANK_CLASSES = Object.fromEntries(
  Object.entries(RAW_CLASSES).map(([id, def]) => [id, { ...DEFAULT_CLASS, ...def, id }])
);

export function getEvolutions(classId) {
  return Object.values(TANK_CLASSES).filter((c) => c.parent === classId);
}

export function isValidEvolution(fromClassId, toClassId) {
  const target = TANK_CLASSES[toClassId];
  return !!target && target.parent === fromClassId;
}
