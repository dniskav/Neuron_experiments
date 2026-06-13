// ─── GoalBar ──────────────────────────────────────────────────────────────────
//
// Barra de progreso hacia una meta. Versión genérica del GoalBar de RobotAgent.
//
// Uso:
//   <GoalBar
//     label="META — promedio > 600 pasos sin chocar"
//     current={avgSteps}
//     target={600}
//     valueLabel={`${avgSteps} pasos`}
//     solved={solved}
//   />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Box, Flex, Text } from '@chakra-ui/react'

interface Props {
  /** Descripción de la meta (texto pequeño izquierda) */
  label:       string
  /** Valor actual (0 … target) */
  current:     number
  /** Valor objetivo */
  target:      number
  /** Texto formateado mostrado a la derecha (ej: "342 pasos" o "78 %") */
  valueLabel?: string
  /** Marca la barra en verde cuando se alcanza la meta */
  solved?:     boolean
}

export function GoalBar({ label, current, target, valueLabel, solved = false }: Props) {
  const pct = Math.min(current / target, 1)

  return (
    <Box>
      <Flex justify="space-between" mb={1}>
        <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide">
          {label}
        </Text>
        <Text fontSize="11px" fontWeight={700} color={solved ? '#4ade80' : 'gray.500'}>
          {valueLabel ?? current}
        </Text>
      </Flex>
      <Box bg="rgba(255,255,255,0.08)" borderRadius="full" h="6px" overflow="hidden">
        <Box
          h="100%"
          borderRadius="full"
          bg={solved
            ? 'linear-gradient(90deg,#22c55e,#4ade80)'
            : 'linear-gradient(90deg,#6366f1,#818cf8)'
          }
          style={{ width: `${pct * 100}%`, transition: 'width 0.5s ease' }}
        />
      </Box>
    </Box>
  )
}
