// ─── agentWorld ───────────────────────────────────────────────────────────────
//
// Física 2D del agente robot. Sin React.
//

export const WORLD_W    = 370;
export const WORLD_H    = 370;
export const AGENT_R    = 9;
export const SPEED      = 3.0;
export const AGENT_D    = AGENT_R * 2;
export const SENSOR_MAX = Math.sqrt(WORLD_W ** 2 + WORLD_H ** 2); // ~523 px
export const TURN_SPEED = Math.PI / 15;  // ~12° por paso

export interface AgentState {
  x:       number;
  y:       number;
  heading: number;  // radianes. 0 = derecha, π/2 = abajo (canvas)
}

// ── Obstáculos ─────────────────────────────────────────────────────────────────

export interface Obstacle { cx: number; cy: number; half: number; }
export const OBS_SIZES = { s: 20, m: 35, l: 55 } as const;
export type  ObsSize   = keyof typeof OBS_SIZES;

export function generateObstacle(): Obstacle {
  const keys = Object.keys(OBS_SIZES) as ObsSize[];
  const half = OBS_SIZES[keys[Math.floor(Math.random() * keys.length)]];
  const margin = half + AGENT_R + 40;
  return {
    cx: margin + Math.random() * (WORLD_W - 2 * margin),
    cy: margin + Math.random() * (WORLD_H - 2 * margin),
    half,
  };
}

// ── Raycast helpers ────────────────────────────────────────────────────────────

function rayHitsBox(
  x: number, y: number, dx: number, dy: number,
  x1: number, x2: number, y1: number, y2: number,
): number {
  let tmin = 1e-4, tmax = SENSOR_MAX;
  if (Math.abs(dx) > 1e-9) {
    const ta = (x1 - x) / dx, tb = (x2 - x) / dx;
    tmin = Math.max(tmin, Math.min(ta, tb));
    tmax = Math.min(tmax, Math.max(ta, tb));
  } else if (x <= x1 || x >= x2) return SENSOR_MAX;
  if (Math.abs(dy) > 1e-9) {
    const ta = (y1 - y) / dy, tb = (y2 - y) / dy;
    tmin = Math.max(tmin, Math.min(ta, tb));
    tmax = Math.min(tmax, Math.max(ta, tb));
  } else if (y <= y1 || y >= y2) return SENSOR_MAX;
  return tmax >= tmin ? tmin : SENSOR_MAX;
}

function rayDist(x: number, y: number, angle: number, obstacles: Obstacle[] = []): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let t = SENSOR_MAX;
  if (Math.abs(dx) > 1e-9) {
    const tx = dx > 0 ? (WORLD_W - AGENT_R - x) / dx : (AGENT_R - x) / dx;
    if (tx > 0) t = Math.min(t, tx);
  }
  if (Math.abs(dy) > 1e-9) {
    const ty = dy > 0 ? (WORLD_H - AGENT_R - y) / dy : (AGENT_R - y) / dy;
    if (ty > 0) t = Math.min(t, ty);
  }
  for (const obs of obstacles) {
    const to = rayHitsBox(x, y, dx, dy,
      obs.cx - obs.half - AGENT_R, obs.cx + obs.half + AGENT_R,
      obs.cy - obs.half - AGENT_R, obs.cy + obs.half + AGENT_R,
    );
    t = Math.min(t, to);
  }
  return Math.max(0, Math.min(1, t / SENSOR_MAX));
}

export function frontDist(s: AgentState, obstacles: Obstacle[] = []): number {
  return rayDist(s.x, s.y, s.heading, obstacles);
}
export function leftDist(s: AgentState, obstacles: Obstacle[] = []): number {
  return rayDist(s.x, s.y, s.heading - Math.PI / 2, obstacles);
}
export function rightDist(s: AgentState, obstacles: Obstacle[] = []): number {
  return rayDist(s.x, s.y, s.heading + Math.PI / 2, obstacles);
}

// ── Agente ─────────────────────────────────────────────────────────────────────

export function resetAgent(obstacles: Obstacle[] = []): AgentState {
  const m = AGENT_R + 30;
  let state: AgentState = { x: 0, y: 0, heading: 0 };
  for (let attempt = 0; attempt < 100; attempt++) {
    state = {
      x:       m + Math.random() * (WORLD_W - 2 * m),
      y:       m + Math.random() * (WORLD_H - 2 * m),
      heading: Math.random() * Math.PI * 2,
    };
    const clear = obstacles.every(obs => {
      const cx = Math.max(obs.cx - obs.half, Math.min(obs.cx + obs.half, state.x));
      const cy = Math.max(obs.cy - obs.half, Math.min(obs.cy + obs.half, state.y));
      return (state.x - cx) ** 2 + (state.y - cy) ** 2 >= (AGENT_R + 25) ** 2;
    });
    if (clear) break;
  }
  return state;
}

// action 0 = adelante · action 1 = girar izq · action 2 = girar der (nivel 4)
export function stepAgent(
  s: AgentState,
  action: number,
  obstacles: Obstacle[] = [],
): { next: AgentState; reward: number; done: boolean } {
  if (action !== 0) return { next: s, reward: 0, done: false };

  const nx = s.x + Math.cos(s.heading) * SPEED;
  const ny = s.y + Math.sin(s.heading) * SPEED;
  const hitWall =
    nx < AGENT_R || nx > WORLD_W - AGENT_R ||
    ny < AGENT_R || ny > WORLD_H - AGENT_R;
  if (hitWall) return { next: s, reward: -50, done: true };

  for (const obs of obstacles) {
    const cx = Math.max(obs.cx - obs.half, Math.min(obs.cx + obs.half, nx));
    const cy = Math.max(obs.cy - obs.half, Math.min(obs.cy + obs.half, ny));
    if ((nx - cx) ** 2 + (ny - cy) ** 2 < AGENT_R * AGENT_R) {
      return { next: s, reward: -50, done: true };
    }
  }

  return { next: { x: nx, y: ny, heading: s.heading }, reward: 1, done: false };
}
