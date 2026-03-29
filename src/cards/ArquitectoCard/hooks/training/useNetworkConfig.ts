import { useState, useCallback } from 'react'
import type { ActivationType } from '../../../../components/lib'

export interface LayerConfig {
  neurons: number
  activation: ActivationType
}

export type OptimizerType = 'sgd' | 'momentum' | 'adam'

export function useNetworkConfig(
  initialLayers: LayerConfig[],
  initialOpt: OptimizerType,
  initialLr: number,
  initialEpf: number
) {
  const [hiddenLayers, setHiddenLayers] = useState<LayerConfig[]>(initialLayers)
  const [optimizerType, setOptimizerType] = useState<OptimizerType>(initialOpt)
  const [lr, setLrState] = useState(initialLr)
  const [epf, setEpfState] = useState(initialEpf)

  // Helpers for updating config
  const addLayer = useCallback(() => {
    setHiddenLayers((prev) => [...prev, { neurons: 4, activation: 'relu' }])
  }, [])
  const removeLayer = useCallback((i: number) => {
    setHiddenLayers((prev) => prev.filter((_, idx) => idx !== i))
  }, [])
  const updateLayer = useCallback((i: number, patch: Partial<LayerConfig>) => {
    setHiddenLayers((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }, [])

  return {
    hiddenLayers,
    setHiddenLayers,
    optimizerType,
    setOptimizerType,
    lr,
    setLr: setLrState,
    epf,
    setEpf: setEpfState,
    addLayer,
    removeLayer,
    updateLayer
  }
}
