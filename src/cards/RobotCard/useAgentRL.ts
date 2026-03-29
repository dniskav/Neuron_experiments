// ─── useAgentRL ───────────────────────────────────────────────────────────────
//
// Nivel 1 — 1 entrada constante,        2 acciones (adelante / frenar)
// Nivel 2 — 1 sensor frontal,           2 acciones (adelante / frenar)
// Nivel 3 — 2 sensores (front + izq),   2 acciones (adelante / girar izq)
// Nivel 4 — 3 sensores (front+izq+der), 3 acciones (adelante / gir izq / gir der)
// Q-learning online sin replay buffer.
//

import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkN, Adam, relu, leakyRelu, tanh, sigmoid, linear, elu } from "@dniskav/neuron";
import {
  resetAgent, stepAgent, frontDist, leftDist, rightDist,
  AGENT_D, SENSOR_MAX, TURN_SPEED,
  type AgentState, type Obstacle,
} from "./agentWorld";

export type { Obstacle };

// ── Constantes ─────────────────────────────────────────────────────────────────

const GAMMA            = 0.95;
const LR               = 0.025;
const STEPS_PER_FRAME  = 10;
const HISTORY_LEN      = 20;
const FWD_WINDOW       = 200;

export const GOAL_FWD          = 0.88;
export const GOAL_SUCCESS_RATE = 0.80;
export const GOAL_STEPS_L3     = 400;
export const GOAL_STEPS_L4     = 600;

const GOAL_MIN_STEPS  = 150;
export const STOP_DIST = AGENT_D;
const BRAKE_ZONE      = AGENT_D * 2;
const TURN_ZONE       = AGENT_D * 8;
const MAX_EP_STEPS_L1 = 300;
const MAX_EP_STEPS_L2 = 400;
const MAX_EP_STEPS_L3 = 1200;
const MAX_EP_STEPS_L4 = 1500;

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type Level  = 1 | 2 | 3 | 4;
export type ActKey = "relu" | "leakyRelu" | "tanh" | "sigmoid" | "elu" | "linear";

export interface HiddenLayer { neurons: number; activation: ActKey }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACT_MAP: Record<ActKey, any> = { relu, leakyRelu, tanh, sigmoid, elu, linear };

export const DEFAULT_HIDDEN: HiddenLayer[] = [{ neurons: 4, activation: "relu" }];

// ── Helpers ────────────────────────────────────────────────────────────────────

function nActionsForLevel(lv: Level): number { return lv === 4 ? 3 : 2; }
function inputSizeForLevel(lv: Level): number {
  if (lv === 4) return 3;
  if (lv === 3) return 2;
  return 1;
}

function getInput(lv: Level, s: AgentState, obstacles: Obstacle[] = []): number[] {
  if (lv === 4) return [frontDist(s, obstacles), leftDist(s, obstacles), rightDist(s, obstacles)];
  if (lv === 3) return [frontDist(s, obstacles), leftDist(s, obstacles)];
  if (lv === 2) return [frontDist(s, obstacles)];
  return [1.0];
}

function buildNet(hidden: HiddenLayer[], inputSize: number, nActions: number): NetworkN {
  const sizes = [inputSize, ...hidden.map(l => l.neurons), nActions];
  const acts  = [...hidden.map(l => ACT_MAP[l.activation]), linear];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts as any, optimizer: (() => new Adam()) as any });
}

function argmax(arr: number[]): number {
  return arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
}

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const layer of (net as any).layers) acts.push(layer.predict(acts[acts.length - 1]));
  return acts;
}

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface AgentStats {
  agent:        AgentState;
  running:      boolean;
  episodes:     number;
  currentSteps: number;
  avgSteps:     number;
  bestSteps:    number;
  epsilon:      number;
  lastAction:   number;
  fwdPct:       number;
  successRate:  number;
  totalSteps:   number;
  solved:       boolean;
}

const EMPTY_STATS: AgentStats = {
  agent: { x: 185, y: 185, heading: 0 },
  running: false, episodes: 0, currentSteps: 0,
  avgSteps: 0, bestSteps: 0, epsilon: 1.0,
  lastAction: 0, fwdPct: 0, successRate: 0, totalSteps: 0, solved: false,
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAgentRL(level: Level = 1, initialHiddenLayers: HiddenLayer[] = DEFAULT_HIDDEN) {
  const [hiddenLayers, setHiddenLayers] = useState<HiddenLayer[]>(initialHiddenLayers);
  const levelRef = useRef(level);
  useEffect(() => { levelRef.current = level; }, [level]);

  const netRef          = useRef(buildNet(initialHiddenLayers, inputSizeForLevel(level), nActionsForLevel(level)));
  const agentRef        = useRef<AgentState>(resetAgent());
  const trailRef        = useRef<{ x: number; y: number }[]>([]);
  const activationsRef  = useRef<number[][]>([]);
  const runningRef      = useRef(false);
  const testingRef      = useRef(false);
  const speedRef        = useRef(0.1);
  const trainSpeedRef   = useRef(1);
  const obstaclesRef    = useRef<Obstacle[]>([]);
  const rafRef          = useRef<number | null>(null);
  const epsilonRef      = useRef(1.0);
  const stepsRef        = useRef(0);
  const totalStepsRef   = useRef(0);
  const episodesRef     = useRef(0);
  const historyRef      = useRef<number[]>([]);
  const successHistRef  = useRef<boolean[]>([]);
  const fwdWindowRef    = useRef<number[]>([]);
  const lastActionRef   = useRef(0);
  const solvedRef       = useRef(false);

  const [stats, setStats] = useState<AgentStats>({ ...EMPTY_STATS, agent: agentRef.current });

  // ── Reconstruir red cuando cambia arquitectura O nivel ──────────────────────
  useEffect(() => {
    const wasRunning = runningRef.current;
    runningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    netRef.current         = buildNet(hiddenLayers, inputSizeForLevel(level), nActionsForLevel(level));
    agentRef.current       = resetAgent(obstaclesRef.current);
    trailRef.current       = [];
    activationsRef.current = [];
    epsilonRef.current     = 1.0;
    stepsRef.current       = 0;
    totalStepsRef.current  = 0;
    episodesRef.current    = 0;
    historyRef.current     = [];
    successHistRef.current = [];
    fwdWindowRef.current   = [];
    solvedRef.current      = false;
    setStats(s => ({ ...s, ...EMPTY_STATS, agent: agentRef.current }));
    if (wasRunning) {
      setTimeout(() => {
        runningRef.current = true;
        setStats(s => ({ ...s, running: true }));
        loopRef.current?.();
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenLayers, level]);

  const loopRef = useRef<(() => void) | null>(null);

  const addLayer    = useCallback(() => setHiddenLayers(p => [...p, { neurons: 8, activation: "relu" as ActKey }]), []);
  const removeLayer = useCallback((i: number) => setHiddenLayers(p => p.filter((_, idx) => idx !== i)), []);
  const updateLayer = useCallback((i: number, patch: Partial<HiddenLayer>) =>
    setHiddenLayers(p => p.map((l, idx) => idx === i ? { ...l, ...patch } : l)), []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const probing    = testingRef.current;
    const stepsCount = Math.max(1, Math.round(STEPS_PER_FRAME * (probing ? speedRef.current : trainSpeedRef.current)));

    let probingDone = false;

    for (let i = 0; i < stepsCount; i++) {
      const net   = netRef.current;
      const lv    = levelRef.current;
      const obstacles = obstaclesRef.current;
      const input = getInput(lv, agentRef.current, obstacles);
      const q     = net.predict(input);

      const nActions = nActionsForLevel(lv);
      const eps    = probing ? 0 : epsilonRef.current;
      const action = Math.random() < eps
        ? Math.floor(Math.random() * nActions)
        : argmax(q);

      lastActionRef.current = action;
      fwdWindowRef.current.push(action);
      if (fwdWindowRef.current.length > FWD_WINDOW) fwdWindowRef.current.shift();

      // Distancia frontal ANTES del paso (para reward shaping)
      const curFrontPx = lv >= 2 ? frontDist(agentRef.current, obstacles) * SENSOR_MAX : Infinity;

      const { next, reward: rawReward, done: rawDone } = stepAgent(agentRef.current, action, obstacles);

      // Nivel 3/4: giros
      if ((lv === 3 || lv === 4) && action === 1) {
        agentRef.current = { ...agentRef.current, heading: agentRef.current.heading - TURN_SPEED };
      }
      if (lv === 4 && action === 2) {
        agentRef.current = { ...agentRef.current, heading: agentRef.current.heading + TURN_SPEED };
      }

      // ── Condiciones de fin de episodio ──────────────────────────────────────
      const frontPxAfter = lv === 2 ? frontDist(next, obstacles) * SENSOR_MAX : Infinity;
      const tooClose    = lv === 2 && action === 0 && frontPxAfter < STOP_DIST;
      const successStop = lv === 2 && action === 1 && curFrontPx >= STOP_DIST && curFrontPx <= BRAKE_ZONE;
      const done        = rawDone || tooClose || successStop;

      const epTimeout = !done && (
        (lv === 1 && stepsRef.current >= MAX_EP_STEPS_L1) ||
        (lv === 2 && stepsRef.current >= MAX_EP_STEPS_L2) ||
        (lv === 3 && stepsRef.current >= MAX_EP_STEPS_L3) ||
        (lv === 4 && stepsRef.current >= MAX_EP_STEPS_L4)
      );

      // ── Reward shaping ──────────────────────────────────────────────────────
      let reward = rawReward;
      if (lv === 1) {
        if (action !== 0) reward = -1; // penalizar frenar: ir adelante siempre es mejor
      } else if (lv === 2) {
        if      (successStop)                               reward = +10;
        else if (tooClose && !rawDone)                      reward = -20;
        else if (action === 0 && curFrontPx > BRAKE_ZONE)  reward = +0.5;
        else if (action === 1 && curFrontPx > BRAKE_ZONE)  reward = -3;
      } else if (lv === 3 || lv === 4) {
        const frontClear = curFrontPx > TURN_ZONE;
        if (action === 0 && frontClear) {
          reward = rawReward + 1;
        } else if (action !== 0 && frontClear) {
          reward = -5;
        } else if (action !== 0 && !frontClear) {
          if (lv === 4) {
            const ld = leftDist(agentRef.current, obstacles) * SENSOR_MAX;
            const rd = rightDist(agentRef.current, obstacles) * SENSOR_MAX;
            const towardOpen = (action === 1 && ld > rd) || (action === 2 && rd > ld);
            reward = towardOpen ? +4 : +1;
          } else {
            reward = +2;
          }
        }
      }

      // ── Q-learning update ───────────────────────────────────────────────────
      if (!probing) {
        const nextInput = getInput(lv, next, obstacles);
        const target    = [...q];
        if (done || epTimeout) {
          target[action] = done ? reward : 0;
        } else {
          const qNext = net.predict(nextInput);
          target[action] = reward + GAMMA * Math.max(...qNext);
        }
        net.train(input, target, LR);
      }

      if (stepsRef.current % 5 === 0) {
        activationsRef.current = computeActs(net, input);
      }

      stepsRef.current++;
      totalStepsRef.current++;

      if (done || epTimeout) {
        if (probing) {
          if (done) {
            // Chocó: pausar y dejar el estado final visible
            probingDone = true;
            break;
          }
          // Timeout en nivel 3: reiniciar agente y seguir corriendo (sin límite de tiempo)
          agentRef.current = resetAgent(obstaclesRef.current);
          trailRef.current = [];
          stepsRef.current = 0;
          continue;
        }
        historyRef.current.push(stepsRef.current);
        if (historyRef.current.length > HISTORY_LEN) historyRef.current.shift();
        if (lv === 2) {
          successHistRef.current.push(successStop);
          if (successHistRef.current.length > HISTORY_LEN) successHistRef.current.shift();
        }
        episodesRef.current++;
        stepsRef.current   = 0;
        epsilonRef.current = Math.max(0.05, epsilonRef.current * 0.988);
        agentRef.current   = resetAgent(obstaclesRef.current);
        trailRef.current   = [];
      } else {
        agentRef.current = { ...next, heading: agentRef.current.heading };
        if (action === 0) {
          trailRef.current.push({ x: next.x, y: next.y });
          if (trailRef.current.length > 80) trailRef.current.shift();
        }
      }
    }

    if (probingDone) {
      runningRef.current  = false;
      testingRef.current  = false;
      setStats(s => ({ ...s, running: false }));
      return;
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    const lv          = levelRef.current;
    const hist        = historyRef.current;
    const avg         = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 0;
    const best        = hist.length ? Math.max(...hist) : 0;
    const fwd         = fwdWindowRef.current;
    const fwdPct      = fwd.length ? fwd.filter(a => a === 0).length / fwd.length : 0;
    const succHist    = successHistRef.current;
    const successRate = succHist.length ? succHist.filter(Boolean).length / succHist.length : 0;
    const solvedNow   = lv === 1 ? (totalStepsRef.current >= GOAL_MIN_STEPS && fwdPct >= GOAL_FWD)
                      : lv === 2 ? (succHist.length >= 10 && successRate >= GOAL_SUCCESS_RATE)
                      : lv === 3 ? (hist.length >= 10 && avg >= GOAL_STEPS_L3)
                      :            (hist.length >= 10 && avg >= GOAL_STEPS_L4);
    if (solvedNow) solvedRef.current = true;
    const solved = solvedRef.current;

    setStats({
      agent:        agentRef.current,
      running:      true,
      episodes:     episodesRef.current,
      currentSteps: stepsRef.current,
      avgSteps:     Math.round(avg),
      bestSteps:    best,
      epsilon:      epsilonRef.current,
      lastAction:   lastActionRef.current,
      fwdPct,
      successRate,
      totalSteps:   totalStepsRef.current,
      solved,
    });

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => { loopRef.current = loop; }, [loop]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    testingRef.current = false;
    runningRef.current = true;
    setStats(s => ({ ...s, running: true }));
    loop();
  }, [loop]);

  const probar = useCallback(() => {
    if (runningRef.current) return;
    testingRef.current = true;
    runningRef.current = true;
    agentRef.current   = resetAgent(obstaclesRef.current);
    trailRef.current   = [];
    stepsRef.current   = 0;
    setStats(s => ({ ...s, running: true }));
    loop();
  }, [loop]);

  const pause = useCallback(() => {
    testingRef.current = false;
    runningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStats(s => ({ ...s, running: false }));
  }, []);

  const reset = useCallback(() => {
    pause();
    netRef.current         = buildNet(hiddenLayers, inputSizeForLevel(levelRef.current), nActionsForLevel(levelRef.current));
    agentRef.current       = resetAgent(obstaclesRef.current);
    trailRef.current       = [];
    activationsRef.current = [];
    epsilonRef.current     = 1.0;
    stepsRef.current       = 0;
    totalStepsRef.current  = 0;
    episodesRef.current    = 0;
    historyRef.current     = [];
    successHistRef.current = [];
    fwdWindowRef.current   = [];
    solvedRef.current      = false;
    setStats({ ...EMPTY_STATS, agent: agentRef.current });
  }, [pause, hiddenLayers]);

  useEffect(() => () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    stats, trailRef, agentRef, activationsRef, netRef,
    start, probar, pause, reset,
    hiddenLayers, addLayer, removeLayer, updateLayer,
    testingRef, speedRef, trainSpeedRef, obstaclesRef,
  };
}
