// ─── SudokuSession ────────────────────────────────────────────────────────────
//
// Lógica pura del Sudoku Solver neuronal. Sin dependencias de React.
//
// Dos modos:
//   Entrenamiento — genera puzzles infinitos y entrena la red con supervisión
//   Inferencia    — aplica la red iterativamente al puzzle actual,
//                   fijando celdas de mayor confianza en cada pasada
//
// El adaptador React (useSudokuRL) crea los Refs y los inyecta aquí.
//
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { NetworkN, Adam, relu, leakyRelu, tanh, sigmoid, linear, elu } from '@dniskav/neuron'
import {
  generatePuzzle, encodeBoard, encodeSolution, decodeOutput, getCandidates,
  type Difficulty, type SudokuPuzzle,
} from './SudokuGenerator'
import type { Ref } from '../shared/Ref'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type { Difficulty }
export type ActKey = 'relu' | 'leakyRelu' | 'tanh' | 'sigmoid' | 'elu' | 'linear'

export interface HiddenLayer { neurons: number; activation: ActKey }

export interface SudokuSessionState {
  // Puzzle actual
  puzzle:      number[]
  board:       number[]    // estado con celdas progresivamente resueltas
  confidence:  number[]    // confianza [0-1] por celda
  solution:    number[]
  difficulty:  Difficulty
  iteration:   number      // iteración de inferencia actual
  solved:      boolean
  // Entrenamiento
  running:     boolean
  trainStep:   number
  trainLoss:   number
  // Arquitectura
  hiddenLayers: HiddenLayer[]
}

// ── Constantes ────────────────────────────────────────────────────────────────

const LR              = 0.001
const STEPS_PER_FRAME = 1          // pasos base por frame (× trainSpeed)
const CONF_THRESHOLD  = 0.80       // confianza mínima para fijar una celda
const MAX_ITER        = 20         // máx iteraciones de inferencia

// ── Mapas ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACT_MAP: Record<ActKey, any> = { relu, leakyRelu, tanh, sigmoid, elu, linear }

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNet(hidden: HiddenLayer[]): NetworkN {
  const sizes = [729, ...hidden.map(l => l.neurons), 729]
  const acts  = [...hidden.map(l => ACT_MAP[l.activation] ?? relu), linear]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts, optimizer: (() => new Adam()) as any })
}

function softmax(logits: number[]): number[] {
  const max  = Math.max(...logits)
  const exps = logits.map(x => Math.exp(x - max))
  const sum  = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

/** Calcula MSE solo sobre las celdas vacías del puzzle */
function computeLoss(predicted: number[], target: Float32Array, puzzle: number[]): number {
  let loss = 0, count = 0
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] !== 0) continue        // ignorar celdas dadas
    for (let d = 0; d < 9; d++) {
      const diff = predicted[i * 9 + d] - target[i * 9 + d]
      loss += diff * diff
    }
    count++
  }
  return count > 0 ? loss / count : 0
}

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const layer of (net as any).layers) acts.push(layer.predict(acts[acts.length - 1]))
  return acts
}

// ── Refs inyectados por el adaptador ──────────────────────────────────────────

interface SudokuRefs {
  board:       Ref<number[]>
  confidence:  Ref<number[]>
  activations: Ref<number[][]>
  trainSpeed:  Ref<number>
}

// ── SudokuSession ─────────────────────────────────────────────────────────────

export class SudokuSession {
  private net:    NetworkN
  private running = false
  private rafId:  number | null = null

  // Estado del puzzle actual
  private current: SudokuPuzzle
  private board:      number[]
  private confidence: number[]
  private iteration   = 0
  private solved      = false

  // Stats de entrenamiento
  private trainStep = 0
  private trainLoss = 0

  private hiddenLayers: HiddenLayer[]
  private difficulty:   Difficulty

  private readonly refs:      SudokuRefs
  private readonly listeners = new Set<(state: SudokuSessionState) => void>()

  constructor(hiddenLayers: HiddenLayer[], difficulty: Difficulty, refs: SudokuRefs) {
    this.hiddenLayers = hiddenLayers
    this.difficulty   = difficulty
    this.refs         = refs
    this.net          = buildNet(hiddenLayers)
    this.current      = generatePuzzle(difficulty)
    this.board        = [...this.current.puzzle]
    this.confidence   = new Array(81).fill(0)
    this._syncRefs()
  }

  // ── Suscripción ─────────────────────────────────────────────────────────────

  subscribe(fn: (state: SudokuSessionState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): SudokuSessionState {
    return {
      puzzle:      this.current.puzzle,
      board:       this.board,
      confidence:  this.confidence,
      solution:    this.current.solution,
      difficulty:  this.difficulty,
      iteration:   this.iteration,
      solved:      this.solved,
      running:     this.running,
      trainStep:   this.trainStep,
      trainLoss:   this.trainLoss,
      hiddenLayers: this.hiddenLayers,
    }
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(fn => fn(state))
  }

  // ── Entrenamiento ────────────────────────────────────────────────────────────

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
    this.net       = buildNet(this.hiddenLayers)
    this.trainStep = 0
    this.trainLoss = 0
    this._resetInference()
    this.notify()
  }

  setArchitecture(layers: HiddenLayer[]) {
    const wasRunning  = this.running
    this.pause()
    this.hiddenLayers = layers
    this.net          = buildNet(layers)
    this.trainStep    = 0
    this.trainLoss    = 0
    this._resetInference()
    this.notify()
    if (wasRunning) setTimeout(() => this.startTraining(), 50)
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

  // ── Inferencia iterativa ─────────────────────────────────────────────────────

  /**
   * Un paso de inferencia:
   * 1. Forward pass con el estado actual del tablero
   * 2. Para cada celda vacía calcular confianza (softmax → max prob)
   * 3. Fijar celdas con confianza > CONF_THRESHOLD
   */
  inferStep() {
    if (this.iteration >= MAX_ITER) return
    if (this.solved) return

    const input   = Array.from(encodeBoard(this.board))
    const logits  = this.net.predict(input)

    const newBoard      = [...this.board]
    const newConfidence = [...this.confidence]
    let   anyFixed      = false

    for (let i = 0; i < 81; i++) {
      if (this.current.puzzle[i] !== 0) {
        newConfidence[i] = 1.0   // celda dada: confianza total
        continue
      }
      if (newBoard[i] !== 0) continue    // ya fijada en iteración anterior

      const cellLogits = logits.slice(i * 9, i * 9 + 9)
      const probs      = softmax(cellLogits)
      const maxProb    = Math.max(...probs)
      const digit      = probs.indexOf(maxProb) + 1

      newConfidence[i] = maxProb

      // Solo fijar si es candidato válido y tiene suficiente confianza
      if (maxProb >= CONF_THRESHOLD && getCandidates(newBoard, i).includes(digit)) {
        newBoard[i] = digit
        anyFixed    = true
      }
    }

    this.board      = newBoard
    this.confidence = newConfidence
    this.iteration++

    this.refs.activations.current = computeActs(this.net, input)
    this._syncRefs()

    // Verificar si está resuelto
    if (newBoard.every((v, i) => v === this.current.solution[i])) {
      this.solved = true
    }

    this.notify()
    return anyFixed
  }

  /** Ejecuta pasos de inferencia automáticamente hasta resolver o agotar intentos */
  async inferAll() {
    this._resetInference()
    this.notify()

    for (let i = 0; i < MAX_ITER; i++) {
      await new Promise(r => setTimeout(r, 120))   // pausa visual entre pasos
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

  private _syncRefs() {
    this.refs.board.current      = this.board
    this.refs.confidence.current = this.confidence
  }

  private _resetInference() {
    this.board      = [...this.current.puzzle]
    this.confidence = new Array(81).fill(0)
    // Marcar celdas dadas con confianza 1
    for (let i = 0; i < 81; i++) {
      if (this.current.puzzle[i] !== 0) this.confidence[i] = 1.0
    }
    this.iteration = 0
    this.solved    = false
    this._syncRefs()
  }

  private readonly _loop = () => {
    if (!this.running) return

    const stepsCount = Math.max(1, Math.round(STEPS_PER_FRAME * this.refs.trainSpeed.current))

    for (let s = 0; s < stepsCount; s++) {
      // Generar puzzle aleatorio para este paso
      const sample  = generatePuzzle(this.difficulty)
      const input   = Array.from(encodeBoard(sample.puzzle))
      const target  = Array.from(encodeSolution(sample.solution))

      // Forward + backward
      this.net.train(input, target, LR)
      this.trainStep++

      // Calcular loss cada 10 pasos (costoso — solo en el último del frame)
      if (s === stepsCount - 1) {
        const predicted = this.net.predict(input)
        this.trainLoss  = computeLoss(predicted, encodeSolution(sample.solution), sample.puzzle)
      }
    }

    // Preview del puzzle actual (sin fijar celdas) para animar el canvas
    const previewInput  = Array.from(encodeBoard(this.current.puzzle))
    const previewLogits = this.net.predict(previewInput)
    const newBoard      = [...this.current.puzzle]
    const newConf       = new Array(81).fill(0)
    for (let i = 0; i < 81; i++) {
      if (this.current.puzzle[i] !== 0) { newConf[i] = 1.0; continue }
      const probs  = softmax(previewLogits.slice(i * 9, i * 9 + 9))
      const maxP   = Math.max(...probs)
      newConf[i]   = maxP
      newBoard[i]  = probs.indexOf(maxP) + 1
    }
    this.board      = newBoard
    this.confidence = newConf
    this.refs.activations.current = computeActs(this.net, previewInput)
    this._syncRefs()

    this.notify()
    this.rafId = requestAnimationFrame(this._loop)
  }
}
