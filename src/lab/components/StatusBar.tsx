// ─── StatusBar ────────────────────────────────────────────────────────────────
//
// Barra de estado de una línea debajo del canvas.
// Cambia de color según el estado (neutral / éxito / error).
//
// Uso:
//   <StatusBar
//     text={solved ? '✓ Resuelto en 3 pasos' : `Iteración ${iter} / 20`}
//     variant={solved ? 'success' : 'neutral'}
//   />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Box, Text } from '@chakra-ui/react'

type Variant = 'neutral' | 'success' | 'error'

interface Props {
  text:      string
  variant?:  Variant
  width?:    string | number
}

const STYLES: Record<Variant, { bg: string; border: string; color: string }> = {
  neutral: {
    bg:     'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    color:  'gray.400',
  },
  success: {
    bg:     'rgba(20,83,45,0.6)',
    border: '#22c55e',
    color:  '#4ade80',
  },
  error: {
    bg:     'rgba(127,29,29,0.5)',
    border: '#ef4444',
    color:  '#fca5a5',
  },
}

export function StatusBar({ text, variant = 'neutral', width = '100%' }: Props) {
  const s = STYLES[variant]
  return (
    <Box
      w={width}
      px={3}
      py="6px"
      bg={s.bg}
      border="1px solid"
      borderColor={s.border}
      borderRadius="lg"
      textAlign="center"
    >
      <Text
        fontSize="12px"
        color={s.color}
        fontWeight={variant === 'success' ? 700 : 400}
      >
        {text}
      </Text>
    </Box>
  )
}
