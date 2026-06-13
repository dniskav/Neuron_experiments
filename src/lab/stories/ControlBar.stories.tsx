import { useState } from 'react'
import { Flex, Text } from '@chakra-ui/react'
import { ControlBar } from '../components/ControlBar'

export default { title: 'Lab Components' }

export const ControlBarInteractivo = () => {
  const [running, setRunning] = useState(false)
  return (
    <Flex direction="column" gap={4} maxW="400px">
      <Text fontSize="11px" color="gray.500">
        running: <strong style={{ color: running ? '#4ade80' : '#f87171' }}>
          {String(running)}
        </strong>
      </Text>
      <ControlBar
        running={running}
        onStart={() => setRunning(true)}
        onPause={() => setRunning(false)}
        onReset={() => setRunning(false)}
      />
    </Flex>
  )
}
ControlBarInteractivo.storyName = 'ControlBar — básico (interactivo)'

export const ControlBarConInferencia = () => {
  const [running, setRunning]   = useState(false)
  const [iter, setIter]         = useState(0)
  const [solved, setSolved]     = useState(false)
  return (
    <Flex direction="column" gap={4} maxW="400px">
      <Text fontSize="11px" color="gray.500">
        iter: {iter} · solved: <strong style={{ color: solved ? '#4ade80' : 'gray' }}>
          {String(solved)}
        </strong>
      </Text>
      <ControlBar
        running={running}
        onStart={() => setRunning(true)}
        onPause={() => setRunning(false)}
        onReset={() => { setRunning(false); setIter(0); setSolved(false) }}
        inferenceButtons={[
          {
            label: '▷ Un paso',
            colorPalette: 'teal',
            onClick: () => { setIter(i => i + 1); if (iter >= 4) setSolved(true) },
            disabled: solved,
          },
          {
            label: '⚡ Resolver',
            colorPalette: 'green',
            onClick: () => { setIter(20); setSolved(true) },
            disabled: solved,
          },
        ]}
      />
    </Flex>
  )
}
ControlBarConInferencia.storyName = 'ControlBar — con botones de inferencia'
