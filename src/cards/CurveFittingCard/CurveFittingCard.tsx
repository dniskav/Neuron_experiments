// ─── CurveFittingCard ──────────────────────────────────────────────────────────
//
// Visualises a NetworkN learning to approximate a mathematical function.
// Shows the true curve (blue) vs. the network's prediction (red) on an HTML canvas.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect } from 'react'
import { Box, Button, Flex, NativeSelect, Text } from '@chakra-ui/react'
import { CardRoot, StatItem } from '../../components/lib'
import { useCurveFitting, type FunctionId } from './useCurveFitting'

// ── Canvas component ────────────────────────────────────────────────────────────

function CurveCanvas({
  trueCurve,
  predCurve,
  canvasW,
  canvasH,
}: {
  trueCurve: { x: number; y: number }[]
  predCurve: { x: number; y: number }[]
  canvasW: number
  canvasH: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvasW
    const H = canvasH

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Map data coords to canvas pixels
    const toCanvas = (x: number, y: number): [number, number] => {
      const PAD = 44
      const cx = PAD + ((x + 1) / 2) * (W - 2 * PAD)
      const cy = PAD + ((2 - y) / 4) * (H - 2 * PAD)
      return [cx, cy]
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth   = 1
    for (let gy = -2; gy <= 2; gy += 0.5) {
      const [, py] = toCanvas(0, gy)
      ctx.beginPath(); ctx.moveTo(44, py); ctx.lineTo(W - 44, py); ctx.stroke()
    }
    for (let gx = -1; gx <= 1; gx += 0.25) {
      const [px] = toCanvas(gx, 0)
      ctx.beginPath(); ctx.moveTo(px, 44); ctx.lineTo(px, H - 44); ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = 'rgba(0,0,0,0.20)'
    ctx.lineWidth   = 1.5
    const [ax0, ay0] = toCanvas(-1, 0)
    const [ax1]      = toCanvas(1, 0)
    ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(ax1, ay0); ctx.stroke()

    const [bx0]      = toCanvas(0, -2)
    const [, by1]    = toCanvas(0, 2)
    ctx.beginPath(); ctx.moveTo(bx0, by1); ctx.lineTo(bx0, ay0); ctx.stroke()  // note: y is inverted

    // Tick labels
    ctx.fillStyle    = '#9ca3af'
    ctx.font         = '10px monospace'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('-1', ...toCanvas(-1, 0) as [number, number])
    ctx.fillText('0',  ...toCanvas(0, 0) as [number, number])
    ctx.fillText('1',  ...toCanvas(1, 0) as [number, number])

    ctx.textAlign    = 'right'
    ctx.textBaseline = 'middle'
    const [tickX] = toCanvas(0, 0)
    ctx.fillText('2',  tickX - 6, toCanvas(0, 2)[1])
    ctx.fillText('-2', tickX - 6, toCanvas(0, -2)[1])

    // Draw curves
    const drawCurve = (pts: { x: number; y: number }[], color: string, width: number) => {
      if (pts.length < 2) return
      ctx.strokeStyle = color
      ctx.lineWidth   = width
      ctx.beginPath()
      ctx.moveTo(...toCanvas(pts[0].x, pts[0].y))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(...toCanvas(pts[i].x, pts[i].y))
      }
      ctx.stroke()
    }

    drawCurve(trueCurve, '#3b82f6', 2.5)   // blue = true function
    drawCurve(predCurve, '#ef4444', 2)      // red  = network prediction
  }, [trueCurve, predCurve, canvasW, canvasH])

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{ borderRadius: '8px', display: 'block', border: '1px solid #e5e7eb' }}
    />
  )
}

// ── Card ────────────────────────────────────────────────────────────────────────

export function CurveFittingCard() {
  const s = useCurveFitting()

  const lossStr = s.loss !== null ? s.loss.toFixed(6) : '\u2014'

  return (
    <CardRoot maxW="520px" w="100%">
      <Text fontSize="lg" fontWeight={700} color="gray.800">
        Aproximación de funciones
      </Text>

      <Text fontSize="sm" color="gray.600" lineHeight={1.5}>
        Una red feedforward aprende a mapear <strong>x → f(x)</strong> para funciones
        como sin(x), x² y tanh(x). Observa cómo la curva roja (predicción) se ajusta
        a la curva azul (función real) durante el entrenamiento.
      </Text>

      <Flex alignItems="center" flexWrap="wrap" gap={1} fontSize="xs">
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>Entrada: 1</Box>
        <Text as="span" color="gray.400">→</Text>
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>32 · relu</Box>
        <Text as="span" color="gray.400">→</Text>
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>32 · relu</Box>
        <Text as="span" color="gray.400">→</Text>
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>Salida: 1 · linear</Box>
      </Flex>

      {/* Function selector */}
      <Flex gap={2} align="center">
        <Text fontSize="12px" color="gray.500" flexShrink={0}>Función:</Text>
        <NativeSelect.Root size="sm" flex={1}>
          <NativeSelect.Field
            value={s.selectedFn}
            onChange={(e) => s.selectFn(e.target.value as FunctionId)}
            fontSize="12px"
          >
            <option value="sin">sin(x)</option>
            <option value="x2">x²</option>
            <option value="tanh">tanh(x)</option>
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Flex>

      {/* Canvas */}
      <Box alignSelf="center">
        <CurveCanvas
          trueCurve={s.trueCurve}
          predCurve={s.predCurve}
          canvasW={s.canvasW}
          canvasH={s.canvasH}
        />
      </Box>

      {/* Legend */}
      <Flex gap={4} fontSize="xs" color="gray.500" alignSelf="center">
        <Flex align="center" gap={1}>
          <Box w="20px" h="3px" bg="#3b82f6" borderRadius="full" />
          <Text>Función real</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w="20px" h="3px" bg="#ef4444" borderRadius="full" />
          <Text>Predicción de la red</Text>
        </Flex>
      </Flex>

      {/* Stats */}
      <Flex gap={2} flexWrap="wrap">
        <StatItem label="Épocas" value={String(s.epochs)} />
        <StatItem label="Loss MSE" value={lossStr} />
        <StatItem label="Optimizador" value="Adam" />
      </Flex>

      {/* Controls */}
      <Flex gap={2}>
        {!s.training ? (
          <Button flex={1} colorPalette="green" onClick={s.startTraining}>
            ▶ Entrenar
          </Button>
        ) : (
          <Button flex={1} colorPalette="yellow" onClick={s.pause}>
            ⏸ Pausar
          </Button>
        )}
        <Button flex={1} colorPalette="violet" disabled={s.training} onClick={s.singleStep}>
          1 época
        </Button>
        <Button flex={1} variant="outline" onClick={s.reset}>
          ↺ Resetear
        </Button>
      </Flex>
    </CardRoot>
  )
}
