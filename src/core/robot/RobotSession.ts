// ─── RobotSession ─────────────────────────────────────────────────────────────
//
// Lógica pura del agente RL: Q-learning, training loop, episodios.
// Sin dependencias de React ni de ningún framework UI.
//
// El adaptador React (useAgentRL) crea los Refs y los inyecta aquí.
// Para Vue/Angular basta con crear los refs equivalentes y usar la misma clase.
//
// Nota: agentWorld.ts también es puro TS y puede moverse a src/core/robot/
// en un refactor posterior.
//
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { NetworkN, Adam, relu, leakyRelu, tanh, sigmoid, linear, elu } from '@dniskav/neuron'
import {
  resetAgent, stepAgent, frontDist, leftDist, rightDist,
  AGENT_D, SENSOR_MAX, TURN_SPEED,
  type AgentState, type Obstacle,
} from '../../cards/RobotCard/agentWorld'
import type { Ref } from '../shared/Ref'

export type { Obstacle }

// ── Constantes ────────────────────────────────────────────────────────────────

const GAMMA           = 0.95
const LR              = 0.025
const STEPS_PER_FRAME = 10
const HISTORY_LEN     = 20
const FWD_WINDOW      = 200

export const GOAL_FWD          = 0.88
export const GOAL_SUCCESS_RATE = 0.80
export const GOAL_STEPS_L3     = 400
export const GOAL_STEPS_L4     = 600

const GOAL_MIN_STEPS  = 150
export const STOP_DIST = AGENT_D
const BRAKE_ZONE      = AGENT_D * 2
const TURN_ZONE       = AGENT_D * 8
const MAX_EP_STEPS_L1 = 300
const MAX_EP_STEPS_L2 = 400
const MAX_EP_STEPS_L3 = 1200
const MAX_EP_STEPS_L4 = 1500

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Level  = 1 | 2 | 3 | 4
export type ActKey = 'relu' | 'leakyRelu' | 'tanh' | 'sigmoid' | 'elu' | 'linear'

export interface HiddenLayer { neurons: number; activation: ActKey }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACT_MAP: Record<ActKey, any> = { relu, leakyRelu, tanh, sigmoid, elu, linear }

export const DEFAULT_HIDDEN: HiddenLayer[] = [{ neurons: 4, activation: 'relu' }]

export interface AgentStats {
  agent:        AgentState
  running:      boolean
  episodes:     number
  currentSteps: number
  avgSteps:     number
  bestSteps:    number
  epsilon:      number
  lastAction:   number
  fwdPct:       number
  successRate:  number
  totalSteps:   number
  solved:       boolean
}

// ── Refs inyectados por el adaptador ──────────────────────────────────────────

interface VisualRefs {
  agent:       Ref<AgentState>
  trail:       Ref<{ x: number; y: number }[]>
  activations: Ref<number[][]>
  speed:       Ref<number>
  trainSpeed:  Ref<number>
  obstacles:   Ref<Obstacle[]>
  testing:     Ref<boolean>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nActionsForLevel(lv: Level): number { return lv === 4 ? 3 : 2 }

function inputSizeForLevel(lv: Level): number {
  if (lv === 4) return 3
  if (lv === 3) return 2
  return 1
}

function getInput(lv: Level, s: AgentState, obstacles: Obstacle[] = []): number[] {
  if (lv === 4) return [frontDist(s, obstacles), leftDist(s, obstacles), rightDist(s, obstacles)]
  if (lv === 3) return [frontDist(s, obstacles), leftDist(s, obstacles)]
  if (lv === 2) return [frontDist(s, obstacles)]
  return [1.0]
}

function buildNet(hidden: HiddenLayer[], inputSize: number, nActions: number): NetworkN {
  const sizes = [inputSize, ...hidden.map(l => l.neurons), nActions]
  const acts  = [...hidden.map(l => ACT_MAP[l.activation]), linear]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts as any, optimizer: (() => new Adam()) as any })
}

function argmax(arr: number[]): number {
  return arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0)
}

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const layer of (net as any).layers) acts.push(layer.predict(acts[acts.length - 1]))
  return acts
}

// ── RobotSession ──────────────────────────────────────────────────────────────

export class RobotSession {
  private net:         NetworkN
  private running    = false
  private epsilon    = 1.0
  private steps      = 0
  private totalSteps = 0
  private episodes   = 0
  private history:     number[]  = []
  private successHist: boolean[] = []
  private fwdWindow:   number[]  = []
  private lastAction = 0
  private solved     = false
  private rafId:       number | null = null

  private readonly listeners = new Set<(state: AgentStats) => void>()

  private level:        Level
  private hiddenLayers: HiddenLayer[]
  private readonly refs: VisualRefs

  constructor(
    level:        Level,
    hiddenLayers: HiddenLayer[],
    refs: VisualRefs,
  ) {
    this.level        = level
    this.hiddenLayers = hiddenLayers
    this.refs         = refs
    this.net = buildNet(hiddenLayers, inputSizeForLevel(level), nActionsForLevel(level))
    this.refs.agent.current = resetAgent()
  }

  // ── Suscripción ─────────────────────────────────────────────────────────────

  subscribe(fn: (state: AgentStats) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): AgentStats {
    const hist        = this.history
    const avg         = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 0
    const best        = hist.length ? Math.max(...hist) : 0
    const fwd         = this.fwdWindow
    const fwdPct      = fwd.length ? fwd.filter(a => a === 0).length / fwd.length : 0
    const succHist    = this.successHist
    const successRate = succHist.length ? succHist.filter(Boolean).length / succHist.length : 0
    return {
      agent:        this.refs.agent.current,
      running:      this.running,
      episodes:     this.episodes,
      currentSteps: this.steps,
      avgSteps:     Math.round(avg),
      bestSteps:    best,
      epsilon:      this.epsilon,
      lastAction:   this.lastAction,
      fwdPct,
      successRate,
      totalSteps:   this.totalSteps,
      solved:       this.solved,
    }
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(fn => fn(state))
  }

  // ── Controles ───────────────────────────────────────────────────────────────

  start() {
    if (this.running) return
    this.refs.testing.current = false
    this.running = true
    this.notify()
    this._loop()
  }

  probar() {
    if (this.running) return
    this.refs.testing.current = true
    this.running = true
    this.refs.agent.current = resetAgent(this.refs.obstacles.current)
    this.refs.trail.current = []
    this.steps = 0
    this.notify()
    this._loop()
  }

  pause() {
    this.refs.testing.current = false
    this.running = false
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
    this.notify()
  }

  reset() {
    this.pause()
    this._rebuild()
    this._clearCounters()
    this.notify()
  }

  setArchitecture(layers: HiddenLayer[], level: Level) {
    const wasRunning = this.running
    this.pause()
    this.level = level
    this.hiddenLayers = layers
    this._rebuild()
    this._clearCounters()
    this.notify()
    if (wasRunning) setTimeout(() => this.start(), 50)
  }

  destroy() {
    this.running = false
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private _rebuild() {
    this.net = buildNet(this.hiddenLayers, inputSizeForLevel(this.level), nActionsForLevel(this.level))
    this.refs.agent.current       = resetAgent(this.refs.obstacles.current)
    this.refs.trail.current       = []
    this.refs.activations.current = []
  }

  private _clearCounters() {
    this.epsilon     = 1.0
    this.steps       = 0
    this.totalSteps  = 0
    this.episodes    = 0
    this.history     = []
    this.successHist = []
    this.fwdWindow   = []
    this.solved      = false
  }

  private readonly _loop = () => {
    if (!this.running) return

    const probing    = this.refs.testing.current
    const stepsCount = Math.max(1, Math.round(
      STEPS_PER_FRAME * (probing ? this.refs.speed.current : this.refs.trainSpeed.current)
    ))

    let probingDone = false

    for (let i = 0; i < stepsCount; i++) {
      const lv        = this.level
      const obstacles = this.refs.obstacles.current
      const input     = getInput(lv, this.refs.agent.current, obstacles)
      const q         = this.net.predict(input)

      const nActions = nActionsForLevel(lv)
      const eps      = probing ? 0 : this.epsilon
      const action   = Math.random() < eps
        ? Math.floor(Math.random() * nActions)
        : argmax(q)

      this.lastAction = action
      this.fwdWindow.push(action)
      if (this.fwdWindow.length > FWD_WINDOW) this.fwdWindow.shift()

      const curFrontPx = lv >= 2 ? frontDist(this.refs.agent.current, obstacles) * SENSOR_MAX : Infinity

      const { next, reward: rawReward, done: rawDone } = stepAgent(this.refs.agent.current, action, obstacles)

      if ((lv === 3 || lv === 4) && action === 1) {
        this.refs.agent.current = { ...this.refs.agent.current, heading: this.refs.agent.current.heading - TURN_SPEED }
      }
      if (lv === 4 && action === 2) {
        this.refs.agent.current = { ...this.refs.agent.current, heading: this.refs.agent.current.heading + TURN_SPEED }
      }

      // ── Condiciones de fin de episodio ──────────────────────────────────────
      const frontPxAfter = lv === 2 ? frontDist(next, obstacles) * SENSOR_MAX : Infinity
      const tooClose     = lv === 2 && action === 0 && frontPxAfter < STOP_DIST
      const successStop  = lv === 2 && action === 1 && curFrontPx >= STOP_DIST && curFrontPx <= BRAKE_ZONE
      const done         = rawDone || tooClose || successStop

      const epTimeout = !done && (
        (lv === 1 && this.steps >= MAX_EP_STEPS_L1) ||
        (lv === 2 && this.steps >= MAX_EP_STEPS_L2) ||
        (lv === 3 && this.steps >= MAX_EP_STEPS_L3) ||
        (lv === 4 && this.steps >= MAX_EP_STEPS_L4)
      )

      // ── Reward shaping ──────────────────────────────────────────────────────
      let reward = rawReward
      if (lv === 1) {
        if (action !== 0) reward = -1
      } else if (lv === 2) {
        if      (successStop)                              reward = +10
        else if (tooClose && !rawDone)                     reward = -20
        else if (action === 0 && curFrontPx > BRAKE_ZONE) reward = +0.5
        else if (action === 1 && curFrontPx > BRAKE_ZONE) reward = -3
      } else if (lv === 3 || lv === 4) {
        const frontClear = curFrontPx > TURN_ZONE
        if (action === 0 && frontClear) {
          reward = rawReward + 1
        } else if (action !== 0 && frontClear) {
          reward = -5
        } else if (action !== 0 && !frontClear) {
          if (lv === 4) {
            const ld = leftDist(this.refs.agent.current, obstacles) * SENSOR_MAX
            const rd = rightDist(this.refs.agent.current, obstacles) * SENSOR_MAX
            const towardOpen = (action === 1 && ld > rd) || (action === 2 && rd > ld)
            reward = towardOpen ? +4 : +1
          } else {
            reward = +2
          }
        }
      }

      // ── Q-learning update ───────────────────────────────────────────────────
      if (!probing) {
        const nextInput = getInput(lv, next, obstacles)
        const target    = [...q]
        if (done || epTimeout) {
          target[action] = done ? reward : 0
        } else {
          const qNext = this.net.predict(nextInput)
          target[action] = reward + GAMMA * Math.max(...qNext)
        }
        this.net.train(input, target, LR)
      }

      if (this.steps % 5 === 0) {
        this.refs.activations.current = computeActs(this.net, input)
      }

      this.steps++
      this.totalSteps++

      if (done || epTimeout) {
        if (probing) {
          if (done) { probingDone = true; break }
          this.refs.agent.current = resetAgent(this.refs.obstacles.current)
          this.refs.trail.current = []
          this.steps = 0
          continue
        }
        this.history.push(this.steps)
        if (this.history.length > HISTORY_LEN) this.history.shift()
        if (lv === 2) {
          this.successHist.push(successStop)
          if (this.successHist.length > HISTORY_LEN) this.successHist.shift()
        }
        this.episodes++
        this.steps   = 0
        this.epsilon = Math.max(0.05, this.epsilon * 0.988)
        this.refs.agent.current = resetAgent(this.refs.obstacles.current)
        this.refs.trail.current = []
      } else {
        this.refs.agent.current = { ...next, heading: this.refs.agent.current.heading }
        if (action === 0) {
          this.refs.trail.current.push({ x: next.x, y: next.y })
          if (this.refs.trail.current.length > 80) this.refs.trail.current.shift()
        }
      }
    }

    if (probingDone) {
      this.running = false
      this.refs.testing.current = false
      this.notify()
      return
    }

    // ── Verificar si está resuelto ───────────────────────────────────────────
    const lv          = this.level
    const fwdPct      = this.fwdWindow.length
      ? this.fwdWindow.filter(a => a === 0).length / this.fwdWindow.length : 0
    const successRate = this.successHist.length
      ? this.successHist.filter(Boolean).length / this.successHist.length : 0
    const avg         = this.history.length
      ? this.history.reduce((a, b) => a + b, 0) / this.history.length : 0
    const solvedNow   =
      lv === 1 ? (this.totalSteps >= GOAL_MIN_STEPS && fwdPct >= GOAL_FWD)
      : lv === 2 ? (this.successHist.length >= 10 && successRate >= GOAL_SUCCESS_RATE)
      : lv === 3 ? (this.history.length >= 10 && avg >= GOAL_STEPS_L3)
      :            (this.history.length >= 10 && avg >= GOAL_STEPS_L4)
    if (solvedNow) this.solved = true

    this.notify()
    this.rafId = requestAnimationFrame(this._loop)
  }
}
