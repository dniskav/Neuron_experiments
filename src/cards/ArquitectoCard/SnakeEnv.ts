// ─── SnakeEnv ─────────────────────────────────────────────────────────────────
//
// Lógica del juego Snake + 24 sensores para la red neuronal.
//
// Inputs (24):
//   · 8 distancias a pared      (N NE E SE S SW W NW) → 1/distancia
//   · 8 distancias a cuerpo propio (mismas 8 dirs)    → 1/distancia
//   · 4 dirección de la comida  (arriba/abajo/izq/der) → boolean
//   · 4 dirección actual        (up/right/down/left)   → one-hot
//
// Outputs (3): girar_izquierda | seguir_recto | girar_derecha
//

export const GRID        = 12;
export const CELL        = 24;
export const CANVAS_SIZE = GRID * CELL; // 288px
export const N_IN        = 24;
export const N_OUT       = 3;

// Dirección: 0=arriba 1=derecha 2=abajo 3=izquierda
export type Dir = 0 | 1 | 2 | 3;

export interface Pos { x: number; y: number; }

export interface SnakeState {
  head:  Pos;
  body:  Pos[];   // body[0] = head
  food:  Pos;
  dir:   Dir;
  score: number;
  steps: number;
  alive: boolean;
}

// ── Constantes internas ───────────────────────────────────────────────────────

// Deltas [dx,dy] para cada Dir (up right down left)
const DIR4: [number, number][] = [[0,-1],[1,0],[0,1],[-1,0]];

// 8 direcciones para los sensores (N NE E SE S SW W NW)
const DIR8: [number, number][] = [
  [0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],
];

const MAX_STEPS = GRID * GRID * 3; // límite por episodio

// ── Inicialización ────────────────────────────────────────────────────────────

function spawnFood(body: Pos[]): Pos {
  const occupied = new Set(body.map(p => `${p.x},${p.y}`));
  let pos: Pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (occupied.has(`${pos.x},${pos.y}`));
  return pos;
}

export function initSnake(): SnakeState {
  const cx = Math.floor(GRID / 2);
  const cy = Math.floor(GRID / 2);
  const body: Pos[] = [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return { head: body[0], body, food: spawnFood(body), dir: 1, score: 0, steps: 0, alive: true };
}

// ── Paso de juego ─────────────────────────────────────────────────────────────

// Acción: 0=recto 1=girar_der 2=girar_izq (relativo a la dirección actual)
function applyAction(dir: Dir, action: number): Dir {
  if (action === 1) return ((dir + 1) % 4) as Dir;
  if (action === 2) return ((dir + 3) % 4) as Dir;
  return dir;
}

export interface StepResult {
  next:   SnakeState;
  reward: number;
  done:   boolean;
}

export function stepSnake(state: SnakeState, action: number): StepResult {
  const dir = applyAction(state.dir, action);
  const [dx, dy] = DIR4[dir];
  const head: Pos = { x: state.head.x + dx, y: state.head.y + dy };

  // Colisión con pared
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return { next: { ...state, alive: false }, reward: -1, done: true };
  }

  // Colisión con cuerpo (sin la cola, que se moverá)
  const bodyCheck = state.body.slice(0, -1);
  if (bodyCheck.some(p => p.x === head.x && p.y === head.y)) {
    return { next: { ...state, alive: false }, reward: -1, done: true };
  }

  // ¿Comió?
  const ateFood = head.x === state.food.x && head.y === state.food.y;
  const newBody = ateFood
    ? [head, ...state.body]
    : [head, ...state.body.slice(0, -1)];

  const score = state.score + (ateFood ? 1 : 0);
  const food  = ateFood ? spawnFood(newBody) : state.food;
  const steps = state.steps + 1;
  const done  = steps >= MAX_STEPS;

  // Reward de distancia: premia acercarse a la comida, penaliza alejarse.
  // Evita que la serpiente aprenda a sobrevivir en bucles sin comer.
  const prevDist = Math.abs(state.head.x - state.food.x) + Math.abs(state.head.y - state.food.y);
  const newDist  = Math.abs(head.x - state.food.x)       + Math.abs(head.y - state.food.y);
  const stepReward = newDist < prevDist ? 0.1 : -0.15;

  // Premio por comer escala con el tamaño actual del cuerpo:
  // serpiente corta → +1, larga → más, incentiva seguir creciendo.
  const eatReward = ateFood ? 1 + state.body.length * 0.05 : stepReward;

  return {
    next:   { head, body: newBody, food, dir, score, steps, alive: !done },
    reward: eatReward,
    done,
  };
}

// ── Sensores (24 inputs) ──────────────────────────────────────────────────────

export function getInputs(state: SnakeState): number[] {
  const { head, body, food, dir } = state;
  const bodySet = new Set(body.slice(1).map(p => `${p.x},${p.y}`));

  const wallDist: number[] = [];
  const bodyDist: number[] = [];

  for (const [dx, dy] of DIR8) {
    let d = 1;
    let bDist = 0;
    while (true) {
      const nx = head.x + dx * d;
      const ny = head.y + dy * d;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
        wallDist.push(1 / d);
        break;
      }
      if (bDist === 0 && bodySet.has(`${nx},${ny}`)) bDist = 1 / d;
      d++;
    }
    bodyDist.push(bDist);
  }

  // Dirección de la comida (4 booleans)
  const foodDir = [
    food.y < head.y ? 1 : 0, // arriba
    food.y > head.y ? 1 : 0, // abajo
    food.x < head.x ? 1 : 0, // izquierda
    food.x > head.x ? 1 : 0, // derecha
  ];

  // Dirección actual (one-hot)
  const dirVec = [0, 0, 0, 0];
  dirVec[dir] = 1;

  return [...wallDist, ...bodyDist, ...foodDir, ...dirVec]; // 8+8+4+4 = 24
}

// ── Selección de acción ───────────────────────────────────────────────────────

export function greedyAction(q: number[], epsilon: number): number {
  if (Math.random() < epsilon) return Math.floor(Math.random() * N_OUT);
  return q.indexOf(Math.max(...q));
}
