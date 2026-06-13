import { useState } from 'react'
import { Text } from '@chakra-ui/react'
import { LayerBuilder } from '../components/LayerBuilder'
import type { HiddenLayerConfig } from '../components/LayerBuilder'

export default { title: 'Lab Components' }

const initial: HiddenLayerConfig[] = [
  { neurons: 8, activation: 'relu' },
]

export const LayerBuilderInteractivo = () => {
  const [layers, setLayers] = useState<HiddenLayerConfig[]>(initial)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <LayerBuilder
        hiddenLayers={layers}
        onAdd={() => setLayers(l => [...l, { neurons: 4, activation: 'relu' }])}
        onRemove={(i) => setLayers(l => l.filter((_, idx) => idx !== i))}
        onUpdate={(i, patch) => setLayers(l => l.map((x, idx) => idx === i ? { ...x, ...patch } : x))}
        maxLayers={4}
        maxNeurons={512}
        inputLabel="3 sensores"
        outputLabel="3 Q-vals"
      />
      <Text fontSize="11px" color="gray.600" fontFamily="mono">
        {JSON.stringify(layers, null, 2)}
      </Text>
    </div>
  )
}
LayerBuilderInteractivo.storyName = 'LayerBuilder — interactivo'

export const LayerBuilderSudoku = () => {
  const [layers, setLayers] = useState<HiddenLayerConfig[]>([
    { neurons: 256, activation: 'relu' },
    { neurons: 128, activation: 'relu' },
  ])

  return (
    <LayerBuilder
      hiddenLayers={layers}
      onAdd={() => setLayers(l => [...l, { neurons: 64, activation: 'relu' }])}
      onRemove={(i) => setLayers(l => l.filter((_, idx) => idx !== i))}
      onUpdate={(i, patch) => setLayers(l => l.map((x, idx) => idx === i ? { ...x, ...patch } : x))}
      maxLayers={4}
      maxNeurons={512}
      inputLabel="729 inputs"
      outputLabel="729 logits"
    />
  )
}
LayerBuilderSudoku.storyName = 'LayerBuilder — config Sudoku'
