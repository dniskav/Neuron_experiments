// ─── useSnakeRL — React adapter ───────────────────────────────────────────────
//
// Crea los refs de React, instancia SnakeSession (lógica pura) y se suscribe
// a los cambios de estado para desencadenar re-renders.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react'
import { NetworkN } from '@dniskav/neuron'
import { SnakeSession } from '../../../../core/snake/SnakeSession'
import type { SnakeSessionState, LayerConfig, OptimizerType } from '../../../../core/snake/SnakeSession'
import { initSnake } from '../../SnakeEnv'
import type { SnakeState } from '../../SnakeEnv'
import type { LeaderboardEntry } from '../../leaderboard'

export type { LayerConfig, OptimizerType }

// Re-export SnakeStats shape para compatibilidad con componentes existentes
export interface SnakeStats {
  score:     number
  epsilon:   number
  episodes:  number
  steps:     number
  bestScore: number
  demoScore: number
  demoBest:  number
}

// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LAYERS: LayerConfig[] = [
  { neurons: 16, activation: 'relu' },
  { neurons: 8,  activation: 'relu' },
]

export function useSnakeRL() {

  // ── Refs para canvas / diagrama (sin re-render) ───────────────────────────
  const stateRef       = useRef<SnakeState>(initSnake())
  const activationsRef = useRef<number[][]>([])
  const netRef         = useRef<NetworkN>(null as unknown as NetworkN)

  // ── Refs de control (escritos desde la UI, leídos por la sesión) ──────────
  const lrRef          = useRef(0.001)
  const demoSpeedRef   = useRef(120)
  const trainSpeedRef  = useRef(1)

  // ── Sesión (creada una sola vez) ──────────────────────────────────────────
  const sessionRef = useRef<SnakeSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = new SnakeSession(DEFAULT_LAYERS, 'adam', {
      state: stateRef, activations: activationsRef, net: netRef,
      lr: lrRef, demoSpeed: demoSpeedRef, trainSpeed: trainSpeedRef,
    })
  }

  // ── Estado de arquitectura (para LayerBuilder y triggers de rebuild) ──────
  const [hiddenLayers,  setHiddenLayers]  = useState<LayerConfig[]>(DEFAULT_LAYERS)
  const [optimizerType, setOptimizerType] = useState<OptimizerType>('adam')
  const [lr,            setLrState]       = useState(0.001)
  const [demoSpeed,     setDemoSpeedState]  = useState(120)
  const [trainSpeed,    setTrainSpeedState] = useState(1)

  // ── Estado notificado por la sesión ───────────────────────────────────────
  const [sessionState, setSessionState] = useState<SnakeSessionState>(
    () => sessionRef.current!.getState()
  )

  useEffect(() => sessionRef.current!.subscribe(setSessionState), [])

  // Propagar cambios de arquitectura a la sesión
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    sessionRef.current!.setArchitecture(hiddenLayers, optimizerType)
  }, [hiddenLayers, optimizerType])

  useEffect(() => () => sessionRef.current!.destroy(), [])

  // ── Handlers de arquitectura ──────────────────────────────────────────────
  const addLayer    = useCallback(() =>
    setHiddenLayers(p => [...p, { neurons: 8, activation: 'relu' as LayerConfig['activation'] }]), [])
  const removeLayer = useCallback((i: number) =>
    setHiddenLayers(p => p.filter((_, idx) => idx !== i)), [])
  const updateLayer = useCallback((i: number, patch: Partial<LayerConfig>) =>
    setHiddenLayers(p => p.map((l, idx) => idx === i ? { ...l, ...patch } : l)), [])

  const setLr = useCallback((v: number) => {
    lrRef.current = v
    setLrState(v)
  }, [])

  const setDemoSpeed = useCallback((ms: number) => {
    demoSpeedRef.current = ms
    setDemoSpeedState(ms)
  }, [])

  const setTrainSpeed = useCallback((v: number) => {
    trainSpeedRef.current = v
    setTrainSpeedState(v)
  }, [])

  const loadEntry = useCallback((entry: LeaderboardEntry) => {
    lrRef.current = entry.lr
    setLrState(entry.lr)
    setOptimizerType(entry.optimizer)
    setHiddenLayers(entry.hidden as LayerConfig[])
  }, [])

  // ── Extraer stats y flags del estado de la sesión ─────────────────────────
  const stats: SnakeStats = {
    score:     sessionState.score,
    epsilon:   sessionState.epsilon,
    episodes:  sessionState.episodes,
    steps:     sessionState.steps,
    bestScore: sessionState.bestScore,
    demoScore: sessionState.demoScore,
    demoBest:  sessionState.demoBest,
  }

  return {
    stateRef,
    redrawVersion: sessionState.drawVersion,
    stats,
    netRef,
    activationsRef,
    hiddenLayers, optimizerType, lr, demoSpeed,
    running:  sessionState.running,
    demo:     sessionState.demo,
    hasSave:  sessionState.hasSave,
    leaderboard: sessionState.leaderboard,
    iniciar:     () => sessionRef.current!.iniciar(),
    pausar:      () => sessionRef.current!.pausar(),
    resetear:    () => sessionRef.current!.resetear(),
    probar:      () => sessionRef.current!.probar(),
    detenerDemo: () => sessionRef.current!.detenerDemo(),
    setLr, setDemoSpeed, setTrainSpeed, setOptimizerType,
    trainSpeed,
    loadEntry,
    addLayer, removeLayer, updateLayer,
  }
}
