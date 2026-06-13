// ─── useSudokuRL — React adapter ──────────────────────────────────────────────
//
// Crea los refs de React, instancia SudokuSession (lógica pura) y se suscribe
// a los cambios de estado para desencadenar re-renders.
//
// Para migrar a Vue/Angular: crear refs equivalentes y usar SudokuSession igual.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react'
import { SudokuSession } from '../../core/sudoku/SudokuSession'
import type { SudokuSessionState, HiddenLayer, ActKey, Difficulty } from '../../core/sudoku/SudokuSession'

export type { HiddenLayer, ActKey, Difficulty, SudokuSessionState }

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_LAYERS: HiddenLayer[] = [
  { neurons: 512, activation: 'relu' },
  { neurons: 256, activation: 'relu' },
]

// ─────────────────────────────────────────────────────────────────────────────

export function useSudokuRL(initialDifficulty: Difficulty = 'easy') {

  // ── Refs para canvas / diagrama (sin re-render) ───────────────────────────
  const boardRef       = useRef<number[]>(new Array(81).fill(0))
  const confidenceRef  = useRef<number[]>(new Array(81).fill(0))
  const activationsRef = useRef<number[][]>([])

  // ── Ref de control ────────────────────────────────────────────────────────
  const trainSpeedRef = useRef(1)

  // ── Sesión (creada una sola vez) ──────────────────────────────────────────
  const sessionRef = useRef<SudokuSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = new SudokuSession(DEFAULT_LAYERS, initialDifficulty, {
      board:       boardRef,
      confidence:  confidenceRef,
      activations: activationsRef,
      trainSpeed:  trainSpeedRef,
    })
  }

  // ── Estado React ──────────────────────────────────────────────────────────
  const [state, setState] = useState<SudokuSessionState>(
    () => sessionRef.current!.getState()
  )

  const [hiddenLayers, setHiddenLayers] = useState<HiddenLayer[]>(DEFAULT_LAYERS)
  const [trainSpeed,   setTrainSpeedState] = useState(1)

  useEffect(() => sessionRef.current!.subscribe(setState), [])

  // Propagar cambios de arquitectura
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    sessionRef.current!.setArchitecture(hiddenLayers)
  }, [hiddenLayers])

  useEffect(() => () => sessionRef.current!.destroy(), [])

  // ── Handlers de arquitectura ──────────────────────────────────────────────
  const addLayer    = useCallback(() =>
    setHiddenLayers(p => [...p, { neurons: 128, activation: 'relu' as ActKey }]), [])
  const removeLayer = useCallback((i: number) =>
    setHiddenLayers(p => p.filter((_, idx) => idx !== i)), [])
  const updateLayer = useCallback((i: number, patch: Partial<HiddenLayer>) =>
    setHiddenLayers(p => p.map((l, idx) => idx === i ? { ...l, ...patch } : l)), [])

  const setTrainSpeed = useCallback((v: number) => {
    trainSpeedRef.current = v
    setTrainSpeedState(v)
  }, [])

  return {
    // Estado
    state,
    boardRef,
    confidenceRef,
    activationsRef,
    // Arquitectura
    hiddenLayers,
    trainSpeed,
    addLayer, removeLayer, updateLayer,
    setTrainSpeed,
    // Controles entrenamiento
    startTraining: () => sessionRef.current!.startTraining(),
    pause:         () => sessionRef.current!.pause(),
    reset:         () => sessionRef.current!.reset(),
    // Controles inferencia
    inferStep:      () => sessionRef.current!.inferStep(),
    inferAll:       () => sessionRef.current!.inferAll(),
    resetInference: () => sessionRef.current!.resetInference(),
    newPuzzle:      () => sessionRef.current!.newPuzzle(),
    setDifficulty:  (d: Difficulty) => sessionRef.current!.setDifficulty(d),
  }
}
