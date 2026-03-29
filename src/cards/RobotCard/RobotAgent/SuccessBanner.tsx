import { Box, Button, Text } from '@chakra-ui/react'
import type { Level } from '../useAgentRL'

const STYLES: Record<Level, { bg: string; border: string; titleColor: string; bodyColor: string }> = {
  1: { bg: 'linear-gradient(135deg,#052e16,#064e3b)', border: '#22c55e', titleColor: '#4ade80', bodyColor: '#86efac' },
  2: { bg: 'linear-gradient(135deg,#0c1a3a,#0f2d6e)', border: '#60a5fa', titleColor: '#93c5fd', bodyColor: '#bfdbfe' },
  3: { bg: 'linear-gradient(135deg,#1a0c3a,#2e0f6e)', border: '#a78bfa', titleColor: '#c4b5fd', bodyColor: '#ddd6fe' },
  4: { bg: 'linear-gradient(135deg,#0a1628,#0f2040)', border: '#38bdf8', titleColor: '#7dd3fc', bodyColor: '#bae6fd' },
}

const CONTENT: Record<Level, { icon: string; title: string; body: React.ReactNode; next?: string }> = {
  1: {
    icon: '🎉',
    title: '¡El agente aprendió a ir adelante!',
    body: <>La red prefiere <strong>adelante</strong> sobre frenar. Pero sin sensor, sigue chocando.</>,
    next: 'Nivel 2 — añadir sensor frontal →',
  },
  2: {
    icon: '🎉',
    title: '¡Aprendió a frenar antes de chocar!',
    body: 'Ahora sabe cuándo parar. Pero no puede esquivar — solo para en seco. Con un sensor lateral, puede girar y seguir navegando.',
    next: 'Nivel 3 — añadir sensor izquierdo →',
  },
  3: {
    icon: '🎉',
    title: '¡El agente navega esquivando paredes!',
    body: 'Con dos sensores el agente aprendió cuándo girar. Pero solo puede girar a la izquierda. Con un sensor derecho puede elegir el mejor camino.',
    next: 'Nivel 4 — añadir sensor derecho →',
  },
  4: {
    icon: '🧠',
    title: '¡Navega con 3 sensores y 3 acciones!',
    body: 'El agente aprendió a elegir el mejor giro según el espacio disponible a cada lado. Prueba a activar obstáculos para aumentar la dificultad.',
  },
}

interface Props {
  level: Level
  solved: boolean
  onNextLevel: () => void
}

export function SuccessBanner({ level, solved, onNextLevel }: Props) {
  if (!solved) return null

  const s = STYLES[level]
  const c = CONTENT[level]

  return (
    <Box
      bg={s.bg}
      border={`1.5px solid ${s.border}`}
      borderRadius="xl"
      p={4}>
      <Text fontSize="22px" textAlign="center" mb={1}>{c.icon}</Text>
      <Text fontSize="13px" fontWeight={700} color={s.titleColor} textAlign="center" mb={2}>
        {c.title}
      </Text>
      <Text fontSize="12px" color={s.bodyColor} lineHeight={1.5}>
        {c.body}
      </Text>
      {c.next && (
        <Button mt={3} size="sm" w="100%" colorPalette="green" onClick={onNextLevel}>
          {c.next}
        </Button>
      )}
    </Box>
  )
}
