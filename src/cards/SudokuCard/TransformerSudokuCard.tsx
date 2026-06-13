// ─── TransformerSudokuCard ────────────────────────────────────────────────────
//
// Sudoku Solver con Transformer (self-attention).
// Incluye visualización del mapa de atención y explicación del mecanismo.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useState, type RefObject } from 'react'
import { Box, Button, Flex, NativeSelect, Text } from '@chakra-ui/react'
import { SpeedSelector, TRAIN_SPEED_OPTIONS } from '../../components/shared/SpeedSelector'
import { SudokuCanvas } from './SudokuCanvas'
import { useTransformerSudoku } from './useTransformerSudoku'

// ── AttentionCanvas ───────────────────────────────────────────────────────────
//
// Dibuja la matriz de atención 81×81 del head seleccionado como un heatmap.
// Ejes: X = celda "key" (a la que se atiende), Y = celda "query" (la que atiende).
// Líneas de cuadrícula cada 9 celdas (filas/columnas) y cada 27 (cajas 3×3).

const CELL_PX = 3   // píxeles por celda → canvas 243×243

// Props: además de los pesos, recibe un número de versión para forzar redibujado
// incluso cuando la referencia del array no cambia entre renders.
function AttentionCanvas({
  attentionWeightsRef,
  selBlock,
  selHead,
  version,
}: {
  attentionWeightsRef: RefObject<(number[][] | null)[][]>
  selBlock: number
  selHead:  number
  version:  number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const N      = 81
    const W      = N * CELL_PX
    // Leer los pesos directamente del ref en el momento del redibujado
    const weights = attentionWeightsRef.current?.[selBlock]?.[selHead] ?? null

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, W)

    if (!weights) {
      ctx.fillStyle = 'rgba(148,163,184,0.35)'
      ctx.font      = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Entrena primero', W / 2, W / 2)
      return
    }

    // Normalización min-max por fila: estira cada fila a [0, 1].
    // Esto maximiza el contraste incluso cuando la distribución es casi uniforme
    // (al inicio softmax sobre 81 tokens → ~0.012/celda, rango tiny sin normalizar).
    for (let q = 0; q < N; q++) {
      const row    = weights[q] ?? []
      const validRow = row.filter(x => !isNaN(x))
      if (validRow.length === 0) continue          // fila con NaN — skip
      const maxVal = Math.max(...validRow)
      const minVal = Math.min(...validRow)
      const range  = maxVal - minVal || 1e-9
      for (let k = 0; k < N; k++) {
        const raw = row[k] ?? 0
        const v   = isNaN(raw) ? 0 : (raw - minVal) / range   // min-max → 0–1
        const r   = Math.round(15  + 105 * v)
        const g   = Math.round(8   + 35  * v)
        const b   = Math.round(50  + 205 * v)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(k * CELL_PX, q * CELL_PX, CELL_PX, CELL_PX)
      }
    }

    // Líneas cada 9 celdas (filas/columnas del Sudoku)
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.lineWidth   = 0.5
    for (let i = 9; i < N; i += 9) {
      ctx.beginPath(); ctx.moveTo(i * CELL_PX, 0); ctx.lineTo(i * CELL_PX, W); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * CELL_PX); ctx.lineTo(W, i * CELL_PX); ctx.stroke()
    }

    // Líneas cada 27 celdas (cajas 3×3) — más gruesas
    ctx.strokeStyle = 'rgba(255,255,255,0.30)'
    ctx.lineWidth   = 1
    for (let i = 27; i < N; i += 27) {
      ctx.beginPath(); ctx.moveTo(i * CELL_PX, 0); ctx.lineTo(i * CELL_PX, W); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * CELL_PX); ctx.lineTo(W, i * CELL_PX); ctx.stroke()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, selBlock, selHead])

  return (
    <canvas
      ref={canvasRef}
      width={81 * CELL_PX}
      height={81 * CELL_PX}
      style={{ borderRadius: '4px', display: 'block' }}
    />
  )
}

// ── TransformerSudokuCard ─────────────────────────────────────────────────────

export function TransformerSudokuCard() {
  const s = useTransformerSudoku('easy')
  const { state } = s

  const [selBlock, setSelBlock] = useState(0)
  const [selHead,  setSelHead]  = useState(0)

  const lossStr   = (state.trainLoss > 0 && isFinite(state.trainLoss))
    ? state.trainLoss.toFixed(4)
    : '—'
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

        {/* Estado inferencia */}
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

        {/* Botones entrenamiento */}
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

        {state.running && (
          <SpeedSelector
            options={TRAIN_SPEED_OPTIONS}
            value={s.trainSpeed}
            onChange={s.setTrainSpeed}
            colorPalette="violet"
          />
        )}

        {/* Botones inferencia */}
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

        {/* Stats */}
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
              <Text fontSize="12px" color="gray.500">Loss (CE)</Text>
              <Text fontSize="12px" fontWeight={700} color={state.trainLoss < 1.5 ? '#4ade80' : state.trainLoss < 2.0 ? '#fbbf24' : 'gray.300'}>
                {lossStr}
              </Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="10px" color="gray.600">Inicio aleatorio</Text>
              <Text fontSize="10px" color="gray.600">≈ 2.20</Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>

      {/* ── Columna derecha: atención + explicación ── */}
      <Flex direction="column" gap={4} w="300px">

        {/* Dificultad */}
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

        {/* Mapa de atención */}
        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            MAPA DE ATENCIÓN
          </Text>

          {/* Selectores de bloque y cabeza */}
          <Flex gap={2} mb={2}>
            <Flex align="center" gap={1} flex={1}>
              <Text fontSize="10px" color="gray.600" flexShrink={0}>Bloque</Text>
              <NativeSelect.Root size="xs" flex={1}>
                <NativeSelect.Field
                  value={selBlock}
                  onChange={e => setSelBlock(Number(e.target.value))}
                  fontSize="11px"
                  style={{ background: 'transparent', color: '#94a3b8' }}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1} flex={1}>
              <Text fontSize="10px" color="gray.600" flexShrink={0}>Cabeza</Text>
              <NativeSelect.Root size="xs" flex={1}>
                <NativeSelect.Field
                  value={selHead}
                  onChange={e => setSelHead(Number(e.target.value))}
                  fontSize="11px"
                  style={{ background: 'transparent', color: '#94a3b8' }}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
          </Flex>

          <Box borderRadius="md" overflow="hidden">
            <AttentionCanvas
              attentionWeightsRef={s.attentionWeightsRef}
              selBlock={selBlock}
              selHead={selHead}
              version={state.trainStep + state.iteration * 100000}
            />
          </Box>

          <Text fontSize="10px" color="gray.600" mt={2} lineHeight="short">
            Eje X = celda consultada · Eje Y = celda que consulta.
            Líneas finas = filas/columnas · Líneas gruesas = cajas 3×3.
          </Text>
        </Box>

        {/* Explicación */}
        <Box bg="rgba(255,255,255,0.04)" border="1px dashed rgba(255,255,255,0.12)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            ¿CÓMO FUNCIONA?
          </Text>
          <Flex direction="column" gap={2}>
            <ExplainItem
              title="El problema del MLP"
              text="Una red clásica ve los 729 inputs como un vector plano. No sabe que la celda (2,5) está en la misma fila que (2,1), ni en la misma caja que (3,4)."
            />
            <ExplainItem
              title="Self-attention"
              text="Cada celda calcula Q·K^T para todas las demás y decide a cuáles prestarles atención. El resultado es un promedio ponderado de los valores V de cada celda."
            />
            <ExplainItem
              title="Múltiples cabezas"
              text="Con 4 cabezas en paralelo, cada una puede especializarse: una para filas, otra para columnas, otra para cajas 3×3. La red lo descubre sola durante el entrenamiento."
            />
            <ExplainItem
              title="El mapa de arriba"
              text="Muestra qué celdas atiende cada cabeza. Patrones diagonales = misma fila. Bloques 9×9 = misma columna. Bloques 27×27 = misma caja."
            />
          </Flex>
        </Box>

        {/* Leyenda canvas */}
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

// ── ExplainItem ───────────────────────────────────────────────────────────────

function ExplainItem({ title, text }: { title: string; text: string }) {
  return (
    <Box>
      <Text fontSize="11px" color="gray.300" fontWeight={600} mb="2px">{title}</Text>
      <Text fontSize="11px" color="gray.500" lineHeight="short">{text}</Text>
    </Box>
  )
}
