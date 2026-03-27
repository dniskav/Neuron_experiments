// ─── Problemas de clasificación 2D ───────────────────────────────────────────
//
// Cada problema define sus datos y sus pistas.
// El Arquitecto de Redes los usa indistintamente.
//

export interface Point {
  x: number; // [0, 1]
  y: number; // [0, 1]
  label: number; // 0 | 1
}

export interface Hint {
  minEpochs: number;
  maxAcc:    number;
  noLayers?: boolean; // solo si no hay capas ocultas
  msg:       string;
}

export interface Problem {
  id:           string;
  emoji:        string;
  titulo:       string;
  nivel:        1 | 2 | 3;
  descripcion:  string;
  successMsg:   string;
  hints:        Hint[];
  generar:      () => Point[];
  cornerLabels?: [string, string, string, string]; // [bottom-left, bottom-right, top-left, top-right]
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function gauss(std: number): number {
  const u = Math.max(1e-10, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()) * std;
}

function clamp(v: number) { return Math.max(0.01, Math.min(0.99, v)); }

// ── 1. Diagonal ───────────────────────────────────────────────────────────────

function generarDiagonal(n = 240): Point[] {
  return Array.from({ length: n }, () => {
    const x = 0.05 + Math.random() * 0.9;
    const y = 0.05 + Math.random() * 0.9;
    return { x, y, label: y > x ? 1 : 0 };
  });
}

// ── 2. Dos nubes ──────────────────────────────────────────────────────────────

function generarNubes(n = 240): Point[] {
  const pts: Point[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    pts.push(
      { x: clamp(0.28 + gauss(0.1)), y: clamp(0.28 + gauss(0.1)), label: 0 },
      { x: clamp(0.72 + gauss(0.1)), y: clamp(0.72 + gauss(0.1)), label: 1 },
    );
  }
  return pts.sort(() => Math.random() - 0.5);
}

// ── 3. ¿Voy a la fiesta? (XOR) ────────────────────────────────────────────────

function generarFiesta(n = 240): Point[] {
  const corners = [
    { x: 0.1, y: 0.1, label: 0 }, // 😴
    { x: 0.9, y: 0.1, label: 1 }, // 🕺 novia
    { x: 0.1, y: 0.9, label: 1 }, // 🕺 esposa
    { x: 0.9, y: 0.9, label: 0 }, // 💀
  ];
  const pts: Point[] = [];
  const perCorner = Math.floor(n / 4);
  for (const c of corners)
    for (let i = 0; i < perCorner; i++)
      pts.push({ x: clamp(c.x + gauss(0.09)), y: clamp(c.y + gauss(0.09)), label: c.label });
  return pts.sort(() => Math.random() - 0.5);
}

// ── 4. El círculo ─────────────────────────────────────────────────────────────

function generarCirculo(n = 300): Point[] {
  const pts: Point[] = [];
  while (pts.length < n) {
    const x = Math.random();
    const y = Math.random();
    const dx = x - 0.5, dy = y - 0.5;
    pts.push({ x, y, label: dx * dx + dy * dy < 0.08 ? 1 : 0 });
  }
  return pts.sort(() => Math.random() - 0.5);
}

// ── 5. La espiral ─────────────────────────────────────────────────────────────

function generarEspiral(n = 300): Point[] {
  const pts: Point[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const t = (i / half) * 3 * Math.PI;
    const r = 0.08 + 0.38 * (i / half);
    const noise = 0.018;
    pts.push(
      { x: clamp(0.5 + r * Math.cos(t)            + gauss(noise)), y: clamp(0.5 + r * Math.sin(t)            + gauss(noise)), label: 0 },
      { x: clamp(0.5 + r * Math.cos(t + Math.PI)  + gauss(noise)), y: clamp(0.5 + r * Math.sin(t + Math.PI)  + gauss(noise)), label: 1 },
    );
  }
  return pts.sort(() => Math.random() - 0.5);
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

// ── 6. Snake ──────────────────────────────────────────────────────────────────
// El "problema" Snake no genera puntos 2D — es un placeholder que activa
// el componente SnakeArquitecto en DetectorArquitecto.

function generarSnake(): Point[] { return []; }

export const PROBLEMS: Problem[] = [
  {
    id:          "diagonal",
    emoji:       "📐",
    titulo:      "Diagonal",
    nivel:       1,
    descripcion: "Los puntos azules están arriba de la diagonal, los rojos abajo. " +
                 "Es el problema más simple — una sola neurona sin capas ocultas debería resolverlo. " +
                 "La frontera de decisión es exactamente una línea recta.",
    successMsg:  "🎉 ¡Perfecto! La red encontró la línea divisoria.",
    hints: [
      { minEpochs: 500, maxAcc: 0.80, msg: "🤔 Este debería ser fácil. Prueba a reducir el learning rate o simplificar la red." },
    ],
    generar: generarDiagonal,
  },
  {
    id:          "nubes",
    emoji:       "☁️",
    titulo:      "Dos nubes",
    nivel:       1,
    descripcion: "Dos grupos de puntos bien separados en esquinas opuestas. " +
                 "También linealmente separable — una sola neurona puede con esto. " +
                 "Fíjate en cómo la frontera se inclina para separar las nubes.",
    successMsg:  "🎉 ¡Las nubes separadas! Fácil para la red.",
    hints: [
      { minEpochs: 400, maxAcc: 0.80, msg: "🤔 Este es sencillo. Intenta con menos neuronas." },
    ],
    generar: generarNubes,
  },
  {
    id:          "fiesta",
    emoji:       "🎉",
    titulo:      "¿Voy a la fiesta?",
    nivel:       2,
    descripcion: "Vas si viene tu novia o tu esposa — pero no las dos a la vez (💀 te matan), " +
                 "y tampoco si no viene ninguna (😴 qué aburrimiento). " +
                 "Exactamente una de las dos. Esto es XOR: imposible con una sola neurona.",
    successMsg:  "🎉 ¡Salvado! La red aprendió cuándo ir a la fiesta.",
    hints: [
      { minEpochs: 300, maxAcc: 0.65, noLayers: true, msg: "🤔 Una neurona sola no puede resolver XOR. Añade una capa oculta." },
      { minEpochs: 800, maxAcc: 0.75, msg: "🧠 Prueba más neuronas o cambia la activación (Leaky ReLU suele ir bien aquí)." },
    ],
    generar:      generarFiesta,
    cornerLabels: ["😴", "🕺", "🕺", "💀"],
  },
  {
    id:          "circulo",
    emoji:       "⭕",
    titulo:      "El círculo",
    nivel:       2,
    descripcion: "Los puntos azules están dentro del círculo, los rojos fuera. " +
                 "La frontera de decisión tiene que ser curva y cerrada — imposible con una línea recta. " +
                 "Necesitas al menos una capa oculta con varias neuronas.",
    successMsg:  "🎉 ¡La red aprendió la forma del círculo!",
    hints: [
      { minEpochs: 300, maxAcc: 0.70, noLayers: true, msg: "🤔 Un círculo no se puede separar con una línea. Añade una capa oculta." },
      { minEpochs: 800, maxAcc: 0.80, msg: "🧠 Prueba más neuronas (8-16) — la red necesita aproximar la circunferencia." },
    ],
    generar: generarCirculo,
  },
  {
    id:          "espiral",
    emoji:       "🌀",
    titulo:      "La espiral",
    nivel:       3,
    descripcion: "Dos espirales entrelazadas — el benchmark clásico de clasificación no lineal. " +
                 "Sin profundidad suficiente es imposible. Con sigmoid la red suele colapsar " +
                 "(vanishing gradient). Necesitas 2-3 capas con ReLU o Tanh y paciencia.",
    successMsg:  "🎉 ¡Increíble! La espiral es uno de los problemas más difíciles. ¡Lo lograste!",
    hints: [
      { minEpochs: 300, maxAcc: 0.65, noLayers: true, msg: "🤔 La espiral necesita sí o sí capas ocultas. Añade al menos 2." },
      { minEpochs: 1000, maxAcc: 0.75, msg: "🧠 Prueba 2-3 capas con 8-16 neuronas y activación ReLU o Tanh. Adam con lr=0.01." },
      { minEpochs: 3000, maxAcc: 0.85, msg: "💪 La espiral es dura. Más neuronas, más capas, más tiempo. ¡No te rindas!" },
    ],
    generar: generarEspiral,
  },
  {
    id:          "snake",
    emoji:       "🐍",
    titulo:      "Snake DQN",
    nivel:       3,
    descripcion: "Un agente aprende a jugar Snake usando Q-learning con replay buffer. " +
                 "La red recibe 24 sensores (paredes, cuerpo, comida, dirección) y devuelve " +
                 "3 Q-values. Diseña la arquitectura y observa cómo aprende.",
    successMsg:  "🏆 ¡La serpiente domina el tablero!",
    hints:       [],
    generar:     generarSnake,
  },
  {
    id:          "maze",
    emoji:       "🗺️",
    titulo:      "Laberinto LSTM",
    nivel:       3,
    descripcion: "Un agente con memoria LSTM navega un laberinto con 5 bifurcaciones. " +
                 "Necesita recordar qué callejones ya exploró para no repetirlos. " +
                 "Aprende con BPTT + TD(λ) sobre el episodio completo.",
    successMsg:  "🏆 ¡El agente domina el laberinto!",
    hints:       [],
    generar:     generarSnake, // placeholder — MazeArquitecto no usa puntos 2D
  },
];
