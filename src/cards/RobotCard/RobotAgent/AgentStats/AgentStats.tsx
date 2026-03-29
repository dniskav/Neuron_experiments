import { Box, Flex, Text } from '@chakra-ui/react'
import { EpsilonBadge } from '../../../../components/shared/EpsilonBadge'
import type { StatEntry } from './StatEntry'

interface Props {
  stats: StatEntry[]
  epsilon: number
}

export function AgentStats({ stats, epsilon }: Props) {
  return (
    <Box bg="gray.50" borderRadius="xl" p={3}>
      <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide" mb={3}>
        ESTADÍSTICAS
      </Text>
      <Flex direction="column" gap={2}>
        {stats.map(({ label, value, highlight }) => (
          <Flex key={label} justify="space-between">
            <Text fontSize="12px" color="gray.500">{label}</Text>
            <Text fontSize="12px" fontWeight={700} color={highlight ? '#22c55e' : 'gray.700'}>
              {value}
            </Text>
          </Flex>
        ))}
      </Flex>
      <Box mt={3}>
        <EpsilonBadge epsilon={epsilon} />
      </Box>
    </Box>
  )
}
