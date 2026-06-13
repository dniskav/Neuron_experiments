import { useRef } from 'react'
import { Flex } from '@chakra-ui/react'
import { NetworkDiagram } from '../components/NetworkDiagram'

export default { title: 'Lab Components' }

export const NetworkDiagramMLP = () => (
  <NetworkDiagram
    optimizer="Adam · lr = 0.025"
    layers={[
      { size: 2 },
      { size: 8,  activation: 'relu' },
      { size: 4,  activation: 'relu' },
      { size: 1,  activation: 'sigmoid' },
    ]}
  />
)
NetworkDiagramMLP.storyName = 'NetworkDiagram — MLP simple'

export const NetworkDiagramSudoku = () => (
  <NetworkDiagram
    optimizer="Adam · lr = 0.001"
    layers={[
      { size: 729 },
      { size: 256, activation: 'relu' },
      { size: 128, activation: 'relu' },
      { size: 729, activation: 'linear' },
    ]}
  />
)
NetworkDiagramSudoku.storyName = 'NetworkDiagram — Sudoku MLP'

export const NetworkDiagramConActivaciones = () => {
  // Simulamos activaciones aleatorias para ver el efecto visual
  const activationsRef = useRef<number[][]>([
    [0.1, 0.9],
    Array.from({ length: 8 },  () => Math.random()),
    Array.from({ length: 4 },  () => Math.random()),
    [Math.random()],
  ])

  return (
    <Flex direction="column" gap={2}>
      <NetworkDiagram
        optimizer="Adam · lr = 0.025"
        activationsRef={activationsRef}
        layers={[
          { size: 2 },
          { size: 8,  activation: 'leakyRelu' },
          { size: 4,  activation: 'tanh'      },
          { size: 1,  activation: 'sigmoid'   },
        ]}
      />
    </Flex>
  )
}
NetworkDiagramConActivaciones.storyName = 'NetworkDiagram — con activaciones (neuronas encendidas)'
