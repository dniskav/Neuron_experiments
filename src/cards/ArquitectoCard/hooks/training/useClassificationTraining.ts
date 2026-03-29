import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  NetworkN,
  SGD,
  Momentum,
  Adam,
  relu,
  leakyRelu,
  sigmoid,
  tanh,
  linear,
  elu
} from '@dniskav/neuron'
import type { LayerConfig, OptimizerType } from './useNetworkConfig'
import type { Problem } from '../../data/problems'

const ACT_MAP: Record<string, { fn: (x: number) => number; dfn: (o: number) => number }> = {
  relu,
  leakyRelu,
  sigmoid,
  tanh,
  linear,
  elu
}
const OPT_MAP: Record<OptimizerType, () => unknown> = {
  sgd: () => new SGD(),
  momentum: () => new Momentum(),
  adam: () => new Adam()
}

function buildNet(hidden: LayerConfig[], opt: OptimizerType) {
  const sizes = [2, ...hidden.map((l) => l.neurons), 1]
  const acts = [...hidden.map((l) => ACT_MAP[l.activation] ?? relu), sigmoid]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts, optimizer: OPT_MAP[opt] as any })
}

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs]
  for (const layer of net.layers) acts.push(layer.predict(acts[acts.length - 1]))
  return acts
}

function calcAccuracy(net: NetworkN, points: { x: number; y: number; label: number }[]): number {
  let ok = 0
  for (const { x, y, label } of points) if ((net.predict([x, y])[0] >= 0.5 ? 1 : 0) === label) ok++
  return ok / points.length
}

export function useClassificationTraining(
  problem: Problem,
  config: {
    hiddenLayers: LayerConfig[]
    optimizerType: OptimizerType
    lr: number
    epf: number
  }
) {
  const netRef = useRef<NetworkN>(buildNet(config.hiddenLayers, config.optimizerType))
  const runningRef = useRef(false)
  const animRef = useRef<number | null>(null)
  const activationsRef = useRef<number[][]>([])
  const epochsAccRef = useRef(0)

  const points = useMemo(() => problem.generar(), [problem])

  const [entrenando, setEntrenando] = useState(false)
  const [epochs, setEpochs] = useState(0)
  const [loss, setLoss] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [drawVersion, setDrawVersion] = useState(0)

  useEffect(() => {
    runningRef.current = false
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    netRef.current = buildNet(config.hiddenLayers, config.optimizerType)
    epochsAccRef.current = 0
    setEntrenando(false)
    setEpochs(0)
    setLoss(null)
    setAccuracy(null)
    setDrawVersion((v) => v + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.hiddenLayers, config.optimizerType, problem])

  const loop = useCallback(() => {
    if (!runningRef.current) return
    const net = netRef.current
    const shuffled = [...points].sort(() => Math.random() - 0.5)
    let totalLoss = 0
    let lastInp = [0.5, 0.5]
    for (let e = 0; e < config.epf; e++) {
      for (const { x, y, label } of shuffled) {
        totalLoss += net.train([x, y], [label], config.lr)
        lastInp = [x, y]
      }
    }
    epochsAccRef.current += config.epf
    activationsRef.current = computeActs(net, lastInp)
    setEpochs(epochsAccRef.current)
    setLoss(totalLoss / (config.epf * points.length))
    setAccuracy(calcAccuracy(net, points))
    setDrawVersion((v) => v + 1)
    animRef.current = requestAnimationFrame(loop)
  }, [points, config])

  const iniciar = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    setEntrenando(true)
    loop()
  }, [loop])

  const pausar = useCallback(() => {
    runningRef.current = false
    setEntrenando(false)
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [])

  const resetear = useCallback(() => {
    pausar()
    netRef.current = buildNet(config.hiddenLayers, config.optimizerType)
    epochsAccRef.current = 0
    setEpochs(0)
    setLoss(null)
    setAccuracy(null)
    setDrawVersion((v) => v + 1)
  }, [pausar, config.hiddenLayers, config.optimizerType])

  useEffect(
    () => () => {
      runningRef.current = false
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    },
    []
  )

  return {
    points,
    netRef,
    activationsRef,
    entrenando,
    epochs,
    loss,
    accuracy,
    drawVersion,
    iniciar,
    pausar,
    resetear
  }
}
