import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { generateObstacle } from '../agentWorld'
import type { Obstacle } from '../useAgentRL'

interface Props {
  obstacles: (Obstacle | null)[]
  onChange: (index: number, value: Obstacle | null) => void
}

export function ObstacleControls({ obstacles, onChange }: Props) {
  return (
    <Box bg="gray.50" borderRadius="xl" p={3}>
      <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide" mb={2}>
        OBSTÁCULOS
      </Text>
      <Flex direction="column" gap={2}>
        {obstacles.map((state, i) => (
          <Flex key={i} align="center" gap={2}>
            <Text fontSize="11px" color="gray.500" w="38px" flexShrink={0}>
              OBS {i + 1}
            </Text>
            <Button
              size="xs" flex={1}
              variant={state ? 'solid' : 'outline'} colorPalette="rose"
              onClick={() => onChange(i, state ? null : generateObstacle())}>
              {state ? 'ON' : 'OFF'}
            </Button>
            <Button
              size="xs" variant="outline" colorPalette="gray"
              onClick={() => onChange(i, generateObstacle())}
              title="Nueva posición aleatoria">
              ⟳
            </Button>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}
