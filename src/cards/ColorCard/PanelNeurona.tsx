import { Box, Flex, Text } from '@chakra-ui/react'
import { SectionLabel } from '../../components/lib'
import { NeuronN } from '@dniskav/neuron'

export function PanelNeurona({ titulo, neurona }: { titulo: string; neurona: NeuronN }) {
  const labels = ['R', 'G', 'B']
  const colores = ['#ef4444', '#22c55e', '#3b82f6']
  return (
    <Box flex={1} bg="gray.50" borderRadius="lg" p={3}>
      <SectionLabel mb={2}>{titulo}</SectionLabel>
      {neurona.weights.map((val, i) => (
        <Box key={i} mb={2}>
          <Flex justifyContent="space-between" fontSize="xs">
            <Text as="span" style={{ color: colores[i] }} fontWeight={600}>
              weights[{i}] · {labels[i]}
            </Text>
            <Text as="span" fontFamily="monospace" color="gray.700">
              {isNaN(val) ? 'err' : val.toFixed(3)}
            </Text>
          </Flex>
          <Box bg="gray.200" borderRadius="full" h="5px" overflow="hidden" mt={1}>
            <Box
              h="100%"
              borderRadius="full"
              style={{
                width: `${Math.min((Math.abs(isNaN(val) ? 0 : val) / 3) * 100, 100)}%`,
                background: colores[i],
                transition: 'width 0.4s ease'
              }}
            />
          </Box>
        </Box>
      ))}
      <Flex justifyContent="space-between" fontSize="xs" mt={1}>
        <Text as="span" color="gray.400">
          bias
        </Text>
        <Text as="span" fontFamily="monospace" color="gray.700">
          {isNaN(neurona.bias) ? 'err' : neurona.bias.toFixed(3)}
        </Text>
      </Flex>
    </Box>
  )
}
