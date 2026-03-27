// ─── useTutor ─────────────────────────────────────────────────────────────────
//
// Analizador contextual que evalúa el estado actual de la red y el problema
// y devuelve un mensaje educativo con diagnóstico + explicación + sugerencia.
//
// Prioridad: crítico > aviso > consejo > éxito > silencio
//

import { useMemo } from "react";
import type { LayerConfig, OptimizerType } from "./useArquitectoTraining";
import type { Problem } from "./problems";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TutorType = "critical" | "warning" | "tip" | "success";

export interface TutorMessage {
  type:  TutorType;
  icon:  string;
  title: string;
  body:  string;
}

interface TutorInput {
  problem:      Problem;
  hiddenLayers: LayerConfig[];
  optimizerType: OptimizerType;
  lr:           number;
  epochs:       number;
  accuracy:     number | null;
  loss:         number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasAct(layers: LayerConfig[], act: string) {
  return layers.some(l => l.activation === act);
}

function allAct(layers: LayerConfig[], act: string) {
  return layers.length > 0 && layers.every(l => l.activation === act);
}

function totalNeurons(layers: LayerConfig[]) {
  return layers.reduce((s, l) => s + l.neurons, 0);
}

const acc = (t: TutorInput) => t.accuracy ?? 0;
const trained = (t: TutorInput, n = 200) => t.epochs >= n;

// ── Reglas ────────────────────────────────────────────────────────────────────
//
// Cada regla: { check(input) → boolean, message: TutorMessage }
// Se evalúan en orden; la primera que pasa gana.
//

interface Rule {
  check:   (t: TutorInput) => boolean;
  message: TutorMessage | ((t: TutorInput) => TutorMessage);
}

const RULES: Rule[] = [

  // ── CRÍTICOS: cosas que impiden aprender ────────────────────────────────

  {
    check: t => hasAct(t.hiddenLayers, "linear") && trained(t, 100),
    message: {
      type:  "critical",
      icon:  "🚫",
      title: "Activación linear en capa oculta — no aprende nada",
      body:  "Una neurona linear es f(x) = x. Componer N funciones lineales sigue siendo una función linear. " +
             "Por muchas capas lineales que añadas, la red es matemáticamente equivalente a una sola neurona. " +
             "Necesitas no-linealidad: ReLU, Tanh o Leaky ReLU.",
    },
  },

  {
    check: t => hasAct(t.hiddenLayers, "sigmoid") && t.hiddenLayers.length >= 2 && trained(t, 200),
    message: {
      type:  "critical",
      icon:  "📉",
      title: "Sigmoid en capas ocultas — vanishing gradient",
      body:  "La derivada de sigmoid nunca supera 0.25. Con backpropagation, cada capa multiplica el gradiente " +
             "por ese valor: en 3 capas ya es 0.25³ ≈ 0.015. Los pesos casi no se actualizan. " +
             "Este problema se llama vanishing gradient. Guarda sigmoid para la capa de salida y usa ReLU o Tanh en las ocultas.",
    },
  },

  // ── PROBLEMA: sin capas ocultas en problemas no lineales ────────────────

  {
    check: t =>
      ["fiesta", "circulo", "espiral"].includes(t.problem.id) &&
      t.hiddenLayers.length === 0 &&
      trained(t, 150),
    message: {
      type:  "warning",
      icon:  "📐",
      title: "Sin capas ocultas — solo puedes trazar líneas rectas",
      body:  "Sin neuronas ocultas, la red aprende una única frontera lineal (una línea recta). " +
             "Este problema tiene una frontera no lineal — ninguna línea recta lo resuelve. " +
             "Añade al menos una capa oculta con ReLU o Tanh.",
    },
  },

  // ── PROBLEMA ESPECÍFICO: espiral necesita profundidad ───────────────────

  {
    check: t =>
      t.problem.id === "espiral" &&
      t.hiddenLayers.length === 1 &&
      trained(t, 500) &&
      acc(t) < 0.80,
    message: {
      type:  "warning",
      icon:  "🌀",
      title: "La espiral necesita al menos 2 capas",
      body:  "Cada capa oculta aprende abstracciones de nivel creciente. La primera capa detecta orientaciones locales; " +
             "la segunda combina esas orientaciones en curvas. Con una sola capa, no hay representaciones intermedias " +
             "para construir las dos espirales entrelazadas. Añade una segunda capa.",
    },
  },

  {
    check: t =>
      t.problem.id === "espiral" &&
      hasAct(t.hiddenLayers, "sigmoid") &&
      trained(t, 300) &&
      acc(t) < 0.70,
    message: {
      type:  "warning",
      icon:  "🌀",
      title: "Sigmoid + espiral = gradientes muertos",
      body:  "La espiral exige gradientes que fluyan limpiamente por todas las capas. Sigmoid los atenúa en cada paso. " +
             "ReLU mantiene gradiente completo (= 1) para activaciones positivas. " +
             "Tanh también funciona bien — sus valores centrados en cero aceleran la convergencia en este problema.",
    },
  },

  // ── ACTIVACIÓN INCORRECTA PARA EL PROBLEMA ──────────────────────────────

  {
    check: t =>
      t.problem.id === "circulo" &&
      allAct(t.hiddenLayers, "relu") &&
      totalNeurons(t.hiddenLayers) < 12 &&
      trained(t, 400) &&
      acc(t) < 0.82,
    message: {
      type:  "warning",
      icon:  "⭕",
      title: "ReLU + pocas neuronas no aproximan bien un círculo",
      body:  "ReLU produce funciones lineales por tramos — imagina un polígono en lugar de una circunferencia. " +
             "Con pocas neuronas, ese polígono tiene muy pocos lados y la aproximación es tosca. " +
             "Dos opciones: añade más neuronas (16+) para más 'lados', o cambia a Tanh cuya curva suave encaja naturalmente con la geometría circular.",
    },
  },

  {
    check: t =>
      t.problem.id === "diagonal" &&
      t.hiddenLayers.length > 2 &&
      trained(t, 200),
    message: {
      type:  "tip",
      icon:  "📐",
      title: "Demasiada red para un problema simple",
      body:  "La diagonal es linealmente separable — una neurona sin capas ocultas la resuelve. " +
             "Una red demasiado grande para el problema puede sobreajustarse o tardar más en converger. " +
             "Prueba a simplificar: menos capas, menos neuronas.",
    },
  },

  // ── DEMASIADAS NEURONAS: overfitting / inestabilidad ────────────────────

  {
    check: t =>
      totalNeurons(t.hiddenLayers) > 64 &&
      trained(t, 300) &&
      acc(t) < 0.75,
    message: {
      type:  "warning",
      icon:  "🧠",
      title: "Demasiadas neuronas pueden perjudicar el entrenamiento",
      body:  "Con muchas neuronas y pocos datos (240-300 puntos), la red tiene más parámetros que ejemplos. " +
             "Puede intentar memorizar el ruido en lugar de aprender el patrón — esto se llama sobreajuste (overfitting). " +
             "Además, Adam tiene que gestionar muchos gradientes simultáneos, lo que puede desestabilizar el entrenamiento. " +
             "Prueba con 8-16 neuronas por capa.",
    },
  },

  // ── OPTIMIZADOR ─────────────────────────────────────────────────────────

  {
    check: t =>
      t.optimizerType === "sgd" &&
      ["espiral", "circulo"].includes(t.problem.id) &&
      trained(t, 500) &&
      acc(t) < 0.72,
    message: {
      type:  "tip",
      icon:  "⚙️",
      title: "SGD puede ser demasiado lento aquí",
      body:  "SGD aplica el mismo learning rate a todos los pesos. En problemas complejos, algunos pesos necesitan " +
             "pasos grandes y otros pequeños. Adam adapta el paso individualmente por peso usando el historial de gradientes — " +
             "converge mucho más rápido en problemas no lineales como este.",
    },
  },

  {
    check: t =>
      t.optimizerType === "momentum" &&
      t.problem.id === "espiral" &&
      trained(t, 800) &&
      acc(t) < 0.75,
    message: {
      type:  "tip",
      icon:  "⚙️",
      title: "Momentum es bueno, pero Adam puede hacerlo mejor",
      body:  "Momentum acumula velocidad en la dirección del gradiente, lo que ayuda a superar mínimos locales. " +
             "Sin embargo, Adam combina momentum con adaptación del learning rate — especialmente útil en la espiral, " +
             "donde los gradientes tienen magnitudes muy distintas en cada capa.",
    },
  },

  // ── FEEDBACK POSITIVO: explica por qué funciona ─────────────────────────

  {
    check: t =>
      t.problem.id === "circulo" &&
      hasAct(t.hiddenLayers, "tanh") &&
      trained(t, 100) &&
      acc(t) > 0.85,
    message: {
      type:  "success",
      icon:  "✨",
      title: "Tanh es ideal para el círculo",
      body:  "Tanh produce valores en [-1, 1] con una curva suave y simétrica. Al ser centrada en cero, " +
             "las activaciones de distintas neuronas se compensan naturalmente, permitiendo aprender " +
             "la simetría radial del círculo. Su gradiente fluye bien incluso en las esquinas del canvas.",
    },
  },

  {
    check: t =>
      ["fiesta", "circulo"].includes(t.problem.id) &&
      (hasAct(t.hiddenLayers, "relu") || hasAct(t.hiddenLayers, "leakyRelu")) &&
      trained(t, 100) &&
      acc(t) > 0.88,
    message: (t) => ({
      type:  "success",
      icon:  "✨",
      title: `${hasAct(t.hiddenLayers, "leakyRelu") ? "Leaky ReLU" : "ReLU"} funcionando bien`,
      body:  hasAct(t.hiddenLayers, "leakyRelu")
        ? "Leaky ReLU mantiene gradiente en neuronas con activación negativa (α=0.01), evitando que 'mueran'. " +
          "Con Adam esto permite que todos los pesos sigan aprendiendo aunque algunos reciban señales débiles."
        : "ReLU propaga gradiente completo (= 1) en neuronas activas, sin saturación. " +
          "La red aprende rápido porque el gradiente no se atenúa en las capas. " +
          "Resultado: convergencia estable y frontera de decisión nítida.",
    }),
  },

  {
    check: t =>
      t.problem.id === "espiral" &&
      t.hiddenLayers.length >= 2 &&
      trained(t, 200) &&
      acc(t) > 0.85,
    message: {
      type:  "success",
      icon:  "✨",
      title: "Profundidad funcionando — cada capa aprende algo diferente",
      body:  "La primera capa detecta orientaciones locales de los puntos. La segunda combina esas orientaciones " +
             "en segmentos de espiral. Capas adicionales refinarían aún más. Esta jerarquía de representaciones " +
             "es exactamente por qué las redes profundas son tan potentes.",
    },
  },

  {
    check: t =>
      t.optimizerType === "adam" &&
      trained(t, 200) &&
      acc(t) > 0.88,
    message: {
      type:  "success",
      icon:  "⚙️",
      title: "Adam adaptándose bien",
      body:  "Adam mantiene una media móvil del gradiente (momentum) y una del cuadrado del gradiente (RMSProp). " +
             "Divide el paso por la raíz de la segunda — pesos con gradientes grandes reciben pasos pequeños, " +
             "pesos con gradientes pequeños reciben pasos grandes. Esto estabiliza el entrenamiento.",
    },
  },

  // ── CONSEJO GENERAL DE LEARNING RATE ────────────────────────────────────

  {
    check: t =>
      t.lr >= 0.1 &&
      trained(t, 200) &&
      t.loss !== null &&
      t.loss > 0.3,
    message: {
      type:  "tip",
      icon:  "🎛️",
      title: "Learning rate alto — el entrenamiento puede ser inestable",
      body:  "Con lr=0.1, cada actualización de peso es grande. Si el gradiente apunta en dirección equivocada, " +
             "el salto puede hacer que la pérdida suba en lugar de bajar. " +
             "Prueba lr=0.01 con Adam — converge más lento pero de forma mucho más estable.",
    },
  },

];

// ── Hook principal ────────────────────────────────────────────────────────────

export function useTutor(input: TutorInput): TutorMessage | null {
  return useMemo(() => {
    for (const rule of RULES) {
      if (rule.check(input)) {
        return typeof rule.message === "function" ? rule.message(input) : rule.message;
      }
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input.problem.id,
    input.hiddenLayers,
    input.optimizerType,
    input.lr,
    input.epochs,
    input.accuracy,
    input.loss,
  ]);
}
