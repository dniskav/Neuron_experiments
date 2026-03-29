import { Box, Flex, Text } from '@chakra-ui/react'

export function EpsilonBadge({ epsilon }: { epsilon: number }) {
  const label =
    epsilon > 0.7 ? 'Explorando (aleatorio)'
    : epsilon > 0.3 ? 'Aprendiendo...'
    : 'Usando lo aprendido'
  const color = epsilon > 0.7 ? '#f59e0b' : epsilon > 0.3 ? '#818cf8' : '#4ade80'

  return (
    <Flex align="center" gap={2}>
      <Box w="8px" h="8px" borderRadius="full" bg={color} flexShrink={0} />
      <Text fontSize="11px" color="gray.500">{label}</Text>
      <Text fontSize="11px" color="gray.400" ml="auto">ε = {epsilon.toFixed(2)}</Text>
    </Flex>
  )
}
