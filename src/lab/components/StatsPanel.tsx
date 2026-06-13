// ─── StatsPanel ───────────────────────────────────────────────────────────────
//
// Panel de métricas de entrenamiento/inferencia.
// Muestra pares label → valor, con hint opcional debajo del valor.
//
// Uso:
//   <StatsPanel
//     label="ENTRENAMIENTO"
//     metrics={[
//       { label: 'Pasos',    value: trainStep.toLocaleString() },
//       { label: 'Loss (CE)', value: loss.toFixed(4), color: '#4ade80', hint: '≈ 2.20 al inicio' },
//     ]}
//   />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Box, Flex, Text } from '@chakra-ui/react'
import type { Metric } from '../types'

interface Props {
  label?:   string
  metrics:  Metric[]
}

export function StatsPanel({ label, metrics }: Props) {
  return (
    <Box
      bg="rgba(255,255,255,0.04)"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="xl"
      p={3}
    >
      {label && (
        <Text
          fontSize="10px"
          color="gray.500"
          fontWeight={600}
          letterSpacing="wide"
          mb={2}
        >
          {label}
        </Text>
      )}

      <Flex direction="column" gap={1}>
        {metrics.map((m) => (
          <Box key={m.label}>
            <Flex justify="space-between" align="baseline">
              <Text fontSize="12px" color="gray.500">{m.label}</Text>
              <Text
                fontSize="12px"
                fontWeight={700}
                color={m.color ?? 'gray.300'}
              >
                {m.value}
              </Text>
            </Flex>
            {m.hint && (
              <Flex justify="space-between">
                <Text fontSize="10px" color="gray.600" />
                <Text fontSize="10px" color="gray.600">{m.hint}</Text>
              </Flex>
            )}
          </Box>
        ))}
      </Flex>
    </Box>
  )
}
