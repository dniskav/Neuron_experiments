// ─── Arkanoid · Física y constantes ──────────────────────────────────────────
//
// Sistema de coordenadas canvas: origen top-left, Y hacia abajo.
// El agente controla la paleta con 3 acciones: izquierda / quieto / derecha.
//
// ─────────────────────────────────────────────────────────────────────────────

export const CW = 400;
export const CH = 280;

export const BALL_R   = 7;
export const PAD_W    = 80;
export const PAD_H    = 10;
export const PAD_Y    = CH - 28; // borde superior de la paleta
export const PAD_HALF = PAD_W / 2;

export const PAD_SPEED  = 300; // px/s
export const BALL_SPEED = 240; // px/s

// RL ──────────────────────────────────────────────────────────────────────────
export const N_IN  = 5; // bx, by, vx, vy, px — todos normalizados a [0,1]
export const N_OUT = 3; // Q(izq), Q(quieto), Q(der)

export const DT             = 1 / 60; // timestep fijo (s)
export const STEPS_PER_FRAME = 8;     // pasos por RAF en entrenamiento
export const MAX_PASOS      = 2000;   // límite de pasos por episodio
export const SUCCESS_UMBRAL = 500;    // pasos mínimos para contar como éxito

export const LR             = 0.001;
export const GAMMA          = 0.97;
export const EPSILON_INICIO = 1.0;
export const EPSILON_FIN    = 0.05;
export const EPSILON_DECAY  = 0.997; // por episodio
export const MAX_TRAIL      = 35;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface BallState { x: number; y: number; vx: number; vy: number; }
export interface PadState  { x: number; }

export interface StepResult {
  ball:   BallState;
  pad:    PadState;
  hitPad: boolean;
  done:   boolean;
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

export function initBall(): BallState {
  const dir    = Math.random() < 0.5 ? -1 : 1;
  const angDeg = 30 + Math.random() * 40; // 30–70 grados (hacia abajo)
  const ang    = angDeg * Math.PI / 180;
  return {
    x:  CW * (0.2 + Math.random() * 0.6),
    y:  CH * 0.3,
    vx: Math.cos(ang) * dir * BALL_SPEED,
    vy: Math.sin(ang) * BALL_SPEED, // vy > 0 = hacia abajo
  };
}

export function initPad(): PadState {
  return { x: CW / 2 };
}

// ─── Paso de física ───────────────────────────────────────────────────────────

/** action: 0 = izquierda, 1 = quieto, 2 = derecha */
export function physicsStep(
  ball: BallState,
  pad:  PadState,
  action: 0 | 1 | 2,
  dt: number,
): StepResult {
  // ── Mover paleta ─────────────────────────────────────────────────────────
  let px = pad.x;
  if (action === 0) px -= PAD_SPEED * dt;
  if (action === 2) px += PAD_SPEED * dt;
  px = Math.max(PAD_HALF, Math.min(CW - PAD_HALF, px));

  // ── Mover bola ───────────────────────────────────────────────────────────
  let bx = ball.x + ball.vx * dt;
  let by = ball.y + ball.vy * dt;
  let vx = ball.vx;
  let vy = ball.vy;

  // Paredes laterales y techo
  if (bx - BALL_R < 0)  { bx = BALL_R;      vx =  Math.abs(vx); }
  if (bx + BALL_R > CW) { bx = CW - BALL_R; vx = -Math.abs(vx); }
  if (by - BALL_R < 0)  { by = BALL_R;       vy =  Math.abs(vy); }

  // ── Colisión con paleta ───────────────────────────────────────────────────
  let hitPad = false;
  const padTop    = PAD_Y;
  const padBottom = PAD_Y + PAD_H;

  if (
    vy > 0 &&
    by + BALL_R >= padTop &&
    by - BALL_R <= padBottom &&
    bx >= px - PAD_HALF - BALL_R &&
    bx <= px + PAD_HALF + BALL_R
  ) {
    by = padTop - BALL_R;
    // Ángulo de rebote según posición relativa al centro de la paleta
    const offset = Math.max(-1, Math.min(1, (bx - px) / PAD_HALF));
    const angle  = offset * 55 * Math.PI / 180; // ±55°
    const speed  = Math.hypot(vx, vy);
    vx = Math.sin(angle) * speed;
    vy = -Math.abs(Math.cos(angle) * speed); // siempre hacia arriba
    hitPad = true;
  }

  const done = by - BALL_R > CH; // bola cayó fuera del canvas

  return {
    ball: { x: bx, y: by, vx, vy },
    pad:  { x: px },
    hitPad,
    done,
  };
}

// ─── Entradas de la red (normalizadas a [0,1]) ────────────────────────────────

export function getInputs(ball: BallState, pad: PadState): number[] {
  return [
    ball.x / CW,
    ball.y / CH,
    (ball.vx / BALL_SPEED + 1) / 2, // [-BALL_SPEED, BALL_SPEED] → [0,1]
    (ball.vy / BALL_SPEED + 1) / 2,
    pad.x / CW,
  ];
}

// ─── Selección de acción (ε-greedy) ──────────────────────────────────────────

export function greedyAction(q: number[], eps: number): 0 | 1 | 2 {
  if (Math.random() < eps) return Math.floor(Math.random() * N_OUT) as 0 | 1 | 2;
  const best = q.indexOf(Math.max(...q));
  return best as 0 | 1 | 2;
}
