import { Box, Flex, Text } from '@chakra-ui/react'
import { GOAL_FWD, GOAL_SUCCESS_RATE, GOAL_STEPS_L3, GOAL_STEPS_L4 } from '../useAgentRL'
import type { Level } from '../useAgentRL'

interface Props {
  level: Level
  fwdPct: number
  successRate: number
  avgSteps: number
  solved: boolean
}

export function GoalBar({ level, fwdPct, successRate, avgSteps, solved }: Props) {
  const pct =
    level === 1 ? Math.min(fwdPct / GOAL_FWD, 1)
    : level === 2 ? Math.min(successRate / GOAL_SUCCESS_RATE, 1)
    : level === 3 ? Math.min(avgSteps / GOAL_STEPS_L3, 1)
    : Math.min(avgSteps / GOAL_STEPS_L4, 1)

  const label =
    level === 1 ? `${(fwdPct * 100).toFixed(0)} %`
    : level === 2 ? `${(successRate * 100).toFixed(0)} %`
    : `${avgSteps} pasos`

  const desc =
    level === 1 ? `META — ir adelante > ${(GOAL_FWD * 100).toFixed(0)} % del tiempo`
    : level === 2 ? `META — frenar a tiempo > ${(GOAL_SUCCESS_RATE * 100).toFixed(0)} % de los episodios`
    : level === 3 ? `META — promedio > ${GOAL_STEPS_L3} pasos sin chocar`
    : `META — promedio > ${GOAL_STEPS_L4} pasos sin chocar`

  return (
    <Box>
      <Flex justify="space-between" mb={1}>
        <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide">
          {desc}
        </Text>
        <Text fontSize="11px" fontWeight={700} color={solved ? '#4ade80' : 'gray.500'}>
          {label}
        </Text>
      </Flex>
      <Box bg="gray.100" borderRadius="full" h="6px" overflow="hidden">
        <Box
          h="100%"
          borderRadius="full"
          bg={solved ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#6366f1,#818cf8)'}
          style={{ width: `${pct * 100}%`, transition: 'width 0.5s ease' }}
        />
      </Box>
    </Box>
  )
}
