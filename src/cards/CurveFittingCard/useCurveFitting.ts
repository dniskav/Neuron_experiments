// ─── useCurveFitting ───────────────────────────────────────────────────────────
//
// Hook that trains a NetworkN to approximate a mathematical function.
// Returns state + controls for the CurveFittingCard component.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react'
import { NetworkN, relu, linear, Adam } from '@dniskav/neuron'

// ── Types ───────────────────────────────────────────────────────────────────────

export type FunctionId = 'sin' | 'x2' | 'tanh'

interface Point { x: number; y: number }

// ── Constants ───────────────────────────────────────────────────────────────────

const LR = 0.001
const SAMPLES_PER_STEP = 32
const EPOCHS_PER_FRAME = 5
const CANVAS_W = 480
const CANVAS_H = 320

const FUNCTIONS: Record<FunctionId, (x: number) => number> = {
  sin:  Math.sin,
  x2:   (x) => x * x,
  tanh: Math.tanh,
}

const LABELS: Record<FunctionId, string> = {
  sin:  'sin(x)',
  x2:   'x\u00B2',
  tanh: 'tanh(x)',
}

function createNet(): NetworkN {
  return new NetworkN([1, 32, 32, 1], {
    activations: [relu, relu, linear],
    optimizer:   () => new Adam(),
  })
}

// ── Canvas helpers ──────────────────────────────────────────────────────────────

// ── Hook ────────────────────────────────────────────────────────────────────────

export function useCurveFitting() {
  const netRef       = useRef<NetworkN>(createNet())
  const animFrameRef = useRef<number | null>(null)
  const fnRef        = useRef<FunctionId>('sin')

  const [epochs,      setEpochs]      = useState(0)
  const [loss,        setLoss]        = useState<number | null>(null)
  const [training,    setTraining]    = useState(false)
  const [selectedFn,  setSelectedFn]  = useState<FunctionId>('sin')
  const [trueCurve,   setTrueCurve]   = useState<Point[]>([])
  const [predCurve,   setPredCurve]   = useState<Point[]>([])

  // Build the evaluation curves (100 sample points in [-1, 1])
  const updateCurves = useCallback(() => {
    const fn   = FUNCTIONS[fnRef.current]
    const pts  = 100
    const true_: Point[] = []
    const pred_: Point[] = []
    for (let i = 0; i <= pts; i++) {
      const x = -1 + (i / pts) * 2
      true_.push({ x, y: fn(x) })
      pred_.push({ x, y: netRef.current.predict([x])[0] })
    }
    setTrueCurve(true_)
    setPredCurve(pred_)
  }, [])

  // Train one epoch: sample random points, train the network
  const trainEpoch = useCallback((): number => {
    const fn = FUNCTIONS[fnRef.current]
    let errTotal = 0
    for (let i = 0; i < SAMPLES_PER_STEP; i++) {
      const x = Math.random() * 2 - 1   // [-1, 1]
      const y = fn(x)
      errTotal += netRef.current.train([x], [y], LR)
    }
    return errTotal / SAMPLES_PER_STEP
  }, [])

  // Animation loop
  const step = useCallback(() => {
    let err = 0
    for (let i = 0; i < EPOCHS_PER_FRAME; i++) err = trainEpoch()
    setEpochs(e => e + EPOCHS_PER_FRAME)
    setLoss(err)
    updateCurves()
    animFrameRef.current = requestAnimationFrame(step)
  }, [trainEpoch, updateCurves])

  const startTraining = useCallback(() => {
    if (training) return
    setTraining(true)
    animFrameRef.current = requestAnimationFrame(step)
  }, [training, step])

  const pause = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setTraining(false)
  }, [])

  // Single step (for the "1 época" button)
  const singleStep = useCallback(() => {
    if (training) return
    const err = trainEpoch()
    setEpochs(e => e + 1)
    setLoss(err)
    updateCurves()
  }, [training, trainEpoch, updateCurves])

  const reset = useCallback(() => {
    pause()
    netRef.current = createNet()
    setEpochs(0)
    setLoss(null)
    updateCurves()
  }, [pause, updateCurves])

  const selectFn = useCallback((id: FunctionId) => {
    setSelectedFn(id)
    fnRef.current = id
    reset()
  }, [reset])

  // Initial curve evaluation
  useEffect(() => { updateCurves() }, [updateCurves])

  // Cleanup on unmount
  useEffect(() => () => {
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
  }, [])

  return {
    epochs,
    loss,
    training,
    selectedFn,
    selectedLabel: LABELS[selectedFn],
    trueCurve,
    predCurve,
    startTraining,
    pause,
    singleStep,
    reset,
    selectFn,
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
  }
}
