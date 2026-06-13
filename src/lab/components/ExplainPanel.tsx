// ─── ExplainPanel ─────────────────────────────────────────────────────────────
//
// Panel de explicación "¿Cómo funciona?" con secciones título + cuerpo.
//
// Uso:
//   <ExplainPanel sections={[
//     { title: 'Self-attention', body: 'Cada celda calcula Q·KᵀT...' },
//     { title: 'Múltiples cabezas', body: 'Con 4 cabezas en paralelo...' },
//   ]} />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Box, Flex, Text } from '@chakra-ui/react'
import type { ExplainSection } from '../types'

interface Props {
  sections: ExplainSection[]
}

export function ExplainPanel({ sections }: Props) {
  return (
    <Box
      bg="rgba(255,255,255,0.04)"
      border="1px dashed rgba(255,255,255,0.08)"
      borderRadius="xl"
      p={3}
    >
      <Text
        fontSize="10px"
        color="gray.500"
        fontWeight={600}
        letterSpacing="wide"
        mb={2}
      >
        ¿CÓMO FUNCIONA?
      </Text>

      <Flex direction="column" gap={2}>
        {sections.map((s) => (
          <Box key={s.title}>
            <Text fontSize="11px" color="gray.300" fontWeight={600} mb="2px">
              {s.title}
            </Text>
            <Text fontSize="11px" color="gray.500" lineHeight="short">
              {s.body}
            </Text>
          </Box>
        ))}
      </Flex>
    </Box>
  )
}
