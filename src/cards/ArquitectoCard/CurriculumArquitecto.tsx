// ─── CurriculumArquitecto ─────────────────────────────────────────────────────
//
// Modo guiado: el usuario construye la red paso a paso superando 4 niveles.
// Cada nivel restringe la arquitectura y exige una meta de precisión.
// Al completar la meta se desbloquea el siguiente nivel con más libertad.
//

import { useState, useEffect, useMemo } from 'react'
import { Box, Button, Flex, Heading, NativeSelect, SimpleGrid, Text } from '@chakra-ui/react'
import { StatItem, NetworkDiagram } from '../../components/lib'
import type { ActivationType } from '../../components/lib'
import { DecisionCanvas, CANVAS_W } from './DecisionCanvas'
import { LayerBuilder } from '../../components/shared/LayerBuilder'
import { useArquitectoTraining, type OptimizerType } from './hooks/training/useArquitectoTraining'
import { CURRICULUM_LEVELS, CURRICULUM_STORAGE_KEY } from './curriculumLevels'

// ── Helpers de persistencia ───────────────────────────────────────────────────

function loadProgress(): number {
  try {
    return Math.min(
      Number(localStorage.getItem(CURRICULUM_STORAGE_KEY) ?? '0'),
      CURRICULUM_LEVELS.length - 1
    )
  } catch {
    return 0
  }
}
function saveProgress(idx: number) {
  try {
    localStorage.setItem(CURRICULUM_STORAGE_KEY, String(idx))
  } catch {
    /* quota */
  }
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function LevelStepper({
  levels,
  currentIdx,
  maxUnlocked,
  onSelect
}: {
  levels: typeof CURRICULUM_LEVELS
  currentIdx: number
  maxUnlocked: number
  onSelect: (idx: number) => void
}) {
  return (
    <Flex align="center" justify="center" gap={0} flexWrap="wrap">
      {levels.map((lvl, idx) => {
        const done = idx < maxUnlocked
        const active = idx === currentIdx
        const locked = idx > maxUnlocked
        return (
          <Flex key={lvl.id} align="center" gap={0}>
            <Button
              size="sm"
              variant={active ? 'solid' : 'subtle'}
              colorPalette={done ? 'green' : active ? 'violet' : 'gray'}
              disabled={locked}
              onClick={() => onSelect(idx)}
              px={3}
              h="32px"
              fontSize="12px"
              fontWeight={active ? 700 : 400}
              opacity={locked ? 0.4 : 1}>
              {done && !active ? '✓ ' : ''}
              {lvl.emoji} {lvl.titulo}
            </Button>
            {idx < levels.length - 1 && (
              <Text color="gray.300" fontSize="14px" px={1} userSelect="none">
                →
              </Text>
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}

// ── Barra de meta ─────────────────────────────────────────────────────────────

function GoalBar({ current, goal }: { current: number | null; goal: number }) {
  const pct = current !== null ? Math.min(current / goal, 1) : 0
  const met = current !== null && current >= goal
  const display = current !== null ? `${(current * 100).toFixed(1)} %` : '—'

  return (
    <Box>
      <Flex justify="space-between" mb={1}>
        <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide">
          META DE PRECISIÓN
        </Text>
        <Text fontSize="11px" fontWeight={700} color={met ? '#4ade80' : 'gray.600'}>
          {display} / {(goal * 100).toFixed(0)} %
        </Text>
      </Flex>
      <Box bg="gray.100" borderRadius="full" h="8px" overflow="hidden">
        <Box
          h="100%"
          borderRadius="full"
          bg={
            met
              ? 'linear-gradient(90deg,#22c55e,#4ade80)'
              : 'linear-gradient(90deg,#6366f1,#818cf8)'
          }
          style={{ width: `${pct * 100}%`, transition: 'width 0.4s ease' }}
        />
      </Box>
    </Box>
  )
}

// ── Panel de nivel ────────────────────────────────────────────────────────────

function LevelInfoPanel({
  level,
  showLesson
}: {
  level: (typeof CURRICULUM_LEVELS)[0]
  showLesson: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="xl" p={4}>
      <Flex align="center" gap={2} mb={2}>
        <Text fontSize="20px" lineHeight={1}>
          {level.emoji}
        </Text>
        <Heading size="sm" color="gray.700">
          Nivel {level.id}: {level.titulo}
        </Heading>
      </Flex>

      {/* Misión */}
      <Box
        bg="violet.50"
        borderLeft="3px solid"
        borderColor="violet.300"
        borderRadius="sm"
        px={3}
        py={2}
        mb={2}>
        <Text fontSize="10px" color="violet.500" fontWeight={700} mb="2px">
          MISIÓN
        </Text>
        <Text fontSize="12px" color="gray.700" lineHeight={1.5}>
          {level.mision}
        </Text>
      </Box>

      {/* Lección (solo al completar) */}
      {showLesson && (
        <Box
          bg="green.50"
          borderLeft="3px solid"
          borderColor="green.400"
          borderRadius="sm"
          px={3}
          py={2}
          mb={2}>
          <Text fontSize="10px" color="green.600" fontWeight={700} mb="2px">
            LO QUE APRENDISTE
          </Text>
          <Text fontSize="12px" color="gray.700" lineHeight={1.5}>
            {level.lesson}
          </Text>
        </Box>
      )}

      {/* Pista */}
      <Box
        as="button"
        w="100%"
        textAlign="left"
        onClick={() => setOpen((o) => !o)}
        cursor="pointer"
        bg="transparent"
        border="none"
        p={0}>
        <Text fontSize="11px" color="gray.400" _hover={{ color: 'gray.600' }}>
          {open ? '▾' : '▸'} Pista
        </Text>
      </Box>
      {open && (
        <Text fontSize="11px" color="gray.500" mt={1} lineHeight={1.5}>
          {level.pista}
        </Text>
      )}
    </Box>
  )
}

// ── Banner de éxito ───────────────────────────────────────────────────────────

function SuccessBanner({
  level,
  isFinal,
  onNext
}: {
  level: (typeof CURRICULUM_LEVELS)[0]
  isFinal: boolean
  onNext: () => void
}) {
  return (
    <Box
      bg="linear-gradient(135deg, #052e16 0%, #064e3b 100%)"
      border="1.5px solid #22c55e"
      borderRadius="xl"
      p={4}>
      <Text fontSize="24px" mb={1} textAlign="center">
        {isFinal ? '🏆' : '🎉'}
      </Text>
      <Text fontSize="13px" fontWeight={700} color="#4ade80" textAlign="center" mb={2}>
        {isFinal ? '¡Curriculum completado!' : `¡Nivel ${level.id} superado!`}
      </Text>
      <Text fontSize="12px" color="#86efac" lineHeight={1.5} mb={3}>
        {level.unlockMsg}
      </Text>
      {!isFinal && (
        <Button colorPalette="green" size="sm" w="100%" onClick={onNext}>
          Siguiente nivel →
        </Button>
      )}
    </Box>
  )
}

// ── OPT labels ─────────────────────────────────────────────────────────────────

const OPT_LABEL: Record<OptimizerType, string> = {
  sgd: 'SGD',
  momentum: 'Momentum',
  adam: 'Adam'
}

// ── Componente principal ───────────────────────────────────────────────────────

export function CurriculumArquitecto() {
  const [maxUnlocked, setMaxUnlocked] = useState(loadProgress)
  const [currentIdx, setCurrentIdx] = useState(loadProgress)

  const level = CURRICULUM_LEVELS[currentIdx]
  const isFinal = currentIdx === CURRICULUM_LEVELS.length - 1

  const t = useArquitectoTraining(level.problem)

  const networkLayers = useMemo(
    () => [
      { size: 2 },
      ...t.hiddenLayers.map((l) => ({
        size: l.neurons,
        activation: l.activation as ActivationType
      })),
      { size: 1, activation: 'sigmoid' as ActivationType }
    ],
    [t.hiddenLayers]
  )

  // ── Detectar éxito ──────────────────────────────────────────────────────────
  const [justSolved, setJustSolved] = useState(false)

  useEffect(() => {
    setJustSolved(false) // reset cuando cambia el nivel
  }, [currentIdx])

  useEffect(() => {
    if (t.accuracy === null) return
    if (t.accuracy >= level.goalAccuracy && !justSolved && currentIdx >= maxUnlocked) {
      setJustSolved(true)
      const next = currentIdx + (isFinal ? 0 : 1)
      // unlock the next level
      if (!isFinal) {
        setMaxUnlocked(next)
        saveProgress(next)
      }
    }
  }, [t.accuracy, level.goalAccuracy, currentIdx, maxUnlocked, isFinal, justSolved])

  const levelSolved = justSolved || currentIdx < maxUnlocked

  const handleNext = () => {
    const nextIdx = currentIdx + 1
    setCurrentIdx(nextIdx)
    setJustSolved(false)
  }

  const accuracyStr = t.accuracy !== null ? `${(t.accuracy * 100).toFixed(1)} %` : '—'
  const lossStr = t.loss !== null ? t.loss.toFixed(4) : '—'

  return (
    <Flex direction="column" gap={6} align="center" w="100%">
      {/* Stepper */}
      <LevelStepper
        levels={CURRICULUM_LEVELS}
        currentIdx={currentIdx}
        maxUnlocked={maxUnlocked}
        onSelect={(idx) => {
          setCurrentIdx(idx)
          setJustSolved(false)
        }}
      />

      <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">
        {/* Columna izquierda: canvas */}
        <Flex direction="column" gap={3} align="center">
          <Flex justify="space-between" w={`${CANVAS_W}px`}>
            <Text fontSize="9px" color="gray.400">
              ↑ eje Y
            </Text>
            <Text fontSize="9px" color="gray.400">
              eje X →
            </Text>
          </Flex>
          <DecisionCanvas
            netRef={t.netRef}
            points={t.points}
            drawVersion={t.drawVersion}
            cornerLabels={level.problem.cornerLabels}
          />
          <Flex gap={4} justify="center">
            <Flex align="center" gap={1}>
              <Box w="10px" h="10px" borderRadius="full" bg="indigo.400" />
              <Text fontSize="10px" color="gray.400">
                clase 1
              </Text>
            </Flex>
            <Flex align="center" gap={1}>
              <Box w="10px" h="10px" borderRadius="full" bg="red.400" />
              <Text fontSize="10px" color="gray.400">
                clase 0
              </Text>
            </Flex>
          </Flex>
        </Flex>

        {/* Columna derecha: controles */}
        <Flex direction="column" gap={4} maxW="380px" w="100%">
          {/* Info del nivel */}
          <LevelInfoPanel level={level} showLesson={levelSolved} />

          {/* Diagrama de red */}
          <NetworkDiagram
            layers={networkLayers}
            optimizer={`${OPT_LABEL[t.optimizerType]} lr=${t.lr}`}
            activationsRef={t.activationsRef}
          />

          {/* Constructor de arquitectura (restringido) */}
          <Box bg="gray.50" border="1px dashed" borderColor="gray.200" borderRadius="xl" p={3}>
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="10px" color="gray.400" fontWeight={600} letterSpacing="wide">
                ARQUITECTURA
              </Text>
              {level.maxHiddenLayers === 0 ? (
                <Text fontSize="10px" color="orange.400" fontWeight={600}>
                  🔒 Sin capas ocultas en este nivel
                </Text>
              ) : (
                <Text fontSize="10px" color="violet.400">
                  máx. {level.maxHiddenLayers} capa{level.maxHiddenLayers > 1 ? 's' : ''} ·{' '}
                  {level.maxNeurons} neur./capa
                </Text>
              )}
            </Flex>
            <LayerBuilder
              hiddenLayers={t.hiddenLayers}
              onAdd={t.addLayer}
              onRemove={t.removeLayer}
              onUpdate={t.updateLayer}
              maxLayers={level.maxHiddenLayers}
              maxNeurons={level.maxNeurons || 1}
            />
          </Box>

          {/* Controles globales */}
          <Flex gap={2} flexWrap="wrap" align="center">
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.400">
                Opt:
              </Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={t.optimizerType}
                  onChange={(e) => t.setOptimizerType(e.target.value as OptimizerType)}
                  fontSize="12px">
                  <option value="adam">Adam</option>
                  <option value="momentum">Momentum</option>
                  <option value="sgd">SGD</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.400">
                lr:
              </Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={t.lr}
                  onChange={(e) => t.setLr(Number(e.target.value))}
                  fontSize="12px">
                  {[0.1, 0.05, 0.01, 0.001].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.400">
                vel:
              </Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={t.epf}
                  onChange={(e) => t.setEpf(Number(e.target.value))}
                  fontSize="12px">
                  {[1, 5, 20, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v} ép/f
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
          </Flex>

          {/* Métricas */}
          <SimpleGrid columns={3} gap={3}>
            <StatItem variant="compact" label="Épocas" value={t.epochs} />
            <StatItem variant="compact" label="Loss" value={lossStr} />
            <StatItem
              variant="compact"
              label="Precisión"
              value={accuracyStr}
              highlight={t.accuracy !== null && t.accuracy >= level.goalAccuracy}
            />
          </SimpleGrid>

          {/* Barra de meta */}
          <GoalBar current={t.accuracy} goal={level.goalAccuracy} />

          {/* Botones */}
          <Flex gap={2} flexWrap="wrap">
            {!t.entrenando ? (
              <Button colorPalette="violet" size="sm" onClick={t.iniciar}>
                ▶ Entrenar
              </Button>
            ) : (
              <Button colorPalette="orange" size="sm" onClick={t.pausar}>
                ⏸ Pausar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={t.resetear}>
              ↺ Reiniciar pesos
            </Button>
          </Flex>

          {/* Banner de éxito */}
          {levelSolved && <SuccessBanner level={level} isFinal={isFinal} onNext={handleNext} />}
        </Flex>
      </Flex>
    </Flex>
  )
}
