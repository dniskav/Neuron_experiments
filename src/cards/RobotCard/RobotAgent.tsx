// ─── RobotAgent ───────────────────────────────────────────────────────────────
//
// Nivel 1: solo adelante o frenar. Sin sensores.
// La red aprende que adelante = más recompensa.
// El agente sigue chocando porque no puede ver las paredes.
//

import { useMemo, useState, useEffect } from 'react'
import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { NetworkDiagram } from '../../components/lib'
import type { ActivationType } from '../../components/lib'
import { LayerBuilder } from '../../components/shared/LayerBuilder'
import type { LayerConfig } from '../ArquitectoCard/hooks/training/useArquitectoTraining'
import { AgentCanvas } from './AgentCanvas'
import {
  useAgentRL,
  GOAL_FWD,
  GOAL_SUCCESS_RATE,
  GOAL_STEPS_L3,
  GOAL_STEPS_L4,
  DEFAULT_HIDDEN
} from './useAgentRL'
import type { Level, HiddenLayer, Obstacle } from './useAgentRL'
import { generateObstacle } from './agentWorld'

// ── Persistencia ──────────────────────────────────────────────────────────────

const LS_LEVEL = 'robot-agent-level'
const LS_LAYERS = 'robot-agent-layers'

function loadLevel(): Level {
  try {
    const v = Number(localStorage.getItem(LS_LEVEL))
    return ([1, 2, 3, 4].includes(v) ? v : 1) as Level
  } catch {
    return 1
  }
}
function loadLayers(): HiddenLayer[] {
  try {
    const raw = localStorage.getItem(LS_LAYERS)
    return raw ? (JSON.parse(raw) as HiddenLayer[]) : DEFAULT_HIDDEN
  } catch {
    return DEFAULT_HIDDEN
  }
}

// ── Barra de progreso ─────────────────────────────────────────────────────────

function GoalBar({
  level,
  fwdPct,
  successRate,
  avgSteps,
  solved
}: {
  level: Level
  fwdPct: number
  successRate: number
  avgSteps: number
  solved: boolean
}) {
  const pct =
    level === 1
      ? Math.min(fwdPct / GOAL_FWD, 1)
      : level === 2
        ? Math.min(successRate / GOAL_SUCCESS_RATE, 1)
        : level === 3
          ? Math.min(avgSteps / GOAL_STEPS_L3, 1)
          : Math.min(avgSteps / GOAL_STEPS_L4, 1)
  const label =
    level === 1
      ? `${(fwdPct * 100).toFixed(0)} %`
      : level === 2
        ? `${(successRate * 100).toFixed(0)} %`
        : `${avgSteps} pasos`
  const desc =
    level === 1
      ? `META — ir adelante > ${(GOAL_FWD * 100).toFixed(0)} % del tiempo`
      : level === 2
        ? `META — frenar a tiempo > ${(GOAL_SUCCESS_RATE * 100).toFixed(0)} % de los episodios`
        : level === 3
          ? `META — promedio > ${GOAL_STEPS_L3} pasos sin chocar`
          : `META — promedio > ${GOAL_STEPS_L4} pasos sin chocar`
  return (
    <Box>
      <Flex justify="space-between" mb={1}>
        <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide">
          {desc}
        </Text>
        <Text fontSize="11px" fontWeight={700} color={solved ? '#4ade80' : 'gray.500'}>
          {label}
        </Text>
      </Flex>
      <Box bg="gray.100" borderRadius="full" h="6px" overflow="hidden">
        <Box
          h="100%"
          borderRadius="full"
          bg={
            solved
              ? 'linear-gradient(90deg,#22c55e,#4ade80)'
              : 'linear-gradient(90deg,#6366f1,#818cf8)'
          }
          style={{ width: `${pct * 100}%`, transition: 'width 0.5s ease' }}
        />
      </Box>
    </Box>
  )
}

// ── Indicador ε ───────────────────────────────────────────────────────────────

function EpsilonBadge({ epsilon }: { epsilon: number }) {
  const label =
    epsilon > 0.7
      ? 'Explorando (aleatorio)'
      : epsilon > 0.3
        ? 'Aprendiendo...'
        : 'Usando lo aprendido'
  const color = epsilon > 0.7 ? '#f59e0b' : epsilon > 0.3 ? '#818cf8' : '#4ade80'
  return (
    <Flex align="center" gap={2}>
      <Box w="8px" h="8px" borderRadius="full" bg={color} flexShrink={0} />
      <Text fontSize="11px" color="gray.500">
        {label}
      </Text>
      <Text fontSize="11px" color="gray.400" ml="auto">
        ε = {epsilon.toFixed(2)}
      </Text>
    </Flex>
  )
}

// ── Indicador de acción actual ────────────────────────────────────────────────

function ActionIndicator({ action, labels }: { action: number; labels: readonly string[] }) {
  return (
    <Flex gap={2}>
      {labels.map((label, i) => (
        <Box
          key={i}
          flex={1}
          textAlign="center"
          bg={action === i ? (i === 0 ? 'violet.50' : 'orange.50') : 'white'}
          border="1.5px solid"
          borderColor={action === i ? (i === 0 ? 'violet.300' : 'orange.300') : 'gray.200'}
          borderRadius="lg"
          py={1}
          fontSize="11px"
          fontWeight={action === i ? 700 : 400}
          color={action === i ? (i === 0 ? 'violet.600' : 'orange.600') : 'gray.500'}
          transition="all 0.1s">
          {label}
        </Box>
      ))}
    </Flex>
  )
}

// ── Info de nivel ─────────────────────────────────────────────────────────────

const LEVEL_INFO = {
  1: {
    emoji: '🚗',
    title: 'Nivel 1 — Solo adelante',
    badge: '0 sensores · 2 acciones',
    desc: (
      <>
        Sin sensores, la red solo puede aprender a <strong>siempre ir adelante</strong>. Sin
        importar lo que haya enfrente, el agente va recto hasta chocar.
      </>
    ),
    inputLabel: '1 constante',
    actions: ['▶ adelante', '⏹ frenar']
  },
  2: {
    emoji: '📡',
    title: 'Nivel 2 — Sensor frontal',
    badge: '1 sensor · 2 acciones',
    desc: (
      <>
        El agente ahora <strong>ve la distancia</strong> a la pared de enfrente. ¿Puede aprender a
        frenar justo antes de chocar?
      </>
    ),
    inputLabel: 'dist. frontal',
    actions: ['▶ adelante', '⏹ frenar']
  },
  3: {
    emoji: '🤖',
    title: 'Nivel 3 — Sensor izquierdo',
    badge: '2 sensores · 2 acciones',
    desc: (
      <>
        El agente tiene un <strong>sensor lateral izquierdo</strong>. Cuando la pared está cerca,
        puede girar a la izquierda si hay espacio libre. El objetivo: sobrevivir el mayor tiempo
        posible sin chocar.
      </>
    ),
    inputLabel: 'front · izq',
    actions: ['▶ adelante', '↺ girar izq']
  },
  4: {
    emoji: '🧠',
    title: 'Nivel 4 — Sensores izq + der',
    badge: '3 sensores · 3 acciones',
    desc: (
      <>
        El agente tiene sensores <strong>frontal, izquierdo y derecho</strong>. Puede elegir girar
        hacia cualquier lado — ahora tiene que decidir cuál es el mejor camino.
      </>
    ),
    inputLabel: 'front · izq · der',
    actions: ['▶ adelante', '↺ izq', '↻ der']
  }
} as const

// ── Componente principal ───────────────────────────────────────────────────────

export function RobotAgent() {
  const [level, setLevel] = useState<Level>(loadLevel)
  const [initialLayers] = useState<HiddenLayer[]>(loadLayers)

  const [speedDisplay, setSpeedDisplay] = useState(0.1)
  const [trainSpeedDisplay, setTrainSpeedDisplay] = useState(1)
  const [obs1, setObs1] = useState<Obstacle | null>(null)
  const [obs2, setObs2] = useState<Obstacle | null>(null)

  const {
    stats,
    trailRef,
    agentRef,
    activationsRef,
    start,
    probar,
    pause,
    reset,
    hiddenLayers,
    addLayer,
    removeLayer,
    updateLayer,
    testingRef,
    speedRef,
    trainSpeedRef,
    obstaclesRef
  } = useAgentRL(level, initialLayers)

  // Sincronizar obstáculos con el ref del hook
  useEffect(() => {
    obstaclesRef.current = [obs1, obs2].filter(Boolean) as Obstacle[]
  }, [obs1, obs2, obstaclesRef])

  const {
    running,
    episodes,
    currentSteps,
    avgSteps,
    bestSteps,
    epsilon,
    lastAction,
    fwdPct,
    successRate,
    solved
  } = stats

  useEffect(() => {
    try {
      localStorage.setItem(LS_LEVEL, String(level))
    } catch {
      /* noop */
    }
  }, [level])
  useEffect(() => {
    try {
      localStorage.setItem(LS_LAYERS, JSON.stringify(hiddenLayers))
    } catch {
      /* noop */
    }
  }, [hiddenLayers])

  const drawVersion = useMemo(() => currentSteps + episodes * 10000, [currentSteps, episodes])

  const netLayers = useMemo(
    () => [
      { size: level === 4 ? 3 : level === 3 ? 2 : 1 },
      ...hiddenLayers.map((l) => ({ size: l.neurons, activation: l.activation as ActivationType })),
      { size: 2, activation: 'linear' as ActivationType }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [hiddenLayers, level]
  )

  const info = LEVEL_INFO[level]

  function goNextLevel() {
    pause()
    setLevel((l) => (l < 4 ? ((l + 1) as Level) : l))
  }

  function handleSpeed(v: number) {
    speedRef.current = v
    setSpeedDisplay(v)
  }

  function handleTrainSpeed(v: number) {
    trainSpeedRef.current = v
    setTrainSpeedDisplay(v)
  }

  const activeObstacles = [obs1, obs2].filter(Boolean) as Obstacle[]

  return (
    <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">
      {/* Canvas */}
      <AgentCanvas
        agentRef={agentRef}
        trailRef={trailRef}
        drawVersion={drawVersion}
        level={level}
        obstacles={activeObstacles}
      />

      {/* Panel derecho */}
      <Flex direction="column" gap={4} w="300px">
        {/* Nivel info */}
        <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="xl" p={4}>
          <Flex align="center" gap={2} mb={2}>
            <Text fontSize="22px" lineHeight={1}>
              {info.emoji}
            </Text>
            <Box>
              <Text fontSize="13px" fontWeight={700} color="gray.700">
                {info.title}
              </Text>
              <Text fontSize="10px" color="violet.500" fontWeight={600}>
                {info.badge}
              </Text>
            </Box>
          </Flex>
          <Text fontSize="12px" color="gray.500" lineHeight={1.6}>
            {info.desc}
          </Text>
        </Box>

        {/* Arquitectura configurable */}
        <Box bg="gray.50" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide" mb={3}>
            ARQUITECTURA
          </Text>
          <LayerBuilder
            hiddenLayers={hiddenLayers as LayerConfig[]}
            onAdd={addLayer}
            onRemove={removeLayer}
            onUpdate={updateLayer as (i: number, patch: Partial<LayerConfig>) => void}
            maxLayers={4}
            maxNeurons={24}
            inputLabel={info.inputLabel}
            outputLabel="2 Q-vals"
          />
        </Box>

        {/* Obstáculos */}
        <Box bg="gray.50" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide" mb={2}>
            OBSTÁCULOS
          </Text>
          <Flex direction="column" gap={2}>
            {(
              [
                { label: 'OBS 1', state: obs1, set: setObs1 },
                { label: 'OBS 2', state: obs2, set: setObs2 }
              ] as const
            ).map(({ label, state, set }) => (
              <Flex key={label} align="center" gap={2}>
                <Text fontSize="11px" color="gray.500" w="38px" flexShrink={0}>
                  {label}
                </Text>
                <Button
                  size="xs"
                  flex={1}
                  variant={state ? 'solid' : 'outline'}
                  colorPalette="rose"
                  onClick={() => set(state ? null : generateObstacle())}>
                  {state ? 'ON' : 'OFF'}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="gray"
                  onClick={() => set(generateObstacle())}
                  title="Nueva posición aleatoria">
                  ⟳
                </Button>
              </Flex>
            ))}
          </Flex>
        </Box>

        {/* Diagrama de la red */}
        <NetworkDiagram
          layers={netLayers}
          optimizer="Adam · lr = 0.025"
          activationsRef={activationsRef}
        />

        {/* Acción actual */}
        <Box bg="gray.50" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide" mb={2}>
            ACCIÓN ACTUAL
          </Text>
          <ActionIndicator action={lastAction} labels={info.actions} />
        </Box>

        {/* Estadísticas */}
        <Box bg="gray.50" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide" mb={3}>
            ESTADÍSTICAS
          </Text>
          <Flex direction="column" gap={2}>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">
                Episodios
              </Text>
              <Text fontSize="12px" fontWeight={700} color="gray.700">
                {episodes}
              </Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">
                Pasos actuales
              </Text>
              <Text fontSize="12px" fontWeight={700} color="gray.700">
                {currentSteps}
              </Text>
            </Flex>
            {level === 2 ? (
              <Flex justify="space-between">
                <Text fontSize="12px" color="gray.500">
                  Frenos exitosos
                </Text>
                <Text
                  fontSize="12px"
                  fontWeight={700}
                  color={successRate >= GOAL_SUCCESS_RATE ? '#22c55e' : 'gray.700'}>
                  {(successRate * 100).toFixed(0)} %
                </Text>
              </Flex>
            ) : (
              <Flex justify="space-between">
                <Text fontSize="12px" color="gray.500">
                  Promedio (últimos 20)
                </Text>
                <Text fontSize="12px" fontWeight={700} color="gray.700">
                  {avgSteps}
                </Text>
              </Flex>
            )}
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">
                Mejor episodio
              </Text>
              <Text fontSize="12px" fontWeight={700} color="violet.500">
                {bestSteps}
              </Text>
            </Flex>
          </Flex>
          <Box mt={3}>
            <EpsilonBadge epsilon={epsilon} />
          </Box>
        </Box>

        {/* Meta */}
        <GoalBar
          level={level}
          fwdPct={fwdPct}
          successRate={successRate}
          avgSteps={avgSteps}
          solved={solved}
        />

        {/* Botones */}
        <Flex gap={2}>
          {!running ? (
            <>
              <Button colorPalette="violet" size="sm" flex={1} onClick={start}>
                ▶ Entrenar
              </Button>
              <Button colorPalette="teal" size="sm" flex={1} onClick={probar}>
                ▷ Probar
              </Button>
            </>
          ) : (
            <Button colorPalette="orange" size="sm" flex={1} onClick={pause}>
              {testingRef.current ? '⏸ Parar prueba' : '⏸ Pausar'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={reset}>
            ↺ Reiniciar
          </Button>
        </Flex>

        {/* Velocidad entrenamiento */}
        {running && !testingRef.current && (
          <Flex gap={1} justify="center">
            {[
              { label: '1×', value: 1 },
              { label: '2×', value: 2 },
              { label: '4×', value: 4 },
              { label: '10×', value: 10 }
            ].map((opt) => (
              <Button
                key={opt.value}
                size="xs"
                variant={trainSpeedDisplay === opt.value ? 'solid' : 'outline'}
                colorPalette="violet"
                onClick={() => handleTrainSpeed(opt.value)}
                flex={1}>
                {opt.label}
              </Button>
            ))}
          </Flex>
        )}

        {/* Velocidad prueba */}
        {running && testingRef.current && (
          <Flex gap={1} justify="center">
            {[
              { label: '🐢', value: 0.1 },
              { label: '1×', value: 1 },
              { label: '3×', value: 3 },
              { label: '10×', value: 10 }
            ].map((opt) => (
              <Button
                key={opt.value}
                size="xs"
                variant={speedDisplay === opt.value ? 'solid' : 'outline'}
                colorPalette="teal"
                onClick={() => handleSpeed(opt.value)}
                flex={1}>
                {opt.label}
              </Button>
            ))}
          </Flex>
        )}

        {/* Banner de éxito nivel 1 */}
        {solved && level === 1 && (
          <Box
            bg="linear-gradient(135deg,#052e16,#064e3b)"
            border="1.5px solid #22c55e"
            borderRadius="xl"
            p={4}>
            <Text fontSize="22px" textAlign="center" mb={1}>
              🎉
            </Text>
            <Text fontSize="13px" fontWeight={700} color="#4ade80" textAlign="center" mb={2}>
              ¡El agente aprendió a ir adelante!
            </Text>
            <Text fontSize="12px" color="#86efac" lineHeight={1.5}>
              La red prefiere <strong>adelante</strong> sobre frenar. Pero sin sensor, sigue
              chocando.
            </Text>
            <Button mt={3} size="sm" w="100%" colorPalette="green" onClick={goNextLevel}>
              Nivel 2 — añadir sensor frontal →
            </Button>
          </Box>
        )}

        {/* Banner de éxito nivel 2 */}
        {solved && level === 2 && (
          <Box
            bg="linear-gradient(135deg,#0c1a3a,#0f2d6e)"
            border="1.5px solid #60a5fa"
            borderRadius="xl"
            p={4}>
            <Text fontSize="22px" textAlign="center" mb={1}>
              🎉
            </Text>
            <Text fontSize="13px" fontWeight={700} color="#93c5fd" textAlign="center" mb={2}>
              ¡Aprendió a frenar antes de chocar!
            </Text>
            <Text fontSize="12px" color="#bfdbfe" lineHeight={1.5}>
              Ahora sabe cuándo parar. Pero no puede esquivar — solo para en seco. Con un sensor
              lateral, puede girar y seguir navegando.
            </Text>
            <Button mt={3} size="sm" w="100%" colorPalette="blue" onClick={goNextLevel}>
              Nivel 3 — añadir sensor izquierdo →
            </Button>
          </Box>
        )}

        {/* Banner de éxito nivel 3 */}
        {solved && level === 3 && (
          <Box
            bg="linear-gradient(135deg,#1a0c3a,#2e0f6e)"
            border="1.5px solid #a78bfa"
            borderRadius="xl"
            p={4}>
            <Text fontSize="22px" textAlign="center" mb={1}>
              🎉
            </Text>
            <Text fontSize="13px" fontWeight={700} color="#c4b5fd" textAlign="center" mb={2}>
              ¡El agente navega esquivando paredes!
            </Text>
            <Text fontSize="12px" color="#ddd6fe" lineHeight={1.5}>
              Con dos sensores el agente aprendió cuándo girar. Pero solo puede girar a la
              izquierda. Con un sensor derecho puede elegir el mejor camino.
            </Text>
            <Button mt={3} size="sm" w="100%" colorPalette="purple" onClick={goNextLevel}>
              Nivel 4 — añadir sensor derecho →
            </Button>
          </Box>
        )}

        {/* Banner de éxito nivel 4 */}
        {solved && level === 4 && (
          <Box
            bg="linear-gradient(135deg,#0a1628,#0f2040)"
            border="1.5px solid #38bdf8"
            borderRadius="xl"
            p={4}>
            <Text fontSize="22px" textAlign="center" mb={1}>
              🧠
            </Text>
            <Text fontSize="13px" fontWeight={700} color="#7dd3fc" textAlign="center" mb={2}>
              ¡Navega con 3 sensores y 3 acciones!
            </Text>
            <Text fontSize="12px" color="#bae6fd" lineHeight={1.5}>
              El agente aprendió a elegir el mejor giro según el espacio disponible a cada lado.
              Prueba a activar obstáculos para aumentar la dificultad.
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  )
}
