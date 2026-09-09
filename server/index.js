import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  TANK_CLASSES,
  BASE_RELOAD,
  BASE_BULLET_RADIUS,
  TIER_UNLOCK_LEVELS,
  isValidEvolution
} from './classes.js';
import { STAT_DEFS, MAX_STAT_LEVEL, MAX_PLAYER_LEVEL, emptyStatLevels } from './stats.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ------------ CONFIG ------------
const WORLD_SIZE = 4500;
const TICK_RATE = 30;
const MAX_SHAPES = 160;
const SPAWN_PROTECTION_TIME = 2.5; // segundos
const STEALTH_IDLE_TIME = 2.2; // segundos parado/sem atirar até ficar invisível

const players = new Map();
const bullets = new Map();
const shapes = new Map();

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomColor() {
  const colors = ['#00b2e1', '#f14e54', '#ffe869', '#8065e0', '#5cd873', '#ff9f43'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function xpToNextLevel(level) {
  return Math.floor(20 * Math.pow(level, 1.55));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// ------------ FORMAS ------------
const SHAPE_DEFS = {
  square: { radius: 20, hp: 30, xpValue: 8, color: '#f0c440', bodyDamage: 8 },
  triangle: { radius: 26, hp: 50, xpValue: 20, color: '#f04848', bodyDamage: 12 },
  pentagon: { radius: 36, hp: 220, xpValue: 90, color: '#5daaf0', bodyDamage: 18 }
};

function createShape() {
  const roll = Math.random();
  const type = roll < 0.62 ? 'square' : roll < 0.92 ? 'triangle' : 'pentagon';
  const def = SHAPE_DEFS[type];
  const id = nanoid(8);
  shapes.set(id, {
    id, type, ...def, maxHp: def.hp,
    x: rand(80, WORLD_SIZE - 80),
    y: rand(80, WORLD_SIZE - 80),
    rotation: rand(0, Math.PI * 2),
    spin: rand(-0.01, 0.01)
  });
}
for (let i = 0; i < MAX_SHAPES; i++) createShape();

// ------------ CÁLCULO DE ATRIBUTOS EFETIVOS ------------
function effectiveStats(p) {
  const s = p.statLevels;
  const cls = TANK_CLASSES[p.classId];

  const maxHealth = Math.round((100 + (p.level - 1) * 8 + s.maxHealth * 22) * cls.maxHealthMult);
  const healthRegen = (0.025 + s.healthRegen * 0.05) * (maxHealth / 100);
  const bodyDamage = (18 + s.bodyDamage * 9) * cls.bodyDamageMult;
  const movementSpeed = (2.9 + s.movementSpeed * 0.24) * cls.speedMult;
  const bulletDamageBase = 7 + p.level * 0.55 + s.bulletDamage * 4.2;
  const bulletSpeedBase = 9 + s.bulletSpeed * 1.1;
  const reloadDivisor = 1 + s.reload * 0.16;
  const bulletPierce = 1 + s.bulletPenetration;

  return { maxHealth, healthRegen, bodyDamage, movementSpeed, bulletDamageBase, bulletSpeedBase, reloadDivisor, bulletPierce };
}

// ------------ JOGADORES ------------
function createPlayer(id, name) {
  const p = {
    id,
    name: (name || 'Tanque').slice(0, 16),
    x: rand(300, WORLD_SIZE - 300),
    y: rand(300, WORLD_SIZE - 300),
    angle: 0,
    level: 1,
    xp: 0,
    xpNext: xpToNextLevel(1),
    radius: 20,
    color: randomColor(),
    score: 0,
    alive: true,
    kills: 0,
    keys: { w: false, a: false, s: false, d: false },
    shooting: false,
    classId: 'basic',
    statLevels: emptyStatLevels(),
    statPoints: 0,
    barrelTimers: [],
    invulnerableTimer: SPAWN_PROTECTION_TIME,
    lastActiveTime: Date.now(),
    invisible: false
  };
  p.hp = 100;
  p.maxHp = 100;
  syncBarrelTimers(p);
  return p;
}

function syncBarrelTimers(p) {
  const cls = TANK_CLASSES[p.classId];
  if (p.barrelTimers.length !== cls.barrels.length) {
    p.barrelTimers = cls.barrels.map(() => 0);
  }
}

function addXp(player, amount) {
  player.xp += amount;
  player.score += amount;
  while (player.level < MAX_PLAYER_LEVEL && player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = xpToNextLevel(player.level);
    player.statPoints++;
    const st = effectiveStats(player);
    player.hp = Math.min(st.maxHealth, player.hp + 12);
  }
}

// ------------ SOCKET.IO ------------
io.on('connection', (socket) => {
  socket.on('join', (name) => {
    const player = createPlayer(socket.id, name);
    players.set(socket.id, player);
    socket.emit('init', { id: socket.id, worldSize: WORLD_SIZE, statDefs: STAT_DEFS, maxStatLevel: MAX_STAT_LEVEL });
  });

  socket.on('input', (data) => {
    const p = players.get(socket.id);
    if (!p || !p.alive) return;
    if (data && data.keys) p.keys = data.keys;
    if (typeof data.angle === 'number') p.angle = data.angle;
    p.shooting = !!data.shooting;

    const moving = p.keys.w || p.keys.a || p.keys.s || p.keys.d;
    if (moving || p.shooting) p.lastActiveTime = Date.now();
  });

  socket.on('upgradeStat', (statKey) => {
    const p = players.get(socket.id);
    if (!p || !p.alive) return;
    if (!(statKey in p.statLevels)) return;
    if (p.statPoints <= 0) return;
    if (p.statLevels[statKey] >= MAX_STAT_LEVEL) return;
    p.statLevels[statKey]++;
    p.statPoints--;
  });

  socket.on('selectClass', (classId) => {
    const p = players.get(socket.id);
    if (!p || !p.alive) return;
    if (!isValidEvolution(p.classId, classId)) return;
    const targetTier = TANK_CLASSES[classId].tier;
    if (p.level < TIER_UNLOCK_LEVELS[targetTier]) return;
    p.classId = classId;
    syncBarrelTimers(p);
  });

  socket.on('respawn', () => {
    const old = players.get(socket.id);
    const name = old ? old.name : 'Tanque';
    players.set(socket.id, createPlayer(socket.id, name));
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
  });
});

// ------------ HELPERS DE FÍSICA ------------
function rotatePoint(forward, side, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: forward * cos - side * sin, y: forward * sin + side * cos };
}

function resolveCircleCollision(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const overlap = a.radius + b.radius - dist;
  if (overlap <= 0) return null;
  const nx = dx / dist, ny = dy / dist;
  return { nx, ny, overlap };
}

// ------------ LOOP PRINCIPAL ------------
function gameTick() {
  const dt = 1 / TICK_RATE;
  const now = Date.now();

  for (const p of players.values()) {
    if (!p.alive) continue;
    const cls = TANK_CLASSES[p.classId];
    const st = effectiveStats(p);
    p.maxHp = st.maxHealth;

    let dx = 0, dy = 0;
    if (p.keys.w) dy -= 1;
    if (p.keys.s) dy += 1;
    if (p.keys.a) dx -= 1;
    if (p.keys.d) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    p.x += dx * st.movementSpeed;
    p.y += dy * st.movementSpeed;
    p.x = Math.max(p.radius, Math.min(WORLD_SIZE - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(WORLD_SIZE - p.radius, p.y));

    if (p.invulnerableTimer > 0) p.invulnerableTimer = Math.max(0, p.invulnerableTimer - dt);

    // Furtividade (ramo sniper): fica invisível parado e sem atirar
    p.invisible = cls.stealth && (now - p.lastActiveTime) > STEALTH_IDLE_TIME * 1000;

    // Atirar (um timer por cano)
    syncBarrelTimers(p);
    if (p.shooting) {
      cls.barrels.forEach((barrel, i) => {
        p.barrelTimers[i] -= dt;
        if (p.barrelTimers[i] <= 0) {
          const reloadMult = barrel.reloadMult ?? 1;
          p.barrelTimers[i] = (BASE_RELOAD * reloadMult) / st.reloadDivisor;

          const spreadRad = ((barrel.spread || 0) * (Math.random() - 0.5) * Math.PI) / 180;
          const shootAngle = p.angle + (barrel.angle || 0) + spreadRad;
          const forward = p.radius * 0.9;
          const side = (barrel.side || 0) * p.radius * 0.5;
          const offset = rotatePoint(forward, side, p.angle + (barrel.angle || 0));
          const speed = st.bulletSpeedBase * (barrel.speedMult || 1);
          const bDamage = st.bulletDamageBase * (barrel.damageMult || 1);
          const bRadius = BASE_BULLET_RADIUS * (barrel.width || 1) * 0.5;

          const id = nanoid(8);
          bullets.set(id, {
            id,
            ownerId: p.id,
            x: p.x + offset.x,
            y: p.y + offset.y,
            vx: Math.cos(shootAngle) * speed,
            vy: Math.sin(shootAngle) * speed,
            radius: bRadius,
            damage: bDamage,
            pierce: st.bulletPierce,
            life: 100,
            color: p.color
          });
        }
      });
    } else {
      cls.barrels.forEach((barrel, i) => { p.barrelTimers[i] = Math.max(0, p.barrelTimers[i] - dt); });
    }

    if (p.hp < st.maxHealth) p.hp = Math.min(st.maxHealth, p.hp + st.healthRegen);
  }

  // ---- Balas ----
  for (const b of bullets.values()) {
    b.x += b.vx; b.y += b.vy; b.life--;

    if (b.life <= 0 || b.x < 0 || b.x > WORLD_SIZE || b.y < 0 || b.y > WORLD_SIZE) {
      bullets.delete(b.id);
      continue;
    }

    let consumed = false;

    for (const s of shapes.values()) {
      if (distance(b.x, b.y, s.x, s.y) < b.radius + s.radius) {
        s.hp -= b.damage;
        b.pierce--;
        if (s.hp <= 0) {
          const owner = players.get(b.ownerId);
          if (owner) addXp(owner, s.xpValue);
          shapes.delete(s.id);
          createShape();
        }
        if (b.pierce <= 0) { bullets.delete(b.id); consumed = true; }
        break;
      }
    }
    if (consumed || !bullets.has(b.id)) continue;

    for (const p of players.values()) {
      if (!p.alive || p.id === b.ownerId || p.invulnerableTimer > 0) continue;
      if (distance(b.x, b.y, p.x, p.y) < b.radius + p.radius) {
        p.hp -= b.damage;
        b.pierce--;
        if (p.hp <= 0) {
          p.alive = false;
          const owner = players.get(b.ownerId);
          if (owner) { owner.kills++; addXp(owner, 40); }
        }
        if (b.pierce <= 0) { bullets.delete(b.id); }
        break;
      }
    }
  }

  // ---- Colisão de corpo: jogador x jogador ----
  const alivePlayers = Array.from(players.values()).filter((p) => p.alive);
  for (let i = 0; i < alivePlayers.length; i++) {
    for (let j = i + 1; j < alivePlayers.length; j++) {
      const a = alivePlayers[i], b = alivePlayers[j];
      const col = resolveCircleCollision(a, b);
      if (!col) continue;
      a.x -= col.nx * col.overlap * 0.5;
      a.y -= col.ny * col.overlap * 0.5;
      b.x += col.nx * col.overlap * 0.5;
      b.y += col.ny * col.overlap * 0.5;

      const aSt = effectiveStats(a), bSt = effectiveStats(b);
      if (a.invulnerableTimer <= 0 && b.invulnerableTimer <= 0) {
        a.hp -= bSt.bodyDamage * dt * 3;
        b.hp -= aSt.bodyDamage * dt * 3;
      }
    }
  }

  // ---- Colisão de corpo: jogador x forma ----
  for (const p of players.values()) {
    if (!p.alive || p.invulnerableTimer > 0) continue;
    const pSt = effectiveStats(p);
    for (const s of shapes.values()) {
      const col = resolveCircleCollision(p, s);
      if (!col) continue;
      p.x -= col.nx * col.overlap * 0.4;
      p.y -= col.ny * col.overlap * 0.4;
      s.x += col.nx * col.overlap * 0.6;
      s.y += col.ny * col.overlap * 0.6;
      s.x = Math.max(s.radius, Math.min(WORLD_SIZE - s.radius, s.x));
      s.y = Math.max(s.radius, Math.min(WORLD_SIZE - s.radius, s.y));

      p.hp -= s.bodyDamage * dt * 2;
      s.hp -= pSt.bodyDamage * dt * 2;
      if (s.hp <= 0) {
        addXp(p, s.xpValue);
        shapes.delete(s.id);
        createShape();
      }
      if (p.hp <= 0 && p.alive) p.alive = false;
    }
  }

  for (const s of shapes.values()) s.rotation += s.spin;
  for (const p of players.values()) if (p.alive && p.hp <= 0) p.alive = false;

  broadcastState();
}

function playerPublicData(p) {
  return {
    id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle,
    hp: p.hp, maxHp: p.maxHp, level: p.level, xp: p.xp, xpNext: p.xpNext,
    radius: p.radius, color: p.color, alive: p.alive, score: p.score,
    classId: p.classId, statLevels: p.statLevels, statPoints: p.statPoints,
    invulnerable: p.invulnerableTimer > 0, invisible: p.invisible
  };
}

function broadcastState() {
  const allPlayers = Array.from(players.values());
  const shapesData = Array.from(shapes.values());
  const bulletsData = Array.from(bullets.values());

  for (const viewer of allPlayers) {
    const visiblePlayers = allPlayers
      .filter((p) => p.id === viewer.id || !p.invisible)
      .map(playerPublicData);

    io.to(viewer.id).emit('state', { players: visiblePlayers, bullets: bulletsData, shapes: shapesData });
  }
}

setInterval(gameTick, 1000 / TICK_RATE);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor do jogo rodando na porta ${PORT}`));
