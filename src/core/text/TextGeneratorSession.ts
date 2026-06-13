// ─── TextGeneratorSession ──────────────────────────────────────────────────────
//
// Character-level language model using NetworkTransformer.
// Learns to predict the next character given a sliding window of context.
//
// ─────────────────────────────────────────────────────────────────────────────

import { NetworkTransformer } from '@dniskav/neuron'
import type { Ref } from '../shared/Ref'

// ── Types públicos ──────────────────────────────────────────────────────────────

export interface TextGeneratorState {
  running:     boolean
  trainStep:   number
  trainLoss:   number
  epoch:       number
  generated:   string
  corpus:      string
}

// ── Constantes ──────────────────────────────────────────────────────────────────

const CORPUS = 'the quick brown fox jumps over the lazy dog'
const VOCAB  = 'abcdefghijklmnopqrstuvwxyz '
const VOCAB_SIZE = VOCAB.length   // 27
const SEQ_LEN    = 20
const D_MODEL    = 16
const N_HEADS    = 2
const D_FF       = 32
const N_BLOCKS   = 2
const LR         = 0.001
const STEPS_PER_FRAME = 3
const GENERATE_LEN    = 80
const CE_MAX           = 20

// ── Helpers ─────────────────────────────────────────────────────────────────────

function charToIdx(ch: string): number {
  const i = VOCAB.indexOf(ch)
  return i === -1 ? 26 : i   // unknown → space
}

function idxToChar(i: number): string {
  return VOCAB[i] ?? ' '
}

function softmax(logits: number[]): number[] {
  const max  = Math.max(...logits)
  const exps = logits.map(x => Math.exp(x - max))
  const sum  = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

// Weighted random pick from a probability distribution
function sampleFromProbs(probs: number[]): number {
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i]
    if (r < cumulative) return i
  }
  return probs.length - 1
}

// ── Refs inyectados ─────────────────────────────────────────────────────────────

interface TextGeneratorRefs {
  trainSpeed: Ref<number>
}

// ── TextGeneratorSession ────────────────────────────────────────────────────────

export class TextGeneratorSession {
  private net:    NetworkTransformer
  private running = false
  private rafId:  number | null = null

  private trainStep  = 0
  private trainLoss  = 0
  private epoch      = 0
  private generated  = ''

  private readonly refs:      TextGeneratorRefs
  private readonly listeners  = new Set<(state: TextGeneratorState) => void>()

  constructor(refs: TextGeneratorRefs) {
    this.refs = refs
    this.net  = this._buildNet()
    this.generated = this._generate('the', GENERATE_LEN)
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  subscribe(fn: (state: TextGeneratorState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): TextGeneratorState {
    return {
      running:   this.running,
      trainStep: this.trainStep,
      trainLoss: this.trainLoss,
      epoch:     this.epoch,
      generated: this.generated,
      corpus:    CORPUS,
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
    this.net       = this._buildNet()
    this.trainStep = 0
    this.trainLoss = 0
    this.epoch     = 0
    this.generated = this._generate('the', GENERATE_LEN)
    this.notify()
  }

  generate() {
    this.generated = this._generate('the', GENERATE_LEN)
    this.notify()
  }

  destroy() {
    this.running = false
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null }
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private _buildNet(): NetworkTransformer {
    return new NetworkTransformer(SEQ_LEN, {
      vocabSize: VOCAB_SIZE,
      d_model:   D_MODEL,
      nHeads:    N_HEADS,
      d_ff:      D_FF,
      nBlocks:   N_BLOCKS,
      nClasses:  VOCAB_SIZE,
    })
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(fn => fn(state))
  }

  /** Pick a random window from the corpus and return (tokens, targets). */
  private _sampleWindow(): { tokens: number[]; targets: number[] } {
    const maxStart = CORPUS.length - SEQ_LEN - 1
    const start    = Math.floor(Math.random() * Math.max(1, maxStart))
    const tokens   = Array.from(CORPUS.slice(start, start + SEQ_LEN), charToIdx)
    const targets  = Array.from(CORPUS.slice(start + 1, start + SEQ_LEN + 1), charToIdx)
    return { tokens, targets }
  }

  /** Generate text autoregressively from a seed string. */
  private _generate(seed: string, length: number): string {
    // Build initial context window
    let context = seed.toLowerCase().slice(-SEQ_LEN)
    while (context.length < SEQ_LEN) context = ' ' + context

    let result = seed

    for (let i = 0; i < length; i++) {
      const tokens = Array.from(context, charToIdx)
      const logits = this.net.predict(tokens)

      // Take logits for the last position → next-char prediction
      const lastLogits = logits.slice((SEQ_LEN - 1) * VOCAB_SIZE, SEQ_LEN * VOCAB_SIZE)
      const probs      = softmax(lastLogits)
      const nextIdx    = sampleFromProbs(probs)
      const nextChar   = idxToChar(nextIdx)

      result  += nextChar
      context  = context.slice(1) + nextChar
    }

    return result
  }

  private readonly _loop = () => {
    if (!this.running) return

    setTimeout(() => {
      if (!this.running) return

      const stepsCount = Math.max(1, Math.round(STEPS_PER_FRAME * this.refs.trainSpeed.current))

      for (let s = 0; s < stepsCount; s++) {
        const { tokens, targets } = this._sampleWindow()
        const loss = this.net.train(tokens, targets, LR)

        if (!isFinite(loss) || isNaN(loss) || loss > CE_MAX) {
          this.net       = this._buildNet()
          this.trainLoss = 0
        } else {
          this.trainLoss = this.trainLoss === 0
            ? loss
            : 0.95 * this.trainLoss + 0.05 * loss
        }
        this.trainStep++
      }

      // Epoch ≈ one full pass through all possible windows
      const windowsPerEpoch = Math.max(1, CORPUS.length - SEQ_LEN)
      this.epoch = Math.floor(this.trainStep / windowsPerEpoch)

      // Re-generate periodically so the UI updates
      if (this.trainStep % 20 === 0) {
        this.generated = this._generate('the', GENERATE_LEN)
      }

      this.notify()
      this.rafId = requestAnimationFrame(this._loop)
    }, 0)
  }
}
