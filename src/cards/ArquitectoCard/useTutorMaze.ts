// ─── useTutorMaze ─────────────────────────────────────────────────────────────
//
// Tutor contextual para el agente del laberinto.
// Explica LSTM, BPTT, TD(λ), dead-ends y progreso.
//

import { useMemo } from "react";
import type { TutorMessage } from "./useTutor";
import type { DenseConfig, MazeStats } from "./useMazeRL";

interface TutorMazeInput {
  lstmSize:    number;
  denseLayers: DenseConfig[];
  lr:          number;
  stats:       MazeStats;
}

interface Rule {
  check:   (t: TutorMazeInput) => boolean;
  message: TutorMessage | ((t: TutorMazeInput) => TutorMessage);
}

const RULES: Rule[] = [

  // ── LSTM muy pequeño ────────────────────────────────────────────────────────

  {
    check: t => t.lstmSize < 8 && t.stats.episodios > 20,
    message: {
      type:  "critical",
      icon:  "🧠",
      title: "LSTM demasiado pequeño para este laberinto",
      body:  "El laberinto tiene 5 bifurcaciones — el agente debe recordar cuáles tomó. " +
             "Con un LSTM de solo " +
             "pocos estados ocultos, el espacio de representación es insuficiente para " +
             "codificar posición, historial y sensores simultáneamente. " +
             "Prueba con 16 o 32 estados ocultos.",
    },
  },

  // ── Sin capa densa, LSTM pequeño y tasa baja ─────────────────────────────

  {
    check: t => t.denseLayers.length === 0 && t.lstmSize <= 8 && t.stats.episodios > 30 && t.stats.tasa < 20,
    message: {
      type:  "warning",
      icon:  "📐",
      title: "LSTM directo a salida — representación limitada",
      body:  "Sin capas densas, el estado oculto del LSTM se mapea directamente a las 3 acciones. " +
             "El LSTM debe aprender a la vez a memorizar el camino Y a decidir la acción. " +
             "Una capa densa intermedia actúa como 'procesador': el LSTM almacena contexto " +
             "y la capa densa transforma ese contexto en decisiones.",
    },
  },

  // ── Fase inicial: primeros episodios ─────────────────────────────────────

  {
    check: t => t.stats.episodios < 15 && t.stats.episodios > 2,
    message: (t) => ({
      type:  "tip" as const,
      icon:  "🎲",
      title: `Episodio ${t.stats.episodios} — explorando con ε = ${t.stats.epsilon.toFixed(2)}`,
      body:  "El agente navega con alta exploración aleatoria. Esto llena la trayectoria LSTM " +
             "con situaciones variadas. A diferencia de Snake (replay buffer), aquí " +
             "se aprende de la trayectoria COMPLETA del episodio: BPTT propaga el error " +
             "desde el final hacia el inicio, crédito para cada decisión.",
    }),
  },

  // ── Progreso medio ───────────────────────────────────────────────────────

  {
    check: t => t.stats.episodios >= 15 && t.stats.episodios < 60 && t.stats.tasa < 30,
    message: (t) => ({
      type:  "tip" as const,
      icon:  "📈",
      title: `${t.stats.episodios} episodios — ε bajando a ${t.stats.epsilon.toFixed(2)}`,
      body:  "TD(λ) asigna crédito hacia atrás: la recompensa de llegar a la meta (+50) " +
             "se propaga con descuento γ=0.95 y traza λ=0.85 a cada paso anterior. " +
             "La primera bifurcación (más lejos de la meta) tarda más episodios en aprender " +
             "que la última — es el problema de asignación de crédito a largo plazo.",
    }),
  },

  // ── Waypoints como señal de progreso ─────────────────────────────────────

  {
    check: t => t.stats.waypoints >= 3 && t.stats.tasa < 30 && t.stats.episodios > 30,
    message: (t) => ({
      type:  "tip" as const,
      icon:  "📍",
      title: `${t.stats.waypoints}/5 waypoints — aprendiendo el camino correcto`,
      body:  "Los waypoints están dentro de los corredores correctos, nunca en callejones. " +
             "Que el agente los active significa que está tomando bifurcaciones correctas. " +
             "El LSTM retiene el historial de las celdas visitadas (entradas v0-v4) " +
             "para evitar repetir callejones ya explorados.",
    }),
  },

  // ── Tasa de éxito baja después de muchos episodios ───────────────────────

  {
    check: t => t.stats.episodios > 80 && t.stats.tasa < 15,
    message: {
      type:  "warning",
      icon:  "⚠️",
      title: "80+ episodios con tasa baja — revisa la arquitectura",
      body:  "El agente debería mejorar. Posibles causas: " +
             "LSTM demasiado pequeño (no retiene el historial), " +
             "learning rate alto (BPTT inestable con lr > 0.05), " +
             "o sin capa densa (mapeo directo LSTM→acción demasiado rígido). " +
             "Arquitectura recomendada: LSTM 16 → Densa 16 → Salida 3, Adam lr=0.02.",
    },
  },

  // ── Learning rate alto con BPTT ───────────────────────────────────────────

  {
    check: t => t.lr > 0.05 && t.stats.episodios > 20 && t.stats.tasa < 20,
    message: {
      type:  "warning",
      icon:  "🎛️",
      title: "Learning rate alto — BPTT puede ser inestable",
      body:  "En BPTT (backprop through time) los gradientes se multiplican a través " +
             "de todos los pasos del episodio (hasta 600). " +
             "Con lr alto, una sola actualización puede alterar drásticamente los pesos. " +
             "Para LSTM con secuencias largas, lr=0.01-0.03 es más seguro.",
    },
  },

  // ── Éxito moderado ───────────────────────────────────────────────────────

  {
    check: t => t.stats.tasa >= 30 && t.stats.tasa < 70 && t.stats.episodios >= 15,
    message: (t) => ({
      type:  "success" as const,
      icon:  "✨",
      title: `${t.stats.tasa}% de éxito — el LSTM está memorizando`,
      body:  "A esta tasa, el LSTM ha aprendido a distinguir bifurcaciones similares " +
             "usando su estado oculto como memoria. Las entradas v0-v4 (celdas visitadas) " +
             "ayudan enormemente: el agente ve explícitamente 'ya fui por ahí'. " +
             "Sin esas entradas, el LSTM tendría que aprender eso solo — tardaría " +
             "10x más episodios.",
    }),
  },

  // ── Alta tasa de éxito ───────────────────────────────────────────────────

  {
    check: t => t.stats.tasa >= 70 && t.stats.episodios >= 30,
    message: (t) => ({
      type:  "success" as const,
      icon:  "🏆",
      title: `¡${t.stats.tasa}% de éxito! El agente domina el laberinto`,
      body:  "A diferencia de una red feedforward que tomaría siempre la misma decisión " +
             "ante los mismos sensores (sin importar de dónde viene), " +
             "el LSTM recuerda la trayectoria: si ya exploró un callejón, " +
             "su estado oculto h reflejará eso y elegirá otra dirección. " +
             "Eso es exactamente lo que una red sin memoria no puede hacer.",
    }),
  },

  // ── Último episodio exitoso ───────────────────────────────────────────────

  {
    check: t => t.stats.exito && t.stats.episodios > 0,
    message: {
      type:  "success",
      icon:  "🎯",
      title: "¡Episodio completado! Meta alcanzada",
      body:  "La recompensa +50 se propaga hacia atrás con TD(λ): " +
             "el paso inmediatamente anterior recibe ≈47.5, el anterior ≈45.1, y así. " +
             "Las bifurcaciones correctas tomadas hace 100+ pasos reciben crédito " +
             "aunque sea pequeño — eso es lo que hace converger al agente.",
    },
  },

];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTutorMaze(input: TutorMazeInput): TutorMessage | null {
  return useMemo(() => {
    for (const rule of RULES) {
      if (rule.check(input)) {
        return typeof rule.message === "function" ? rule.message(input) : rule.message;
      }
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input.lstmSize,
    input.denseLayers,
    input.lr,
    input.stats.episodios,
    input.stats.tasa,
    input.stats.waypoints,
    input.stats.exito,
    input.stats.epsilon,
  ]);
}
