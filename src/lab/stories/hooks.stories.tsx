// ─── Hooks — Stories ──────────────────────────────────────────────────────────
//
// Los hooks no tienen UI propia, así que demostramos cada uno
// dentro de un componente mínimo que muestra su efecto.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { useCanvasVersion } from '../hooks/useCanvasVersion'
import { useSession }       from '../hooks/useSession'

export default { title: 'Lab Hooks' }

// ── useCanvasVersion ──────────────────────────────────────────────────────────
//
// Muestra un canvas que se redibuja cada vez que llamas a tick().
// El contador sube con cada tick y el canvas refleja el nuevo estado.

export const UseCanvasVersionDemo = () => {
  const [version, tick] = useCanvasVersion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 240, 120)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, 240, 120)
    // Dibuja un círculo en posición aleatoria en cada redibujado
    const x = 20 + Math.random() * 200
    const y = 20 + Math.random() * 80
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(${(version * 37) % 360}, 80%, 65%)`
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(`version: ${version}`, 8, 112)
  }, [version])

  return (
    <Flex direction="column" gap={3} align="flex-start">
      <Text fontSize="12px" color="gray.400" fontFamily="mono">
        useCanvasVersion() → [version, tick]
      </Text>
      <canvas
        ref={canvasRef}
        width={240}
        height={120}
        style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}
      />
      <Text fontSize="11px" color="gray.500">
        Cada tick() incrementa el contador → useEffect redibuja el canvas.
        React no re-renderiza el componente padre en el loop de entrenamiento —
        solo el canvas se actualiza.
      </Text>
      <Button size="sm" colorPalette="violet" onClick={tick}>
        tick() — redibujar
      </Button>
    </Flex>
  )
}
UseCanvasVersionDemo.storyName = 'useCanvasVersion — demo'


// ── useSession ────────────────────────────────────────────────────────────────
//
// Muestra cómo useSession conecta una clase Session cualquiera con React.
// La Session aquí es un contador simple que se incrementa cada segundo.

class CounterSession {
  private count    = 0
  private interval: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<(s: { count: number; running: boolean }) => void>()

  getState() { return { count: this.count, running: this.interval !== null } }

  subscribe(fn: (s: { count: number; running: boolean }) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  start() {
    if (this.interval) return
    this.interval = setInterval(() => {
      this.count++
      this.notify()
    }, 500)
    this.notify()
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
    this.notify()
  }

  reset() { this.stop(); this.count = 0; this.notify() }

  private notify() { this.listeners.forEach(fn => fn(this.getState())) }
}

export const UseSessionDemo = () => {
  const sessionRef = useRef(new CounterSession())
  const state      = useSession(sessionRef.current)

  return (
    <Flex direction="column" gap={3} align="flex-start">
      <Text fontSize="12px" color="gray.400" fontFamily="mono">
        useSession(session) → state
      </Text>
      <Box
        bg="rgba(255,255,255,0.04)"
        border="1px solid rgba(255,255,255,0.08)"
        borderRadius="lg"
        p={3}
        minW="220px"
      >
        <Flex justify="space-between" mb={1}>
          <Text fontSize="12px" color="gray.500">count</Text>
          <Text fontSize="12px" color="gray.200" fontWeight={700}>{state.count}</Text>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="12px" color="gray.500">running</Text>
          <Text fontSize="12px" fontWeight={700} color={state.running ? '#4ade80' : 'gray.500'}>
            {String(state.running)}
          </Text>
        </Flex>
      </Box>
      <Text fontSize="11px" color="gray.500">
        La Session es una clase TS pura (sin React). useSession se suscribe
        y sincroniza el estado automáticamente. El componente solo necesita
        llamar a los métodos de la session — sin useState manual.
      </Text>
      <Flex gap={2}>
        {!state.running
          ? <Button size="sm" colorPalette="violet" onClick={() => sessionRef.current.start()}>▶ Start</Button>
          : <Button size="sm" colorPalette="orange" onClick={() => sessionRef.current.stop()}>⏸ Stop</Button>
        }
        <Button size="sm" variant="outline" color="gray.400" borderColor="gray.600"
          onClick={() => sessionRef.current.reset()}>
          ↺ Reset
        </Button>
      </Flex>
    </Flex>
  )
}
UseSessionDemo.storyName = 'useSession — demo con CounterSession'
