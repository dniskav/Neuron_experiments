// ─── ConfigBox ────────────────────────────────────────────────────────────────
//
// Contenedor oscuro con etiqueta opcional. Usado para secciones del panel
// de configuración: arquitectura, mapa de atención, controles, etc.
//
// Uso:
//   <ConfigBox label="ARQUITECTURA">
//     <LayerBuilder ... />
//   </ConfigBox>
//
//   <ConfigBox label="PARÁMETROS" dashed>
//     ...contenido editable...
//   </ConfigBox>
//
// ─────────────────────────────────────────────────────────────────────────────

import { Box, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props {
  label?:    string
  /** Borde punteado — útil para secciones editables */
  dashed?:   boolean
  children:  ReactNode
}

export function ConfigBox({ label, dashed = false, children }: Props) {
  return (
    <Box
      bg="rgba(255,255,255,0.04)"
      border={`1px ${dashed ? 'dashed' : 'solid'} rgba(255,255,255,0.08)`}
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
      {children}
    </Box>
  )
}
