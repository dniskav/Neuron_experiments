// ─── SudokuCard ───────────────────────────────────────────────────────────────

import { Box, Button, Flex, NativeSelect, Text } from '@chakra-ui/react'
import { NetworkDiagram } from '../../components/lib'
import type { ActivationType } from '../../components/lib'
import { LayerBuilder } from '../../components/shared/LayerBuilder'
import type { LayerConfig } from '../ArquitectoCard/hooks/training/useArquitectoTraining'
import { SpeedSelector, TRAIN_SPEED_OPTIONS } from '../../components/shared/SpeedSelector'
import { EpsilonBadge } from '../../components/shared/EpsilonBadge'
import { SudokuCanvas } from './SudokuCanvas'
import { useSudokuRL } from './useSudokuRL'

export function SudokuCard() {
  const s = useSudokuRL('easy')
  const { state } = s

  const networkLayers = [
    { size: 729 },
    ...s.hiddenLayers.map(l => ({ size: l.neurons, activation: l.activation as ActivationType })),
    { size: 729, activation: 'linear' as ActivationType },
  ]

  const lossStr   = state.trainLoss > 0 ? state.trainLoss.toFixed(4) : '—'
  const iterLabel = state.iteration === 0
    ? 'Sin inferencia aún'
    : state.solved
      ? `✓ Resuelto en ${state.iteration} pasos`
      : `Iteración ${state.iteration} / 20`

  return (
    <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">

      {/* ── Columna izquierda: canvas + controles ── */}
      <Flex direction="column" gap={3} align="center">
        <SudokuCanvas
          board={state.board}
          puzzle={state.puzzle}
          solution={state.solution}
          confidence={state.confidence}
          redrawVersion={state.trainStep + state.iteration * 10000}
        />

        {/* Barra de estado inferencia */}
        <Box
          w="100%"
          px={3} py="6px"
          bg={state.solved ? 'rgba(20,83,45,0.6)' : 'rgba(255,255,255,0.04)'}
          border="1px solid"
          borderColor={state.solved ? '#22c55e' : 'rgba(255,255,255,0.08)'}
          borderRadius="lg"
          textAlign="center">
          <Text fontSize="12px" color={state.solved ? '#4ade80' : 'gray.400'} fontWeight={state.solved ? 700 : 400}>
            {iterLabel}
          </Text>
        </Box>

        {/* Botones de entrenamiento */}
        <Flex gap={2} w="100%">
          {!state.running ? (
            <Button colorPalette="violet" size="sm" flex={1} onClick={s.startTraining}>
              ▶ Entrenar
            </Button>
          ) : (
            <Button colorPalette="orange" size="sm" flex={1} onClick={s.pause}>
              ⏸ Pausar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={s.reset} color="gray.400" borderColor="gray.600">
            ↺ Reiniciar
          </Button>
        </Flex>

        {/* Velocidad */}
        {state.running && (
          <SpeedSelector
            options={TRAIN_SPEED_OPTIONS}
            value={s.trainSpeed}
            onChange={s.setTrainSpeed}
            colorPalette="violet"
          />
        )}

        {/* Botones de inferencia */}
        <Flex gap={2} w="100%">
          <Button
            colorPalette="teal" size="sm" flex={1}
            onClick={s.inferStep}
            disabled={state.solved || state.iteration >= 20}>
            ▷ Un paso
          </Button>
          <Button
            colorPalette="green" size="sm" flex={1}
            onClick={() => s.inferAll()}
            disabled={state.solved}>
            ⚡ Resolver
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={s.resetInference}
            color="gray.400" borderColor="gray.600">
            ↺
          </Button>
        </Flex>

        {/* Stats entrenamiento */}
        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={3} w="100%">
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            ENTRENAMIENTO
          </Text>
          <Flex direction="column" gap={1}>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">Pasos</Text>
              <Text fontSize="12px" fontWeight={700} color="gray.300">{state.trainStep.toLocaleString()}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">Loss (MSE)</Text>
              <Text fontSize="12px" fontWeight={700} color={state.trainLoss < 0.05 ? '#4ade80' : 'gray.300'}>
                {lossStr}
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>

      {/* ── Columna derecha: configuración ── */}
      <Flex direction="column" gap={4} w="300px">

        {/* Dificultad + nuevo puzzle */}
        <Flex gap={2} align="center">
          <Text fontSize="11px" color="gray.500" flexShrink={0}>Dificultad:</Text>
          <NativeSelect.Root size="sm" flex={1}>
            <NativeSelect.Field
              value={state.difficulty}
              onChange={e => s.setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              fontSize="12px"
              style={{ background: 'transparent', color: '#cbd5e1' }}>
              <option value="easy">Fácil (51 pistas)</option>
              <option value="medium">Medio (41 pistas)</option>
              <option value="hard">Difícil (31 pistas)</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
          <Button size="sm" variant="outline" onClick={s.newPuzzle} color="gray.400" borderColor="gray.600">
            Nuevo
          </Button>
        </Flex>

        {/* Arquitectura */}
        <Box bg="rgba(255,255,255,0.04)" border="1px dashed rgba(255,255,255,0.12)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2} textAlign="center">
            ARQUITECTURA
          </Text>
          <LayerBuilder
            hiddenLayers={s.hiddenLayers as LayerConfig[]}
            onAdd={s.addLayer}
            onRemove={s.removeLayer}
            onUpdate={s.updateLayer as (i: number, patch: Partial<LayerConfig>) => void}
            maxLayers={4}
            maxNeurons={512}
            inputLabel="729 (81×9)"
            outputLabel="729 logits"
          />
        </Box>

        {/* Diagrama de red */}
        <NetworkDiagram
          layers={networkLayers}
          optimizer="Adam · lr = 0.001"
          activationsRef={s.activationsRef}
        />

        {/* Leyenda */}
        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            LEYENDA
          </Text>
          <Flex direction="column" gap={1}>
            {[
              { color: 'rgba(255,255,255,0.5)', label: 'Celda dada (puzzle)' },
              { color: '#4ade80',               label: 'Alta confianza (≥ 90%)' },
              { color: '#fbbf24',               label: 'Confianza media (70-90%)' },
              { color: '#f87171',               label: 'Baja confianza (< 70%)' },
            ].map(({ color, label }) => (
              <Flex key={label} align="center" gap={2}>
                <Box w="10px" h="10px" borderRadius="2px" bg={color} flexShrink={0} />
                <Text fontSize="11px" color="gray.500">{label}</Text>
              </Flex>
            ))}
          </Flex>
        </Box>

      </Flex>
    </Flex>
  )
}
