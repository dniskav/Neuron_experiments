// ─── TutorPanel ─────────────────────────────────────────────────────────────
// Componente UI para mostrar mensajes del tutor contextual
// (critical, warning, tip, success)

import { Box, Flex, Text } from '@chakra-ui/react'

export interface TutorMessage {
  type: 'critical' | 'warning' | 'tip' | 'success'
  title: string
  body: string
}

const COLORS = {
  critical: { bg: '#f87171', border: '#b91c1c', text: '#fff' },
  warning: { bg: '#fbbf24', border: '#b45309', text: '#fff' },
  tip: { bg: '#38bdf8', border: '#0369a1', text: '#fff' },
  success: { bg: '#4ade80', border: '#166534', text: '#fff' }
}

export function TutorPanel({ msg }: { msg: TutorMessage | null }) {
  if (!msg) return null
  const color = COLORS[msg.type]
  return (
    <Box
      bg={color.bg}
      border={`2px solid ${color.border}`}
      borderRadius="md"
      p={3}
      mb={2}
      color={color.text}
      boxShadow="sm">
      <Flex align="center" gap={2} mb={1}>
        <Text fontWeight={700} fontSize="14px">
          {msg.type === 'critical' && '🚨'}
          {msg.type === 'warning' && '⚠️'}
          {msg.type === 'tip' && '💡'}
          {msg.type === 'success' && '✅'}
        </Text>
        <Text fontWeight={700} fontSize="14px">
          {msg.title}
        </Text>
      </Flex>
      <Text fontSize="13px">{msg.body}</Text>
    </Box>
  )
}
