// ─── TransformerSudokuSession ─────────────────────────────────────────────────
//
// Lógica pura del Sudoku Solver con Transformer (self-attention).
// Sin dependencias de React.
//
// Usa NetworkTransformer de @dniskav/neuron:
//   81 tokens (dígitos 0-9) → N bloques de atención → 81 × 9 logits
//
// Diferencia clave respecto al MLP:
//   El MLP trata los 729 inputs como un vector plano.
//   El Transformer da a cada celda la capacidad de "mirar" a todas las demás.
//   Las cabezas aprenden relaciones de fila, columna y caja de forma emergente.
//
// ─────────────────────────────────────────────────────────────────────────────

import { NetworkTransformer } from '@dniskav/neuron'
import {
  generatePuzzle, encodeSolution, getCandidates,
  type Difficulty, type SudokuPuzzle,
} from './SudokuGenerator'
import type { Ref } from '../shared/Ref'

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type { Difficulty }

export interface TransformerSudokuState {
  // Puzzle actual
  puzzle:      number[]
  board:       number[]
  confidence:  number[]
  solution:    number[]
  difficulty:  Difficulty
  iteration:   number
  solved:      boolean
  // Entrenamiento
  running:     boolean
  trainStep:   number
  trainLoss:   number
  diversity:   number   // 0-9: unique digits predicted for empty cells (1 = mode collapse)
  resets:      number   // veces que la red se reinició automáticamente
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const LR              = 0.001    // CE gradiente ~10× menor que MSE → LR mayor es estable
const CE_MAX          = 17       // max teórico CE = -log(1e-7) ≈ 16.12; cualquier loss > 17 indica divergencia
const COLLAPSE_STEPS  = 50       // frames con colapso (diversity ≤ 1) antes de reiniciar la red
const STEPS_PER_FRAME = 1
const CONF_THRESHOLD  = 0.80
const MAX_ITER        = 20

// Arquitectura del Transformer — pequeña para que corra fluido en el navegador
const SEQ_LEN  = 81
const VOCAB    = 10   // dígitos 0–9
const D_MODEL  = 32
const N_HEADS  = 4    // d_k = d_model / nHeads = 8
const D_FF     = 64
const N_BLOCKS = 2
const N_CLASSES = 9   // dígitos 1–9 por celda

// ── Helpers ────────────────────────────────────────────────────────────────────

function softmax(logits: number[]): number[] {
  const max  = Math.max(...logits)
  const exps = logits.map(x => Math.exp(x - max))
  const sum  = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

// ── Refs inyectados por el adaptador ──────────────────────────────────────────

interface TransformerRefs {
  board:            Ref<number[]>
  confidence:       Ref<number[]>
  trainSpeed:       Ref<number>
  attentionWeights: Ref<(number[][] | null)[][]>   // nBlocks × nHeads
}

// ── TransformerSudokuSession ──────────────────────────────────────────────────

export class TransformerSudokuSession {
  private net:    NetworkTransformer
  private running = false
  private rafId:  number | null = null

  private current:    SudokuPuzzle
  private board:      number[]
  private confidence: number[]
  private iteration   = 0
  private solved      = false

  private trainStep     = 0
  private trainLoss     = 0
  private diversity     = 0
  private resets        = 0
  private collapseStreak = 0

  private difficulty: Difficulty
  private readonly refs:      TransformerRefs
  private readonly listeners = new Set<(state: TransformerSudokuState) => void>()

  constructor(difficulty: Difficulty, refs: TransformerRefs) {
    this.difficulty = difficulty
    this.refs       = refs
    this.net        = this._buildNet()
    this.current    = generatePuzzle(difficulty)
    this.board      = [...this.current.puzzle]
    this.confidence = new Array(81).fill(0)
    this._markGiven()
    this._syncRefs()
  }

  // ── API pública ────────────────────────────────────────────────────────────

  subscribe(fn: (state: TransformerSudokuState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): TransformerSudokuState {
    return {
      puzzle:     this.current.puzzle,
      board:      this.board,
      confidence: this.confidence,
      solution:   this.current.solution,
      difficulty: this.difficulty,
      iteration:  this.iteration,
      solved:     this.solved,
      running:    this.running,
      trainStep:  this.trainStep,
      trainLoss:  this.trainLoss,
      diversity:  this.diversity,
      resets:     this.resets,
    }
  }

  startTraining() {
    if (this.running) return
    this.running = true
    this.notify()
    this._loop()
  }

  pause() {
    this.running = false
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null }
    this.notify()
  }

  reset() {
    this.pause()
    this.net            = this._buildNet()
    this.trainStep      = 0
    this.trainLoss      = 0
    this.diversity      = 0
    this.resets         = 0
    this.collapseStreak = 0
    this.refs.attentionWeights.current = []
    this._resetInference()
    this.notify()
  }

  setDifficulty(d: Difficulty) {
    this.difficulty = d
    this.newPuzzle()
  }

  newPuzzle() {
    this.current = generatePuzzle(this.difficulty)
    this._resetInference()
    this.notify()
  }

  inferStep() {
    if (this.iteration >= MAX_ITER || this.solved) return

    const logits = this.net.predict(this.board)

    const newBoard      = [...this.board]
    const newConfidence = [...this.confidence]
    let   anyFixed      = false

    for (let i = 0; i < 81; i++) {
      if (this.current.puzzle[i] !== 0) { newConfidence[i] = 1.0; continue }
      if (newBoard[i] !== 0) continue   // ya fijada

      const probs   = softmax(logits.slice(i * 9, i * 9 + 9))
      const maxProb = Math.max(...probs)
      const digit   = probs.indexOf(maxProb) + 1

      newConfidence[i] = maxProb
      if (maxProb >= CONF_THRESHOLD && getCandidates(newBoard, i).includes(digit)) {
        newBoard[i] = digit
        anyFixed    = true
      }
    }

    this.board      = newBoard
    this.confidence = newConfidence
    this.iteration++

    this.refs.attentionWeights.current = this.net.getAttentionWeights()
    this._syncRefs()

    if (newBoard.every((v, i) => v === this.current.solution[i])) {
      this.solved = true
    }

    this.notify()
    return anyFixed
  }

  async inferAll() {
    this._resetInference()
    this.notify()
    for (let i = 0; i < MAX_ITER; i++) {
      await new Promise(r => setTimeout(r, 120))
      const anyFixed = this.inferStep()
      if (this.solved || !anyFixed) break
    }
  }

  resetInference() {
    this._resetInference()
    this.notify()
  }

  destroy() {
    this.running = false
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null }
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private _buildNet(): NetworkTransformer {
    return new NetworkTransformer(SEQ_LEN, {
      vocabSize: VOCAB,
      d_model:   D_MODEL,
      nHeads:    N_HEADS,
      d_ff:      D_FF,
      nBlocks:   N_BLOCKS,
      nClasses:  N_CLASSES,
    })
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(fn => fn(state))
  }

  private _syncRefs() {
    this.refs.board.current      = this.board
    this.refs.confidence.current = this.confidence
  }

  private _markGiven() {
    for (let i = 0; i < 81; i++) {
      if (this.current.puzzle[i] !== 0) this.confidence[i] = 1.0
    }
  }

  private _resetInference() {
    this.board      = [...this.current.puzzle]
    this.confidence = new Array(81).fill(0)
    this._markGiven()
    this.iteration = 0
    this.solved    = false
    this._syncRefs()
  }

  private readonly _loop = () => {
    if (!this.running) return

    // Usar setTimeout(0) en vez de RAF puro para no bloquear el hilo de render.
    // El Transformer con 81 tokens es lento (~100-300ms/paso en JS), así que
    // cedemos el control al navegador entre cada paso para que el canvas
    // y la UI puedan actualizarse.
    setTimeout(() => {
      if (!this.running) return

      const stepsCount = Math.max(1, Math.round(STEPS_PER_FRAME * this.refs.trainSpeed.current))

      for (let s = 0; s < stepsCount; s++) {
        const sample  = generatePuzzle(this.difficulty)
        const tokens  = sample.puzzle
        const targets = Array.from(encodeSolution(sample.solution))
        const mask    = sample.puzzle.map(v => v === 0)

        const loss = this.net.train(tokens, targets, LR, mask)

        // Detectar divergencia: NaN, Inf, o valor por encima del máximo CE teórico
        if (!isFinite(loss) || isNaN(loss) || loss > CE_MAX) {
          this.net       = this._buildNet()
          this.trainLoss = 0
          this.resets++
          this.collapseStreak = 0
        } else {
          // EMA para suavizar el loss mostrado (α = 0.05)
          this.trainLoss = this.trainLoss === 0
            ? loss
            : 0.95 * this.trainLoss + 0.05 * loss
        }
        this.trainStep++
      }

      // Preview del puzzle actual para animar el canvas mientras entrena
      const previewLogits = this.net.predict(this.current.puzzle)

      // Guard de NaN: si los pesos divergieron, ignorar este frame
      if (!previewLogits.some(isNaN)) {
        const newBoard = [...this.current.puzzle]
        const newConf  = new Array(81).fill(0)
        for (let i = 0; i < 81; i++) {
          if (this.current.puzzle[i] !== 0) { newConf[i] = 1.0; continue }
          const probs = softmax(previewLogits.slice(i * 9, i * 9 + 9))
          const maxP  = Math.max(...probs)
          newConf[i]  = maxP
          newBoard[i] = probs.indexOf(maxP) + 1
        }
        this.board      = newBoard
        this.confidence = newConf

        // Diversidad: cuántos dígitos distintos predice la red para celdas vacías
        const emptyPreds = newBoard.filter((_, i) => this.current.puzzle[i] === 0)
        this.diversity   = new Set(emptyPreds).size

        // Detectar colapso de modo (predice siempre el mismo dígito)
        if (this.diversity <= 1) {
          this.collapseStreak++
          if (this.collapseStreak >= COLLAPSE_STEPS) {
            this.net            = this._buildNet()
            this.trainLoss      = 0
            this.collapseStreak = 0
            this.resets++
          }
        } else {
          this.collapseStreak = 0
        }
      }
      this.refs.attentionWeights.current = this.net.getAttentionWeights()
      this._syncRefs()

      this.notify()
      this.rafId = requestAnimationFrame(this._loop)
    }, 0)
  }
}
