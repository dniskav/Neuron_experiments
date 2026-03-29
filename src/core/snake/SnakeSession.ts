// ─── SnakeSession ─────────────────────────────────────────────────────────────
//
// Lógica pura del agente DQN para Snake: training loop, demo loop,
// replay buffer, persistencia de pesos y leaderboard.
// Sin dependencias de React ni de ningún framework UI.
//
// El adaptador React (useSnakeRL) crea los Refs e inyecta aquí.
//
// ─────────────────────────────────────────────────────────────────────────────

import { NetworkN, SGD, Momentum, Adam, relu, leakyRelu, sigmoid, tanh, linear, elu } from '@dniskav/neuron'
import { initSnake, stepSnake, getInputs, greedyAction, N_IN, N_OUT } from '../../cards/ArquitectoCard/SnakeEnv'
import type { SnakeState } from '../../cards/ArquitectoCard/SnakeEnv'
import { getLeaderboard, upsertLeaderboard } from '../../cards/ArquitectoCard/leaderboard'
import type { LeaderboardEntry } from '../../cards/ArquitectoCard/leaderboard'
import type { Ref } from '../shared/Ref'

export type { LeaderboardEntry }

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ActivationKey = 'relu' | 'leakyRelu' | 'sigmoid' | 'tanh' | 'linear' | 'elu'
export type OptimizerType = 'sgd' | 'momentum' | 'adam'

export interface LayerConfig {
  neurons:    number
  activation: ActivationKey
}

export interface SnakeSessionState {
  score:       number
  epsilon:     number
  episodes:    number
  steps:       number
  bestScore:   number
  demoScore:   number
  demoBest:    number
  running:     boolean
  demo:        boolean
  hasSave:     boolean
  drawVersion: number
  leaderboard: LeaderboardEntry[]
}

// ── Constantes ────────────────────────────────────────────────────────────────

const GAMMA       = 0.95
const BUFFER_SIZE = 2000
const BATCH_SIZE  = 32
const EPS_START   = 1.0
const EPS_END     = 0.05
const EPS_DECAY   = 0.0003

// ── Mapas ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACT_MAP: Record<string, any> = { relu, leakyRelu, sigmoid, tanh, linear, elu }

const OPT_MAP: Record<OptimizerType, () => unknown> = {
  sgd:      () => new SGD(),
  momentum: () => new Momentum(),
  adam:     () => new Adam(),
}

// ── Replay buffer ─────────────────────────────────────────────────────────────

interface Experience { s: number[]; a: number; r: number; sn: number[]; done: boolean }

class ReplayBuffer {
  private buf: Experience[] = []
  private idx = 0

  push(exp: Experience) {
    if (this.buf.length < BUFFER_SIZE) { this.buf.push(exp) }
    else { this.buf[this.idx % BUFFER_SIZE] = exp; this.idx++ }
  }

  sample(n: number): Experience[] {
    return Array.from({ length: n }, () => this.buf[Math.floor(Math.random() * this.buf.length)])
  }

  get size() { return this.buf.length }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNet(hidden: LayerConfig[], opt: OptimizerType): NetworkN {
  const sizes = [N_IN, ...hidden.map(l => l.neurons), N_OUT]
  const acts  = [...hidden.map(l => ACT_MAP[l.activation] ?? relu), linear]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts, optimizer: OPT_MAP[opt] as any })
}

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs]
  for (const layer of net.layers) acts.push(layer.predict(acts[acts.length - 1]))
  return acts
}

function storageKey(hidden: LayerConfig[]): string {
  return `snake-dqn-${hidden.map(l => `${l.neurons}${l.activation[0]}`).join('-')}`
}

type SavedState = {
  weights:   { weights: number[]; bias: number }[][]
  steps:     number
  epsilon:   number
  episodes:  number
  bestScore: number
}

function saveToStorage(net: NetworkN, hidden: LayerConfig[], steps: number, epsilon: number, episodes: number, bestScore: number) {
  try {
    const data: SavedState = {
      weights: net.layers.map(layer =>
        layer.neurons.map(n => ({ weights: [...n.weights], bias: n.bias }))
      ),
      steps, epsilon, episodes, bestScore,
    }
    localStorage.setItem(storageKey(hidden), JSON.stringify(data))
  } catch { /* cuota excedida */ }
}

function loadFromStorage(net: NetworkN, hidden: LayerConfig[]): Omit<SavedState, 'weights'> | null {
  try {
    const raw = localStorage.getItem(storageKey(hidden))
    if (!raw) return null
    const data: SavedState = JSON.parse(raw)
    if (data.weights.length !== net.layers.length) return null
    data.weights.forEach((layerW, li) => {
      layerW.forEach((nW, ni) => {
        net.layers[li].neurons[ni].weights = nW.weights
        net.layers[li].neurons[ni].bias    = nW.bias
      })
    })
    return { steps: data.steps, epsilon: data.epsilon, episodes: data.episodes, bestScore: data.bestScore }
  } catch { return null }
}

// ── Refs inyectados por el adaptador ──────────────────────────────────────────

interface SnakeRefs {
  state:       Ref<SnakeState>
  activations: Ref<number[][]>
  net:         Ref<NetworkN>
  lr:          Ref<number>
  demoSpeed:   Ref<number>
}

// ── SnakeSession ──────────────────────────────────────────────────────────────

export class SnakeSession {
  private net:       NetworkN
  private buf        = new ReplayBuffer()
  private steps      = 0
  private epsilon    = EPS_START
  private episodes   = 0
  private bestScore  = 0
  private demoBest   = 0
  private drawVersion = 0

  private running    = false
  private demo       = false
  private hasSave    = false

  private rafId:       number | null                      = null
  private demoTimerId: ReturnType<typeof setTimeout> | null = null

  private leaderboard: LeaderboardEntry[] = getLeaderboard()

  private readonly listeners = new Set<(state: SnakeSessionState) => void>()

  private hiddenLayers:  LayerConfig[]
  private optimizerType: OptimizerType
  private readonly refs: SnakeRefs

  constructor(hiddenLayers: LayerConfig[], optimizerType: OptimizerType, refs: SnakeRefs) {
    this.hiddenLayers  = hiddenLayers
    this.optimizerType = optimizerType
    this.refs          = refs
    this.net = buildNet(hiddenLayers, optimizerType)
    this.refs.net.current   = this.net
    this.refs.state.current = initSnake()
    this._tryLoadFromStorage()
  }

  // ── Suscripción ─────────────────────────────────────────────────────────────

  subscribe(fn: (state: SnakeSessionState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): SnakeSessionState {
    return {
      score:       this.refs.state.current.score,
      epsilon:     Math.round(this.epsilon * 100) / 100,
      episodes:    this.episodes,
      steps:       this.steps,
      bestScore:   this.bestScore,
      demoScore:   this.demo ? this.refs.state.current.score : 0,
      demoBest:    this.demoBest,
      running:     this.running,
      demo:        this.demo,
      hasSave:     this.hasSave,
      drawVersion: this.drawVersion,
      leaderboard: this.leaderboard,
    }
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(fn => fn(state))
  }

  // ── Controles ───────────────────────────────────────────────────────────────

  iniciar() {
    if (this.running) return
    this._stopDemo()
    this.running = true
    this.notify()
    this._loop()
  }

  pausar() {
    this.running = false
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null }
    this.notify()
  }

  resetear() {
    this._stopAll()
    localStorage.removeItem(storageKey(this.hiddenLayers))
    this.hasSave = false
    this._rebuild(this.hiddenLayers, this.optimizerType)
    this.notify()
  }

  probar() {
    this._stopAll()
    this.demo = true
    this.refs.state.current = initSnake()
    this.notify()
    this.demoTimerId = setTimeout(this._demoLoop, this.refs.demoSpeed.current)
  }

  detenerDemo() {
    this._stopDemo()
    this.notify()
  }

  setArchitecture(layers: LayerConfig[], opt: OptimizerType) {
    this._stopAll()
    this.hiddenLayers  = layers
    this.optimizerType = opt
    this._rebuild(layers, opt)
    this.notify()
  }

  loadEntry(entry: LeaderboardEntry) {
    this._stopAll()
    // lr y demoSpeed son manejados por el adaptador vía refs
    this.setArchitecture(entry.hidden, entry.optimizer)
  }

  destroy() {
    this._stopAll()
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private _rebuild(layers: LayerConfig[], opt: OptimizerType) {
    const net               = buildNet(layers, opt)
    this.net                = net
    this.refs.net.current   = net
    this.buf                = new ReplayBuffer()
    this.refs.state.current = initSnake()
    this.running            = false
    this.demo               = false
    this.drawVersion++

    const saved = loadFromStorage(net, layers)
    if (saved) {
      this.steps     = saved.steps
      this.epsilon   = saved.epsilon
      this.episodes  = saved.episodes
      this.bestScore = saved.bestScore
      this.hasSave   = true
    } else {
      this.steps     = 0
      this.epsilon   = EPS_START
      this.episodes  = 0
      this.bestScore = 0
      this.hasSave   = false
    }
    this.demoBest = 0
  }

  private _stopDemo() {
    this.demo = false
    if (this.demoTimerId !== null) { clearTimeout(this.demoTimerId); this.demoTimerId = null }
  }

  private _stopAll() {
    this.running = false
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null }
    this._stopDemo()
  }

  private _tryLoadFromStorage() {
    const saved = loadFromStorage(this.net, this.hiddenLayers)
    if (saved) {
      this.steps     = saved.steps
      this.epsilon   = saved.epsilon
      this.episodes  = saved.episodes
      this.bestScore = saved.bestScore
      this.hasSave   = true
    }
  }

  private readonly _loop = () => {
    if (!this.running) return

    const state = this.refs.state.current
    const s     = getInputs(state)
    const q     = this.net.predict(s)
    const a     = greedyAction(q, this.epsilon)
    const { next, reward, done } = stepSnake(state, a)
    const sn    = getInputs(next)

    this.buf.push({ s, a, r: reward, sn, done })
    this.refs.state.current = next
    this.steps++
    this.drawVersion++

    this.epsilon = Math.max(EPS_END, EPS_START - this.steps * EPS_DECAY)

    if (this.buf.size >= BATCH_SIZE) {
      for (const exp of this.buf.sample(BATCH_SIZE)) {
        const nextQ      = this.net.predict(exp.sn)
        const target     = [...this.net.predict(exp.s)]
        target[exp.a] = exp.done ? exp.r : exp.r + GAMMA * Math.max(...nextQ)
        this.net.train(exp.s, target, this.refs.lr.current)
      }
    }

    this.refs.activations.current = computeActs(this.net, s)

    if (done) {
      if (next.score > this.bestScore) this.bestScore = next.score
      this.episodes++
      this.refs.state.current = initSnake()

      if (this.episodes % 10 === 0) {
        saveToStorage(this.net, this.hiddenLayers, this.steps, this.epsilon, this.episodes, this.bestScore)
        this.hasSave = true
        this.leaderboard = upsertLeaderboard({
          hidden:    this.hiddenLayers,
          optimizer: this.optimizerType,
          lr:        this.refs.lr.current,
          bestScore: this.bestScore,
          episodes:  this.episodes,
          steps:     this.steps,
        })
      }
    }

    if (this.steps % 10 === 0) this.notify()

    this.rafId = requestAnimationFrame(this._loop)
  }

  private readonly _demoLoop = () => {
    if (!this.demo) return

    const state = this.refs.state.current
    const s     = getInputs(state)
    const q     = this.net.predict(s)
    const a     = greedyAction(q, 0)
    const { next, done } = stepSnake(state, a)

    this.refs.activations.current = computeActs(this.net, s)
    this.refs.state.current = next
    this.drawVersion++

    if (next.score > this.demoBest) this.demoBest = next.score
    this.notify()

    if (done) {
      if (this.demoBest > this.bestScore) {
        this.bestScore = this.demoBest
        this.leaderboard = upsertLeaderboard({
          hidden:    this.hiddenLayers,
          optimizer: this.optimizerType,
          lr:        this.refs.lr.current,
          bestScore: this.bestScore,
          episodes:  this.episodes,
          steps:     this.steps,
        })
      }
      this.demoTimerId = setTimeout(() => {
        if (!this.demo) return
        this.refs.state.current = initSnake()
        this.notify()
        this.demoTimerId = setTimeout(this._demoLoop, this.refs.demoSpeed.current)
      }, 600)
    } else {
      this.demoTimerId = setTimeout(this._demoLoop, this.refs.demoSpeed.current)
    }
  }
}
