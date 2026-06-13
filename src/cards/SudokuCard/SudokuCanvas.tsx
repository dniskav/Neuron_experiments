// ─── SudokuCanvas ─────────────────────────────────────────────────────────────
//
// Visualiza el tablero Sudoku con:
//   · Celdas dadas   — blancas, fondo sutil
//   · Celdas de red  — coloreadas según confianza (verde → amarillo → rojo)
//   · Celdas vacías  — oscuras
//   · Separadores de caja 3×3 más gruesos
//
// Redibuja cuando cambia redrawVersion.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect } from 'react'

const CANVAS = 360
const CELL   = CANVAS / 9  // 40px por celda

// Colores por nivel de confianza
function cellColors(conf: number): { bg: string; text: string } {
  if (conf >= 0.90) return { bg: 'rgba(20,83,45,0.85)',   text: '#4ade80' }  // verde
  if (conf >= 0.70) return { bg: 'rgba(120,53,15,0.85)',  text: '#fbbf24' }  // ámbar
  return               { bg: 'rgba(127,29,29,0.75)',  text: '#f87171' }  // rojo
}

interface Props {
  board:         number[]      // 81 valores, 0 = vacío
  puzzle:        number[]      // celdas dadas originales
  solution:      number[]      // solución correcta
  confidence:    number[]      // [0-1] por celda
  redrawVersion: number
}

export function SudokuCanvas({ board, puzzle, solution, confidence, redrawVersion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── Fondo ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS, CANVAS)

    // ── Fondos de cajas 3×3 alternos ──────────────────────────────────────
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const even = (br + bc) % 2 === 0
        ctx.fillStyle = even ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.0)'
        ctx.fillRect(bc * CELL * 3, br * CELL * 3, CELL * 3, CELL * 3)
      }
    }

    // ── Celdas ─────────────────────────────────────────────────────────────
    for (let i = 0; i < 81; i++) {
      const row  = Math.floor(i / 9)
      const col  = i % 9
      const x    = col * CELL
      const y    = row * CELL
      const val  = board[i]
      const given = puzzle[i] !== 0
      const conf = confidence[i]
      const pad  = 2

      if (given) {
        // Celda dada — fondo sutil
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        ctx.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2)
      } else if (val !== 0) {
        // Celda resuelta por la red — color según confianza
        const { bg } = cellColors(conf)
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 4)
        ctx.fill()

        // Barra de confianza (fondo)
        const barH = 3
        const barY = y + CELL - pad - barH
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(x + pad, barY, CELL - pad * 2, barH)
        // Barra de confianza (fill)
        const { bg: barColor } = cellColors(conf)
        ctx.fillStyle = barColor
        ctx.fillRect(x + pad, barY, (CELL - pad * 2) * conf, barH)
      }

      // ── Número ───────────────────────────────────────────────────────────
      if (val !== 0) {
        const wrong = !given && val !== solution[i]

        if (given) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'
          ctx.font      = `bold 18px monospace`
        } else if (wrong) {
          ctx.fillStyle = '#f87171'
          ctx.font      = `600 16px monospace`
        } else {
          const { text } = cellColors(conf)
          ctx.fillStyle  = text
          ctx.font       = `600 16px monospace`
        }

        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(val), x + CELL / 2, y + CELL / 2 - (val !== 0 && !given ? 2 : 0))
      }
    }

    // ── Grid lines ─────────────────────────────────────────────────────────
    for (let i = 0; i <= 9; i++) {
      const isBox   = i % 3 === 0
      ctx.strokeStyle = isBox ? 'rgba(148,163,184,0.4)' : 'rgba(255,255,255,0.07)'
      ctx.lineWidth   = isBox ? 1.5 : 0.5
      // horizontal
      ctx.beginPath()
      ctx.moveTo(0,      i * CELL)
      ctx.lineTo(CANVAS, i * CELL)
      ctx.stroke()
      // vertical
      ctx.beginPath()
      ctx.moveTo(i * CELL, 0)
      ctx.lineTo(i * CELL, CANVAS)
      ctx.stroke()
    }

    // ── Borde exterior ─────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'
    ctx.lineWidth   = 2
    ctx.strokeRect(1, 1, CANVAS - 2, CANVAS - 2)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawVersion])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS}
      height={CANVAS}
      style={{ borderRadius: 8, display: 'block' }}
    />
  )
}
