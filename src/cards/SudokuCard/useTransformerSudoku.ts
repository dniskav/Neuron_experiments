// ─── useTransformerSudoku — React adapter ─────────────────────────────────────
//
// Crea los refs de React, instancia TransformerSudokuSession y se suscribe
// a los cambios de estado para desencadenar re-renders.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react'
import { TransformerSudokuSession } from '../../core/sudoku/TransformerSudokuSession'
import type { TransformerSudokuState, Difficulty } from '../../core/sudoku/TransformerSudokuSession'

export type { TransformerSudokuState, Difficulty }

// ─────────────────────────────────────────────────────────────────────────────

export function useTransformerSudoku(initialDifficulty: Difficulty = 'easy') {

  // ── Refs para canvas / visualización (sin re-render) ──────────────────────
  const boardRef            = useRef<number[]>(new Array(81).fill(0))
  const confidenceRef       = useRef<number[]>(new Array(81).fill(0))
  const attentionWeightsRef = useRef<(number[][] | null)[][]>([])

  // ── Ref de control ────────────────────────────────────────────────────────
  const trainSpeedRef = useRef(1)

  // ── Sesión (creada una sola vez) ──────────────────────────────────────────
  const sessionRef = useRef<TransformerSudokuSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = new TransformerSudokuSession(initialDifficulty, {
      board:            boardRef,
      confidence:       confidenceRef,
      trainSpeed:       trainSpeedRef,
      attentionWeights: attentionWeightsRef,
    })
  }

  // ── Estado React ──────────────────────────────────────────────────────────
  const [state, setState] = useState<TransformerSudokuState>(
    () => sessionRef.current!.getState()
  )

  const [trainSpeed, setTrainSpeedState] = useState(1)

  useEffect(() => sessionRef.current!.subscribe(setState), [])
  useEffect(() => () => sessionRef.current!.destroy(), [])

  const setTrainSpeed = useCallback((v: number) => {
    trainSpeedRef.current = v
    setTrainSpeedState(v)
  }, [])

  return {
    state,
    boardRef,
    confidenceRef,
    attentionWeightsRef,
    trainSpeed,
    setTrainSpeed,
    // Entrenamiento
    startTraining: () => sessionRef.current!.startTraining(),
    pause:         () => sessionRef.current!.pause(),
    reset:         () => sessionRef.current!.reset(),
    // Inferencia
    inferStep:      () => sessionRef.current!.inferStep(),
    inferAll:       () => sessionRef.current!.inferAll(),
    resetInference: () => sessionRef.current!.resetInference(),
    newPuzzle:      () => sessionRef.current!.newPuzzle(),
    setDifficulty:  (d: Difficulty) => sessionRef.current!.setDifficulty(d),
  }
}
