// ============================================================
// Atributos upáveis (estilo Diep.io) — 8 estatísticas, nível 0-7
// Duplicado em client/src/stats.js — mantenha sincronizado.
// ============================================================

export const MAX_STAT_LEVEL = 7;
export const MAX_PLAYER_LEVEL = 45;

export const STAT_DEFS = [
  { key: 'healthRegen', name: 'Regen. de Vida' },
  { key: 'maxHealth', name: 'Vida Máxima' },
  { key: 'bodyDamage', name: 'Dano de Corpo' },
  { key: 'bulletSpeed', name: 'Vel. do Projétil' },
  { key: 'bulletPenetration', name: 'Penetração' },
  { key: 'bulletDamage', name: 'Dano do Projétil' },
  { key: 'reload', name: 'Recarga' },
  { key: 'movementSpeed', name: 'Vel. de Movimento' }
];

export function emptyStatLevels() {
  const s = {};
  for (const d of STAT_DEFS) s[d.key] = 0;
  return s;
}

// Quantos pontos de atributo o jogador tem disponíveis para o nível dado
// (1 ponto por nível a partir do nível 2, até o nível máximo)
export function totalStatPointsForLevel(level) {
  return Math.max(0, Math.min(level, MAX_PLAYER_LEVEL) - 1);
}
