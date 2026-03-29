// ─── RobotAgent ───────────────────────────────────────────────────────────────
//
// Agente RL con 4 niveles de complejidad creciente.
// Cada nivel añade un sensor y/o una acción nueva.
//

import { useMemo, useState, useEffect } from 'react'
import { useObstacles } from './hooks/useObstacles'
import { useSpeedControls } from './hooks/useSpeedControls'
import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { NetworkDiagram } from '../../../components/lib'
import type { ActivationType } from '../../../components/lib'
import { LayerBuilder } from '../../../components/shared/LayerBuilder'
import type { LayerConfig } from '../../ArquitectoCard/hooks/training/useArquitectoTraining'
import { AgentCanvas } from '../AgentCanvas'
import { useAgentRL, DEFAULT_HIDDEN } from '../useAgentRL'
import type { Level, HiddenLayer } from '../useAgentRL'
import { LEVEL_INFO } from './levelInfo'
import { GoalBar } from './GoalBar'
import { ActionIndicator } from '../../../components/shared/ActionIndicator'
import { LevelBreadcrumb } from './LevelBreadcrumb'
import { SuccessBanner } from './SuccessBanner'
import { SpeedSelector, TRAIN_SPEED_OPTIONS, TEST_SPEED_OPTIONS } from '../../../components/shared/SpeedSelector'
import { AgentStats, buildAgentStats } from './AgentStats/index'
import { ObstacleControls } from './ObstacleControls'

// ── Persistencia ──────────────────────────────────────────────────────────────

const LS_LEVEL  = 'robot-agent-level'
const LS_LAYERS = 'robot-agent-layers'

function loadLevel(): Level {
  try {
    const v = Number(localStorage.getItem(LS_LEVEL))
    return ([1, 2, 3, 4].includes(v) ? v : 1) as Level
  } catch { return 1 }
}

function loadLayers(): HiddenLayer[] {
  try {
    const raw = localStorage.getItem(LS_LAYERS)
    return raw ? (JSON.parse(raw) as HiddenLayer[]) : DEFAULT_HIDDEN
  } catch { return DEFAULT_HIDDEN }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function RobotAgent() {
  const [level, setLevel]  = useState<Level>(loadLevel)
  const [initialLayers]    = useState<HiddenLayer[]>(loadLayers)

  const {
    stats, trailRef, agentRef, activationsRef,
    start, probar, pause, reset,
    hiddenLayers, addLayer, removeLayer, updateLayer,
    testingRef, speedRef, trainSpeedRef, obstaclesRef,
  } = useAgentRL(level, initialLayers)

  const { speedDisplay, trainSpeedDisplay, handleSpeed, handleTrainSpeed } = useSpeedControls({ speedRef, trainSpeedRef })
  const { obstacles, activeObstacles, handleObstacleChange } = useObstacles(obstaclesRef)

  const {
    running, episodes, currentSteps, avgSteps, bestSteps,
    epsilon, lastAction, fwdPct, successRate, solved,
  } = stats

  useEffect(() => {
    try { localStorage.setItem(LS_LEVEL, String(level)) } catch { /* noop */ }
  }, [level])

  useEffect(() => {
    try { localStorage.setItem(LS_LAYERS, JSON.stringify(hiddenLayers)) } catch { /* noop */ }
  }, [hiddenLayers])

  const drawVersion = useMemo(() => currentSteps + episodes * 10000, [currentSteps, episodes])

  const netLayers = useMemo(() => [
    { size: level === 4 ? 3 : level === 3 ? 2 : 1 },
    ...hiddenLayers.map((l) => ({ size: l.neurons, activation: l.activation as ActivationType })),
    { size: level === 4 ? 3 : 2, activation: 'linear' as ActivationType },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [hiddenLayers, level])

  const info = LEVEL_INFO[level]

  function goLevel(l: Level) { pause(); setLevel(l) }
  function goNextLevel() { goLevel((Math.min(level + 1, 4)) as Level) }

  return (
    <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">

      {/* ── Columna izquierda: canvas + controles ── */}
      <Flex direction="column" gap={3} align="center">
        <AgentCanvas
          agentRef={agentRef}
          trailRef={trailRef}
          drawVersion={drawVersion}
          level={level}
          obstacles={activeObstacles}
        />

        {/* Botones */}
        <Flex gap={2} w="100%">
          {!running ? (
            <>
              <Button colorPalette="violet" size="sm" flex={1} onClick={start}>▶ Entrenar</Button>
              <Button colorPalette="teal"   size="sm" flex={1} onClick={probar}>▷ Probar</Button>
            </>
          ) : (
            <Button colorPalette="orange" size="sm" flex={1} onClick={pause}>
              {testingRef.current ? '⏸ Parar prueba' : '⏸ Pausar'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={reset}>↺ Reiniciar</Button>
        </Flex>

        {/* Velocidad entrenamiento */}
        {running && !testingRef.current && (
          <SpeedSelector
            options={TRAIN_SPEED_OPTIONS}
            value={trainSpeedDisplay}
            onChange={handleTrainSpeed}
            colorPalette="violet"
          />
        )}

        {/* Velocidad prueba */}
        {running && testingRef.current && (
          <SpeedSelector
            options={TEST_SPEED_OPTIONS}
            value={speedDisplay}
            onChange={handleSpeed}
            colorPalette="teal"
          />
        )}

        {/* Estadísticas */}
        <AgentStats
          epsilon={epsilon}
          stats={buildAgentStats(level, episodes, currentSteps, avgSteps, bestSteps, successRate)}
        />
      </Flex>

      {/* ── Columna derecha: configuración + red ── */}
      <Flex direction="column" gap={4} w="300px">
        <LevelBreadcrumb level={level} onChange={goLevel} />

        {/* Info del nivel */}
        <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="xl" p={4}>
          <Flex align="center" gap={2} mb={2}>
            <Text fontSize="22px" lineHeight={1}>{info.emoji}</Text>
            <Box>
              <Text fontSize="13px" fontWeight={700} color="gray.700">{info.title}</Text>
              <Text fontSize="10px" color="violet.500" fontWeight={600}>{info.badge}</Text>
            </Box>
          </Flex>
          <Text fontSize="12px" color="gray.500" lineHeight={1.6}>{info.desc}</Text>
        </Box>

        {/* Arquitectura */}
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
            outputLabel={`${level === 4 ? 3 : 2} Q-vals`}
          />
        </Box>

        {/* Obstáculos */}
        <ObstacleControls obstacles={obstacles} onChange={handleObstacleChange} />

        {/* Diagrama de red */}
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

        {/* Meta */}
        <GoalBar
          level={level} fwdPct={fwdPct}
          successRate={successRate} avgSteps={avgSteps} solved={solved}
        />

        {/* Banner de éxito */}
        <SuccessBanner level={level} solved={solved} onNextLevel={goNextLevel} />
      </Flex>

    </Flex>
  )
}
