import type { Level } from '../useAgentRL'

export const LEVEL_INFO: Record<Level, {
  emoji: string
  title: string
  badge: string
  desc: React.ReactNode
  inputLabel: string
  actions: readonly string[]
}> = {
  1: {
    emoji: '🚗',
    title: 'Nivel 1 — Solo adelante',
    badge: '0 sensores · 2 acciones',
    desc: (
      <>
        Sin sensores, la red solo puede aprender a <strong>siempre ir adelante</strong>. Sin
        importar lo que haya enfrente, el agente va recto hasta chocar.
      </>
    ),
    inputLabel: '1 constante',
    actions: ['▶ adelante', '⏹ frenar'],
  },
  2: {
    emoji: '📡',
    title: 'Nivel 2 — Sensor frontal',
    badge: '1 sensor · 2 acciones',
    desc: (
      <>
        El agente ahora <strong>ve la distancia</strong> a la pared de enfrente. ¿Puede aprender a
        frenar justo antes de chocar?
      </>
    ),
    inputLabel: 'dist. frontal',
    actions: ['▶ adelante', '⏹ frenar'],
  },
  3: {
    emoji: '🤖',
    title: 'Nivel 3 — Sensor izquierdo',
    badge: '2 sensores · 2 acciones',
    desc: (
      <>
        El agente tiene un <strong>sensor lateral izquierdo</strong>. Cuando la pared está cerca,
        puede girar a la izquierda si hay espacio libre. El objetivo: sobrevivir el mayor tiempo
        posible sin chocar.
      </>
    ),
    inputLabel: 'front · izq',
    actions: ['▶ adelante', '↺ girar izq'],
  },
  4: {
    emoji: '🧠',
    title: 'Nivel 4 — Sensores izq + der',
    badge: '3 sensores · 3 acciones',
    desc: (
      <>
        El agente tiene sensores <strong>frontal, izquierdo y derecho</strong>. Puede elegir girar
        hacia cualquier lado — ahora tiene que decidir cuál es el mejor camino.
      </>
    ),
    inputLabel: 'front · izq · der',
    actions: ['▶ adelante', '↺ izq', '↻ der'],
  },
}
