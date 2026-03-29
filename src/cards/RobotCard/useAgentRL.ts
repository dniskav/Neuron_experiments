// ─── useAgentRL — React adapter ───────────────────────────────────────────────
//
// Crea los refs de React, instancia RobotSession (lógica pura) y se suscribe
// a los cambios de estado para desencadenar re-renders.
//
// Para migrar a Vue/Angular: crear refs equivalentes y usar RobotSession igual.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react'
import { RobotSession } from '../../core/robot/RobotSession'
import type { AgentState } from './agentWorld'

export type {
  Level, HiddenLayer, ActKey, Obstacle, AgentStats,
} from '../../core/robot/RobotSession'

export {
  DEFAULT_HIDDEN,
  GOAL_FWD, GOAL_SUCCESS_RATE, GOAL_STEPS_L3, GOAL_STEPS_L4,
  STOP_DIST,
} from '../../core/robot/RobotSession'

import type { Level, HiddenLayer, ActKey, AgentStats, Obstacle } from '../../core/robot/RobotSession'
import { DEFAULT_HIDDEN } from '../../core/robot/RobotSession'

// ─────────────────────────────────────────────────────────────────────────────

export function useAgentRL(level: Level = 1, initialHiddenLayers: HiddenLayer[] = DEFAULT_HIDDEN) {

  // ── Refs visuales (leídos por AgentCanvas sin re-render) ──────────────────
  const agentRef       = useRef<AgentState>({ x: 185, y: 185, heading: 0 })
  const trailRef       = useRef<{ x: number; y: number }[]>([])
  const activationsRef = useRef<number[][]>([])

  // ── Refs de control (escritos por useSpeedControls / useObstacles) ────────
  const testingRef    = useRef(false)
  const speedRef      = useRef(0.1)
  const trainSpeedRef = useRef(1)
  const obstaclesRef  = useRef<Obstacle[]>([])

  // ── Sesión (creada una sola vez) ──────────────────────────────────────────
  const sessionRef = useRef<RobotSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = new RobotSession(level, initialHiddenLayers, {
      agent: agentRef, trail: trailRef, activations: activationsRef,
      speed: speedRef, trainSpeed: trainSpeedRef,
      obstacles: obstaclesRef, testing: testingRef,
    })
  }

  // ── Estado React (para re-renders de la UI) ───────────────────────────────
  const [hiddenLayers, setHiddenLayers] = useState<HiddenLayer[]>(initialHiddenLayers)
  const [stats, setStats]               = useState<AgentStats>(() => sessionRef.current!.getState())

  // Suscribir al estado de la sesión
  useEffect(() => sessionRef.current!.subscribe(setStats), [])

  // Reconstruir red cuando cambia arquitectura o nivel
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    sessionRef.current!.setArchitecture(hiddenLayers, level)
  }, [hiddenLayers, level])

  // Limpiar al desmontar
  useEffect(() => () => sessionRef.current!.destroy(), [])

  // ── Gestión de capas ──────────────────────────────────────────────────────
  const addLayer    = useCallback(() =>
    setHiddenLayers(p => [...p, { neurons: 8, activation: 'relu' as ActKey }]), [])
  const removeLayer = useCallback((i: number) =>
    setHiddenLayers(p => p.filter((_, idx) => idx !== i)), [])
  const updateLayer = useCallback((i: number, patch: Partial<HiddenLayer>) =>
    setHiddenLayers(p => p.map((l, idx) => idx === i ? { ...l, ...patch } : l)), [])

  return {
    stats, trailRef, agentRef, activationsRef,
    start:  () => sessionRef.current!.start(),
    probar: () => sessionRef.current!.probar(),
    pause:  () => sessionRef.current!.pause(),
    reset:  () => sessionRef.current!.reset(),
    hiddenLayers, addLayer, removeLayer, updateLayer,
    testingRef, speedRef, trainSpeedRef, obstaclesRef,
  }
}
