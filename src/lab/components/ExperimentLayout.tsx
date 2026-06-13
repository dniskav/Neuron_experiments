// ─── ExperimentLayout ─────────────────────────────────────────────────────────
//
// Layout de dos columnas para todos los experimentos:
//   left  → canvas + controles (centrado, ancho libre)
//   right → panel de configuración (w fija 300px)
//
// Uso:
//   <ExperimentLayout
//     left={<>canvas controles</>}
//     right={<>config diagrama</>}
//   />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props {
  left:  ReactNode
  right: ReactNode
}

export function ExperimentLayout({ left, right }: Props) {
  return (
    <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">
      {/* Columna izquierda: canvas + controles */}
      <Flex direction="column" gap={3} align="center">
        {left}
      </Flex>

      {/* Columna derecha: configuración */}
      <Flex direction="column" gap={4} w="300px">
        {right}
      </Flex>
    </Flex>
  )
}
