// ─── useTutorSnake ────────────────────────────────────────────────────────────
//
// Tutor contextual para el agente Snake.
// Detecta problemas de arquitectura, exploración y aprendizaje,
// y explica el concepto detrás de cada diagnóstico.
//

import { useMemo } from "react";
import type { LayerConfig, OptimizerType } from "../training/useSnakeRL";
import type { TutorMessage, TutorType } from "./useTutor";

export type { TutorMessage, TutorType };

interface TutorSnakeInput {
  hiddenLayers:  LayerConfig[];
  optimizerType: OptimizerType;
  lr:            number;
  episodes:      number;
  steps:         number;
  bestScore:     number;
  epsilon:       number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function totalNeurons(layers: LayerConfig[]) {
  return layers.reduce((s, l) => s + l.neurons, 0);
}

function hasAct(layers: LayerConfig[], act: string) {
  return layers.some(l => l.activation === act);
}

// ── Reglas ────────────────────────────────────────────────────────────────────

interface Rule {
  check:   (t: TutorSnakeInput) => boolean;
  message: TutorMessage | ((t: TutorSnakeInput) => TutorMessage);
}

const RULES: Rule[] = [

  // ── SIN CAPAS OCULTAS ────────────────────────────────────────────────────

  {
    check: t => t.hiddenLayers.length === 0 && t.steps > 500,
    message: {
      type:  "critical",
      icon:  "🧠",
      title: "Sin capas ocultas — la serpiente no puede razonar",
      body:  "Con 24 entradas y 3 salidas sin capas intermedias, la red solo puede aprender " +
             "combinaciones lineales de los sensores. Snake necesita razonar: si hay pared cerca " +
             "a la derecha Y la comida está a la derecha, girar izquierda. " +
             "Esa conjunción (AND) es no lineal. Añade al menos una capa oculta con ReLU.",
    },
  },

  // ── ACTIVACIÓN LINEAR EN OCULTAS ─────────────────────────────────────────

  {
    check: t => hasAct(t.hiddenLayers, "linear") && t.steps > 200,
    message: {
      type:  "critical",
      icon:  "🚫",
      title: "Activación linear — múltiples capas se colapsan en una",
      body:  "f(x) = x aplicada N veces sigue siendo una función lineal. " +
             "Por muchas capas lineales que pongas, matemáticamente son equivalentes " +
             "a una sola capa. La serpiente necesita no-linealidad para combinar sensores. " +
             "Cambia a ReLU o Tanh.",
    },
  },

  // ── SIGMOID EN OCULTAS ───────────────────────────────────────────────────

  {
    check: t => hasAct(t.hiddenLayers, "sigmoid") && t.hiddenLayers.length >= 2 && t.steps > 1000,
    message: {
      type:  "critical",
      icon:  "📉",
      title: "Sigmoid en capas ocultas — gradientes que desaparecen",
      body:  "La derivada de sigmoid nunca supera 0.25. Con backpropagation, la señal " +
             "de error se multiplica en cada capa: en 2 capas ya es 0.25² = 0.0625. " +
             "Los pesos de las primeras capas casi no aprenden. " +
             "En RL esto es aún más dañino porque las recompensas son escasas. " +
             "Usa ReLU — gradiente completo (= 1) para neuronas activas.",
    },
  },

  // ── FASE DE EXPLORACIÓN: primeros pasos ──────────────────────────────────

  {
    check: t => t.steps < 300 && t.steps > 50,
    message: (t) => ({
      type:  "tip" as const,
      icon:  "🎲",
      title: "Fase de exploración — ε-greedy en acción",
      body:  `Ahora ε ≈ ${(1 - t.steps * 0.0003).toFixed(2)}: la serpiente elige acciones aleatorias la mayor parte del tiempo. ` +
             "Esto llena el replay buffer con experiencias variadas — sin exploración, " +
             "la red solo aprendería de un tipo de situación y convertiría en subóptimo. " +
             "El truco ε-greedy balancea explorar (aprender cosas nuevas) con explotar (usar lo aprendido).",
    }),
  },

  // ── BUFFER ACUMULANDO ────────────────────────────────────────────────────

  {
    check: t => t.steps >= 300 && t.steps < 800 && t.bestScore < 2,
    message: {
      type:  "tip",
      icon:  "🗂️",
      title: "Replay buffer llenándose — la magia de no aprender en orden",
      body:  "La red entrena con lotes de 32 experiencias aleatorias del buffer. " +
             "¿Por qué aleatorias? Porque experiencias consecutivas (s₁→s₂→s₃…) están " +
             "correlacionadas — aprender de ellas en orden haría que la red 'olvide' situaciones pasadas. " +
             "Mezclar rompe esa correlación: cada batch tiene situaciones de distintos episodios.",
    },
  },

  // ── PROGRESO NORMAL: bestScore 1-4 ───────────────────────────────────────
  // Cubre el hueco entre "buffer llenándose" (steps<800) y "puntuación ≥5".

  {
    check: t => t.bestScore >= 1 && t.bestScore < 5 && t.steps >= 800,
    message: (t) => ({
      type:  "tip" as const,
      icon:  "📈",
      title: `Puntuación ${t.bestScore} — epsilon bajando, explotación aumentando`,
      body:  `Con ε ≈ ${(t.epsilon * 100).toFixed(0)}% el agente ya elige acciones aprendidas la mayor parte del tiempo. ` +
             "Los Q-values de las acciones buenas van siendo mayores que los de las malas — " +
             "la red está ajustando sus estimaciones de recompensa futura. " +
             "El salto de 1-4 a 5+ suele llegar de golpe cuando los sensores de cuerpo " +
             "empiezan a ser útiles para evitar la cola.",
    }),
  },

  {
    check: t => t.bestScore === 0 && t.steps >= 800 && t.episodes > 5,
    message: (t) => ({
      type:  "tip" as const,
      icon:  "⏳",
      title: `${t.episodes} episodios — aún explorando`,
      body:  "La serpiente aún no ha comido consistentemente. Es normal: " +
             "los primeros episodios son casi aleatorios (ε alto). " +
             "Con Adam y ReLU el aprendizaje suele acelerarse entre los episodios 20-50 " +
             "cuando el replay buffer tiene suficiente variedad de situaciones.",
    }),
  },

  // ── MUCHOS PASOS SIN MEJORAR ─────────────────────────────────────────────

  {
    check: t => t.steps > 8000 && t.bestScore < 3 && t.episodes > 50,
    message: {
      type:  "warning",
      icon:  "⚠️",
      title: "Muchos episodios sin mejorar — prueba otra arquitectura",
      body:  "Tras 50+ episodios y 8000+ pasos, la mejor puntuación es menor de 3. " +
             "Posibles causas: red demasiado pequeña (no representa la complejidad del problema), " +
             "learning rate inadecuado, o sigma-activaciones que aplastan gradientes. " +
             "Prueba: 2 capas ReLU (16→8 neuronas), Adam con lr=0.001.",
    },
  },

  // ── DEMASIADAS NEURONAS ──────────────────────────────────────────────────

  {
    check: t => totalNeurons(t.hiddenLayers) > 128 && t.steps > 2000,
    message: {
      type:  "warning",
      icon:  "🧠",
      title: "Red muy grande — entrenamiento inestable en RL",
      body:  "En RL el objetivo (target Q) cambia continuamente — la red que genera las acciones " +
             "es la misma que calcula los targets. Con muchos parámetros, cada actualización " +
             "de pesos afecta mucho los targets, creando un bucle inestable. " +
             "DQN real usa una red 'target' separada que se actualiza lentamente. " +
             "Sin ella, 16-32 neuronas por capa es más seguro.",
    },
  },

  // ── LR ALTO ──────────────────────────────────────────────────────────────

  {
    check: t => t.lr >= 0.01 && t.steps > 1000 && t.bestScore < 2,
    message: {
      type:  "tip",
      icon:  "🎛️",
      title: "Learning rate alto en RL — saltos grandes inestabilizan",
      body:  "En supervisado, lr=0.01 suele funcionar bien. En RL, los Q-values son estimaciones " +
             "ruidosas: si el agente recibe una recompensa inesperada, un lr alto actualiza " +
             "los pesos con fuerza y 'borra' aprendizaje previo. " +
             "Con Adam, lr=0.001 o 0.0005 converge más lentamente pero de forma mucho más estable.",
    },
  },

  // ── SGD EN RL ────────────────────────────────────────────────────────────

  {
    check: t => t.optimizerType === "sgd" && t.steps > 3000 && t.bestScore < 3,
    message: {
      type:  "tip",
      icon:  "⚙️",
      title: "SGD en RL — aprendizaje muy lento",
      body:  "SGD aplica el mismo learning rate a todos los pesos. En Snake, los 24 inputs " +
             "tienen escalas muy distintas: distancias van de 0.08 a 1.0, booleans son 0/1. " +
             "Adam adapta el paso por peso según su historial de gradientes — " +
             "pesos con gradientes ruidosos reciben pasos pequeños, los estables reciben más. " +
             "En RL, Adam típicamente converge 3-5x más rápido.",
    },
  },

  // ── PROGRESO BUENO ───────────────────────────────────────────────────────

  {
    check: t => t.bestScore >= 5 && t.bestScore < 10,
    message: {
      type:  "success",
      icon:  "✨",
      title: "¡La serpiente está aprendiendo! Puntuación ≥ 5",
      body:  "Los sensores de distancia al cuerpo empiezan a ser útiles: la red aprende " +
             "que una distancia 1/1 (cuerpo adyacente) en la dirección de movimiento es peligrosa. " +
             "El replay buffer ahora contiene experiencias de supervivencia Y de comer — " +
             "la red balancea ambos objetivos.",
    },
  },

  {
    check: t => t.bestScore >= 10,
    message: (t) => ({
      type:  "success",
      icon:  "🏆",
      title: `¡Puntuación ${t.bestScore}! La serpiente domina el espacio`,
      body:  "Puntuaciones altas requieren navegación a largo plazo: la serpiente debe " +
             "anticipar que su propio cuerpo creciente bloqueará rutas futuras. " +
             "Los 8 sensores de distancia al cuerpo (en 8 direcciones) proveen exactamente " +
             "esa conciencia espacial — sin ellos, la serpiente colisionaría con su propia cola " +
             "sin haber visto la amenaza hasta que está adyacente.",
    }),
  },

];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTutorSnake(input: TutorSnakeInput): TutorMessage | null {
  return useMemo(() => {
    for (const rule of RULES) {
      if (rule.check(input)) {
        return typeof rule.message === "function" ? rule.message(input) : rule.message;
      }
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input.hiddenLayers,
    input.optimizerType,
    input.lr,
    input.episodes,
    input.steps,
    input.bestScore,
    input.epsilon,
  ]);
}
