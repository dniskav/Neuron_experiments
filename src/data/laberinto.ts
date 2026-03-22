// ─────────────────────────────────────────────────────────────────────────────
// LABERINTO — geometría, sensores y física del agente
//
// El laberinto es una cuadrícula de 9×7 celdas de 60 px.
// El agente (triángulo) aprende a navegar de S hasta F mediante RL (REINFORCE).
//
// Entradas de la red:
//   [s0, s1, s2, s3, s4,  x/CW,  y/CH]   → 7 entradas
//   5 sensores de distancia radiales + posición normalizada al canvas
//   La posición permite a la red distinguir estados con sensores idénticos
//   en lugares distintos (ej: misma lectura en dos bifurcaciones diferentes).
//
// Salidas de la red:
//   [p_izq, p_recto, p_der]   → softmax → acción discreta
// ─────────────────────────────────────────────────────────────────────────────

export const TILE = 60;   // píxeles por celda
export const COLS = 9;
export const ROWS = 7;
export const CW   = COLS * TILE;  // 540
export const CH   = ROWS * TILE;  // 420

//   1 = pasillo,  0 = muro
//   S en (col=0, row=0),  F en (col=8, row=6)
//
//   Ruta correcta:  S→→→(3,0)↓↓↓(3,3)→→→(6,3)↓(6,4)↓(6,5)↓(6,6)→→F
//
//   Bifurcaciones (el agente debe elegir):
//     (3,0): seguir →→ (callejón) o girar ↓ (correcto)
//     (3,3): girar ←←← (callejón) o seguir → (correcto)
//     (6,3): girar ↑↑  (callejón) o girar ↓ (correcto)
//     (6,4): girar →→→ (callejón) o seguir ↓ (correcto)
//     (6,6): girar ←←← (callejón) o girar → (correcto)
//
//   Callejones sin salida:
//     (4,0)(5,0)          — continuar recto desde (3,0)
//     (0,3)(1,3)(2,3)     — girar izq desde (3,3)
//     (6,1)(6,2)          — subir desde (6,3)
//     (7,4)(8,4)          — girar der desde (6,4)
//     (3,6)(4,6)(5,6)     — girar izq desde (6,6)
export const MAZE: number[][] = [
  [1, 1, 1, 1, 1, 1, 0, 0, 0],   // row 0: S→→→→→ + callejón (4,0)(5,0)
  [0, 0, 0, 1, 0, 0, 1, 0, 0],   // row 1: col3↓ + col6↑ (callejón 3)
  [0, 0, 0, 1, 0, 0, 1, 0, 0],   // row 2: col3↓ + col6↑ (callejón 3)
  [1, 1, 1, 1, 1, 1, 1, 0, 0],   // row 3: callejón←←← + ruta →→→
  [0, 0, 0, 0, 0, 0, 1, 1, 1],   // row 4: col6↓ + callejón (7,4)(8,4)
  [0, 0, 0, 0, 0, 0, 1, 0, 0],   // row 5: col6↓
  [0, 0, 0, 1, 1, 1, 1, 1, 1],   // row 6: callejón←←← + →→F
];

export const START: { x: number; y: number; h: number } = {
  x: TILE * 0.5,
  y: TILE * 0.5,
  h: 0,  // apuntando a la derecha (este)
};
export const GOAL = { x: TILE * 8.5, y: TILE * 6.5 };
export const GOAL_R = 26;  // radio de "llegada" en px

export const AGENT_R  = 9;               // radio del agente en px
export const TURN_RAD = 15 * (Math.PI / 180);  // 15° por paso
export const SPEED_PX = 7;              // px que avanza por paso

// ─── Colisiones ───────────────────────────────────────────────────────────────

export function isMuro(wx: number, wy: number): boolean {
  const c = Math.floor(wx / TILE);
  const r = Math.floor(wy / TILE);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
  return MAZE[r][c] === 0;
}

// Comprueba que un círculo de radio AGENT_R no toque ningún muro
function colisionCirculo(nx: number, ny: number): boolean {
  const offsets = [
    [0, 0],
    [AGENT_R, 0], [-AGENT_R, 0],
    [0, AGENT_R], [0, -AGENT_R],
  ];
  return offsets.some(([dx, dy]) => isMuro(nx + dx, ny + dy));
}

// ─── Sensores radiales ─────────────────────────────────────────────────────────

export const MAX_RAY = 200;   // distancia máxima del rayo en px
const RAY_INC = 3;            // resolución del rayo en px

// Umbral de proximidad: si el sensor frontal está por debajo de esto,
// el agente está a menos de (SPEED_PX + AGENT_R) px de la pared —
// chocará en el siguiente paso si no reacciona ahora.
export const PROX_UMBRAL = (SPEED_PX + AGENT_R) / (MAX_RAY - AGENT_R); // ≈ 0.084

export function castRay(ox: number, oy: number, angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let prevCx = Math.floor(ox / TILE);
  let prevCy = Math.floor(oy / TILE);
  for (let d = AGENT_R + 2; d <= MAX_RAY; d += RAY_INC) {
    const px = ox + dx * d;
    const py = oy + dy * d;
    if (isMuro(px, py)) return (d - AGENT_R) / (MAX_RAY - AGENT_R);

    // Anti-clipping diagonal: cuando el rayo cambia de celda en x e y al mismo tiempo
    // puede pasar por la esquina entre dos muros sin que ningún punto de muestreo
    // caiga dentro de uno. Se verifican las dos celdas intermedias del cruce.
    const cx = Math.floor(px / TILE);
    const cy = Math.floor(py / TILE);
    if (cx !== prevCx && cy !== prevCy) {
      if (isMuro(prevCx * TILE + TILE / 2, cy * TILE + TILE / 2) ||
          isMuro(cx * TILE + TILE / 2, prevCy * TILE + TILE / 2)) {
        return (d - AGENT_R) / (MAX_RAY - AGENT_R);
      }
    }
    prevCx = cx;
    prevCy = cy;
  }
  return 1;
}

// 5 ángulos relativos al heading del agente
export const SENSOR_ANGLES = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];

export function leerSensores(x: number, y: number, h: number): number[] {
  return SENSOR_ANGLES.map(a => castRay(x, y, h + a));
}

// ─── Agente ───────────────────────────────────────────────────────────────────

export interface Agente {
  x: number;
  y: number;
  h: number;  // heading en radianes
}

// action: 0 = girar izq, 1 = recto, 2 = girar der
// En todos los casos el agente avanza (giro + movimiento simultáneo)
export function moverAgente(
  a: Agente,
  action: 0 | 1 | 2,
): { next: Agente; choco: boolean } {
  let h = a.h;
  if (action === 0) h -= TURN_RAD;
  if (action === 2) h += TURN_RAD;

  const nx = a.x + Math.cos(h) * SPEED_PX;
  const ny = a.y + Math.sin(h) * SPEED_PX;

  if (colisionCirculo(nx, ny)) {
    return { next: { x: a.x, y: a.y, h }, choco: true };
  }
  return { next: { x: nx, y: ny, h }, choco: false };
}

export function distObjetivo(x: number, y: number): number {
  return Math.hypot(x - GOAL.x, y - GOAL.y);
}

// ─── Waypoints a lo largo del camino óptimo ────────────────────────────────────
// IMPORTANTE: los waypoints están DENTRO de los corredores correctos,
// NO en las bifurcaciones. Así el agente solo los cobra si tomó la
// dirección correcta — no si entró al callejón.
//
//   WP1 (col3, row2) — bajando por el primer corredor sur
//   WP2 (col4, row3) — avanzando por el corredor este
//   WP3 (col6, row4) — bajando tras la bifurcación en (6,3)
//   WP4 (col6, row5) — bajando tras la bifurcación en (6,4)
//   WP5 (col7, row6) — avanzando por el corredor final este
export const WAYPOINTS: Array<{ x: number; y: number }> = [
  { x: 3 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 },  // WP1 (col3, row2)
  { x: 4 * TILE + TILE / 2, y: 3 * TILE + TILE / 2 },  // WP2 (col4, row3)
  { x: 6 * TILE + TILE / 2, y: 4 * TILE + TILE / 2 },  // WP3 (col6, row4)
  { x: 6 * TILE + TILE / 2, y: 5 * TILE + TILE / 2 },  // WP4 (col6, row5)
  { x: 7 * TILE + TILE / 2, y: 6 * TILE + TILE / 2 },  // WP5 (col7, row6)
];
export const WAYPOINT_R     = 28;   // radio de captura en px
export const WAYPOINT_BONUS = 10;   // recompensa por waypoint

// Entradas normalizadas para la red:
//   s0…s4  — 5 sensores de distancia radiales
//   x, y   — posición normalizada al canvas
//   v0…v4  — ¿la celda a 1 TILE en esa dirección ya fue visitada este episodio?
//            1.0 = visitada,  0.0 = nueva
//
// Las entradas v0…v4 dan a la red información EXPLÍCITA de "ya pasé por ahí"
// sin necesitar que el LSTM lo aprenda por sí solo. Así puede evitar callejones
// ya explorados desde el primer episodio en que recibe esa señal.
export function entradas(a: Agente, visitadas?: Set<string>): number[] {
  const sensores = leerSensores(a.x, a.y, a.h);

  // Para cada ángulo de sensor, proyectar un TILE en esa dirección
  // y comprobar si la celda ya fue visitada en este episodio.
  const vis = SENSOR_ANGLES.map(angle => {
    const dir = a.h + angle;
    const px  = a.x + Math.cos(dir) * TILE;
    const py  = a.y + Math.sin(dir) * TILE;
    const cell = `${Math.floor(px / TILE)},${Math.floor(py / TILE)}`;
    return visitadas?.has(cell) ? 1.0 : 0.0;
  });

  return [
    ...sensores,   // s0…s4  (5 valores)
    a.x / CW,      // x ∈ [0, 1]
    a.y / CH,       // y ∈ [0, 1]
    ...vis,         // v0…v4  (5 valores)
  ];
}
