// ─── curriculumLevels ──────────────────────────────────────────────────────────
//
// Define los 4 niveles del modo currículum guiado.
// Cada nivel restringe la arquitectura y exige una meta de precisión.
// Al completar la meta se desbloquea el siguiente nivel con más libertad.
//

import { PROBLEMS, type Problem } from '../problems'

const byId = (id: string): Problem => PROBLEMS.find((p) => p.id === id)!

export interface CurriculumLevel {
  id: number
  emoji: string
  titulo: string
  mision: string // qué tiene que hacer el usuario
  lesson: string // qué aprende al completarlo
  pista: string // cómo lograrlo
  problem: Problem
  maxHiddenLayers: number
  maxNeurons: number // por capa
  goalAccuracy: number
  unlockMsg: string // qué se desbloquea (o mensaje final)
}

export const CURRICULUM_LEVELS: CurriculumLevel[] = [
  {
    id:              1,
    emoji:           "📏",
    titulo:          "La línea recta",
    mision:          "Entrena la red sin capas ocultas hasta 92 % de precisión. La diagonal es linealmente separable — una sola neurona puede con esto.",
    lesson:          "Una neurona sin capas ocultas traza exactamente una línea recta. Funciona para cualquier problema donde las dos clases se pueden separar con una regla como \"y > x\".",
    pista:           "No añadas capas — no puedes. Dale épocas y deja que el gradiente encuentre la línea. Adam con lr = 0.05 converge rápido.",
    problem:         byId("diagonal"),
    maxHiddenLayers: 0,
    maxNeurons:      0,
    goalAccuracy:    0.92,
    unlockMsg:       "🔓 Primera capa oculta disponible. Con neuronas ocultas la red puede aprender fronteras curvas.",
  },
  {
    id:              2,
    emoji:           "🎉",
    titulo:          "¿Voy a la fiesta?",
    mision:          "XOR — cuatro esquinas con etiquetas opuestas. Una línea recta no puede separar esto. Añade una capa oculta y consigue 85 % de precisión.",
    lesson:          "Una sola neurona traza una línea recta. El XOR necesita dos líneas — exactamente lo que una capa oculta permite. Esta es la demostración clásica de por qué la profundidad importa.",
    pista:           "Una capa oculta con 4–8 neuronas. ReLU o Tanh funcionan bien aquí. Adam lr = 0.05.",
    problem:         byId("fiesta"),
    maxHiddenLayers: 1,
    maxNeurons:      8,
    goalAccuracy:    0.85,
    unlockMsg:       "🔓 Más neuronas por capa disponibles. La red puede ahora representar fronteras más complejas.",
  },
  {
    id:              3,
    emoji:           "⭕",
    titulo:          "El círculo",
    mision:          "Los puntos azules están dentro del círculo. La frontera debe ser curva y cerrada — imposible con una sola capa. Consigue 88 % de precisión.",
    lesson:          "Una capa oculta puede aprender fronteras no lineales simples. El círculo exige que la red combine varias neuronas para aproximar la curva.",
    pista:           "Una capa oculta con 8–16 neuronas. Tanh suele funcionar mejor que ReLU aquí. Adam lr = 0.05.",
    problem:         byId("circulo"),
    maxHiddenLayers: 1,
    maxNeurons:      16,
    goalAccuracy:    0.88,
    unlockMsg:       "🔓 Segunda (y tercera) capa oculta disponible. Apilar capas permite aprendizaje jerárquico.",
  },
  {
    id:              4,
    emoji:           "🌀",
    titulo:          "La espiral",
    mision:          "Dos espirales entrelazadas — el benchmark definitivo. Una capa no alcanza. Construye una red con 2–3 capas y consigue 85 %.",
    lesson:          "La profundidad permite que cada capa aprenda representaciones más abstractas sobre las anteriores. La primera capa detecta bordes, las siguientes, patrones de bordes — y así sucesivamente.",
    pista:           "2–3 capas · 8–16 neuronas · ReLU o Tanh. Evita Sigmoid (vanishing gradient). Adam lr = 0.01. Necesitarás paciencia — puede tardar miles de épocas.",
    problem:         byId("espiral"),
    maxHiddenLayers: 3,
    maxNeurons:      16,
    goalAccuracy:    0.85,
    unlockMsg:       "🏆 ¡Curriculum completo! Construiste una red desde cero — de una línea recta a separar la espiral.",
  },
];

export const CURRICULUM_STORAGE_KEY = "arquitecto-curriculum";
