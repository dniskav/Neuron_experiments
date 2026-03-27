// ─── useSnakeRL ───────────────────────────────────────────────────────────────
//
// DQN ligero para Snake con replay buffer.
//
// · La red se reconstruye cuando cambia hiddenLayers u optimizerType.
// · Cada frame (rAF):
//     – getInputs()   → forward pass → greedyAction(epsilon)
//     – stepSnake()   → almacena (s, a, r, s', done) en el buffer
//     – sample 32 exp → backward pass con target Q = r + γ·max Q(s')
//     – si done         → reiniciar episodio
// · Expone: stateRef, redrawVersion, stats (score, epsilon, episodes, steps)
//   y los mismos controles de arquitectura que useArquitectoTraining.
//

import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkN, SGD, Momentum, Adam, relu, leakyRelu, sigmoid, tanh, linear, elu } from "@dniskav/neuron";
import type { ActivationType } from "../../components/lib";
import type { SnakeState } from "./SnakeEnv";
import { initSnake, stepSnake, getInputs, greedyAction, N_IN, N_OUT } from "./SnakeEnv";
import { getLeaderboard, upsertLeaderboard, type LeaderboardEntry } from "./leaderboard";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface LayerConfig {
  neurons:    number;
  activation: ActivationType;
}

export type OptimizerType = "sgd" | "momentum" | "adam";

export interface SnakeStats {
  score:     number;
  epsilon:   number;
  episodes:  number;
  steps:     number;
  bestScore: number;
  demoScore: number;   // puntuación de la sesión demo actual
  demoBest:  number;   // mejor puntuación vista en modo demo
}

// ── Constantes ────────────────────────────────────────────────────────────────

const GAMMA        = 0.95;
const BUFFER_SIZE  = 2000;
const BATCH_SIZE   = 32;
const EPS_START    = 1.0;
const EPS_END      = 0.05;
const EPS_DECAY    = 0.0003;  // por paso

// ── Mapas ────────────────────────────────────────────────────────────────────

const ACT_MAP: Record<string, { fn: (x: number) => number; dfn: (o: number) => number }> = {
  relu, leakyRelu, sigmoid, tanh, linear, elu,
};

const OPT_MAP: Record<OptimizerType, () => unknown> = {
  sgd:      () => new SGD(),
  momentum: () => new Momentum(),
  adam:     () => new Adam(),
};

// ── Replay buffer ─────────────────────────────────────────────────────────────

interface Experience {
  s:    number[];
  a:    number;
  r:    number;
  sn:   number[];
  done: boolean;
}

class ReplayBuffer {
  private buf: Experience[] = [];
  private idx = 0;

  push(exp: Experience) {
    if (this.buf.length < BUFFER_SIZE) {
      this.buf.push(exp);
    } else {
      this.buf[this.idx % BUFFER_SIZE] = exp;
      this.idx++;
    }
  }

  sample(n: number): Experience[] {
    const out: Experience[] = [];
    for (let i = 0; i < n; i++)
      out.push(this.buf[Math.floor(Math.random() * this.buf.length)]);
    return out;
  }

  get size() { return this.buf.length; }
}

// ── Builder de red ────────────────────────────────────────────────────────────

function buildNet(hidden: LayerConfig[], opt: OptimizerType): NetworkN {
  const sizes = [N_IN, ...hidden.map(l => l.neurons), N_OUT];
  const acts  = [...hidden.map(l => ACT_MAP[l.activation] ?? relu), linear]; // salida lineal (Q-values)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts, optimizer: OPT_MAP[opt] as any });
}

// ── Persistencia en localStorage ──────────────────────────────────────────────

type SavedState = {
  weights: { weights: number[]; bias: number }[][];
  steps:   number;
  epsilon: number;
  episodes: number;
  bestScore: number;
};

function storageKey(hidden: LayerConfig[]): string {
  return `snake-dqn-${hidden.map(l => `${l.neurons}${l.activation[0]}`).join("-")}`;
}

function saveToStorage(net: NetworkN, hidden: LayerConfig[], steps: number, epsilon: number, episodes: number, bestScore: number) {
  try {
    const data: SavedState = {
      weights: net.layers.map(layer =>
        layer.neurons.map(n => ({ weights: [...n.weights], bias: n.bias }))
      ),
      steps, epsilon, episodes, bestScore,
    };
    localStorage.setItem(storageKey(hidden), JSON.stringify(data));
  } catch { /* cuota excedida, ignorar */ }
}

function loadFromStorage(net: NetworkN, hidden: LayerConfig[]): Omit<SavedState, "weights"> | null {
  try {
    const raw = localStorage.getItem(storageKey(hidden));
    if (!raw) return null;
    const data: SavedState = JSON.parse(raw);
    // Verificar que la estructura coincide
    if (data.weights.length !== net.layers.length) return null;
    data.weights.forEach((layerW, li) => {
      layerW.forEach((nW, ni) => {
        net.layers[li].neurons[ni].weights = nW.weights;
        net.layers[li].neurons[ni].bias    = nW.bias;
      });
    });
    return { steps: data.steps, epsilon: data.epsilon, episodes: data.episodes, bestScore: data.bestScore };
  } catch { return null; }
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useSnakeRL() {
  // Arquitectura
  const [hiddenLayers,  setHiddenLayers]  = useState<LayerConfig[]>([
    { neurons: 16, activation: "relu" },
    { neurons: 8,  activation: "relu" },
  ]);
  const [optimizerType, setOptimizerType] = useState<OptimizerType>("adam");
  const lrRef             = useRef(0.001);
  const [lr, setLrState]  = useState(0.001);

  // Refs para que loop/demoLoop siempre lean la arquitectura actual
  const hiddenLayersRef   = useRef(hiddenLayers);
  const optimizerTypeRef  = useRef(optimizerType);
  useEffect(() => { hiddenLayersRef.current  = hiddenLayers;   }, [hiddenLayers]);
  useEffect(() => { optimizerTypeRef.current = optimizerType;  }, [optimizerType]);

  // Red y buffer
  const netRef    = useRef<NetworkN>(buildNet(hiddenLayers, "adam"));
  const bufRef    = useRef(new ReplayBuffer());
  const stepsRef  = useRef(0);
  const epsRef    = useRef(EPS_START);

  // Estado del juego
  const snakeRef      = useRef<SnakeState>(initSnake());
  const episodesRef   = useRef(0);
  const bestScoreRef  = useRef(0);

  const demoBestRef  = useRef(0);

  // UI state
  const [running,      setRunning]      = useState(false);
  const [redrawVersion, setRedrawVersion] = useState(0);
  const [stats,        setStats]        = useState<SnakeStats>({
    score: 0, epsilon: EPS_START, episodes: 0, steps: 0, bestScore: 0, demoScore: 0, demoBest: 0,
  });
  const [leaderboard, setLeaderboard]   = useState<LeaderboardEntry[]>(getLeaderboard);

  const runningRef = useRef(false);
  const animRef    = useRef<number | null>(null);

  // Activaciones para NetworkDiagram
  const activationsRef = useRef<number[][]>([]);

  function computeActs(net: NetworkN, inputs: number[]): number[][] {
    const acts: number[][] = [inputs];
    for (const layer of net.layers) acts.push(layer.predict(acts[acts.length - 1]));
    return acts;
  }

  // Si hay pesos guardados en localStorage
  const [hasSave, setHasSave] = useState(false);

  // ── Rebuild en cambio de arquitectura ────────────────────────────────────

  useEffect(() => {
    runningRef.current = false;
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    const net = buildNet(hiddenLayers, optimizerType);
    netRef.current   = net;
    bufRef.current   = new ReplayBuffer();
    snakeRef.current = initSnake();

    // Intentar cargar pesos guardados para esta arquitectura
    const saved = loadFromStorage(net, hiddenLayers);
    if (saved) {
      stepsRef.current     = saved.steps;
      epsRef.current       = saved.epsilon;
      episodesRef.current  = saved.episodes;
      bestScoreRef.current = saved.bestScore;
      setHasSave(true);
      setStats({ score: 0, epsilon: saved.epsilon, episodes: saved.episodes, steps: saved.steps, bestScore: saved.bestScore, demoScore: 0, demoBest: 0 });
    } else {
      stepsRef.current = 0;
      epsRef.current   = EPS_START;
      episodesRef.current  = 0;
      bestScoreRef.current = 0;
      setHasSave(false);
      setStats({ score: 0, epsilon: EPS_START, episodes: 0, steps: 0, bestScore: 0, demoScore: 0, demoBest: 0 });
    }
    demoBestRef.current = 0;
    setRunning(false);
    setRedrawVersion(v => v + 1);
  }, [hiddenLayers, optimizerType]);

  // ── Loop de entrenamiento ─────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const net   = netRef.current;
    const buf   = bufRef.current;
    const state = snakeRef.current;

    const s  = getInputs(state);
    const q  = net.predict(s);
    const a  = greedyAction(q, epsRef.current);
    const { next, reward, done } = stepSnake(state, a);
    const sn = getInputs(next);

    buf.push({ s, a, r: reward, sn, done });

    snakeRef.current  = next;
    stepsRef.current += 1;

    // Decaer epsilon
    epsRef.current = Math.max(EPS_END, EPS_START - stepsRef.current * EPS_DECAY);

    // Entrenamiento por lotes
    if (buf.size >= BATCH_SIZE) {
      const batch = buf.sample(BATCH_SIZE);
      for (const exp of batch) {
        const nextQ  = net.predict(exp.sn);
        const maxNQ  = Math.max(...nextQ);
        const target = [...net.predict(exp.s)];
        target[exp.a] = exp.done ? exp.r : exp.r + GAMMA * maxNQ;
        net.train(exp.s, target, lrRef.current);
      }
    }

    // Actualizar activaciones para diagrama
    activationsRef.current = computeActs(net, s);

    if (done) {
      if (next.score > bestScoreRef.current) bestScoreRef.current = next.score;
      episodesRef.current++;
      snakeRef.current = initSnake();

      // Guardar cada 10 episodios + actualizar leaderboard
      if (episodesRef.current % 10 === 0) {
        const hl  = hiddenLayersRef.current;
        const opt = optimizerTypeRef.current;
        saveToStorage(net, hl, stepsRef.current, epsRef.current, episodesRef.current, bestScoreRef.current);
        setHasSave(true);
        const board = upsertLeaderboard({
          hidden:    hl,
          optimizer: opt,
          lr:        lrRef.current,
          bestScore: bestScoreRef.current,
          episodes:  episodesRef.current,
          steps:     stepsRef.current,
        });
        setLeaderboard(board);
      }
    }

    setRedrawVersion(v => v + 1);

    // Actualizar stats cada 10 pasos para no saturar React
    if (stepsRef.current % 10 === 0) {
      setStats(prev => ({
        ...prev,
        score:     snakeRef.current.score,
        epsilon:   Math.round(epsRef.current * 100) / 100,
        episodes:  episodesRef.current,
        steps:     stepsRef.current,
        bestScore: bestScoreRef.current,
      }));
    }

    animRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Loop de demo (greedy, sin entrenamiento, velocidad realista) ─────────

  const demoRef      = useRef(false);
  const [demo, setDemo]         = useState(false);
  const demoSpeedRef            = useRef(120); // ms por paso
  const [demoSpeed, setDemoSpeedState] = useState(120);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demoLoop = useCallback(() => {
    if (!demoRef.current) return;

    const net   = netRef.current;
    const state = snakeRef.current;

    const s = getInputs(state);
    const q = net.predict(s);
    const a = greedyAction(q, 0); // epsilon=0: totalmente greedy
    const { next, done } = stepSnake(state, a);

    activationsRef.current = computeActs(net, s);
    snakeRef.current = next;
    setRedrawVersion(v => v + 1);

    // Actualizar stats de demo en tiempo real
    const demoScore = next.score;
    if (demoScore > demoBestRef.current) demoBestRef.current = demoScore;
    setStats(prev => ({
      ...prev,
      demoScore,
      demoBest: demoBestRef.current,
    }));

    if (done) {
      // Actualizar leaderboard si el demo superó el mejor entrenamiento
      if (demoBestRef.current > bestScoreRef.current) {
        bestScoreRef.current = demoBestRef.current;
        const board = upsertLeaderboard({
          hidden:    hiddenLayersRef.current,
          optimizer: optimizerTypeRef.current,
          lr:        lrRef.current,
          bestScore: bestScoreRef.current,
          episodes:  episodesRef.current,
          steps:     stepsRef.current,
        });
        setLeaderboard(board);
        setStats(prev => ({ ...prev, bestScore: bestScoreRef.current }));
      }
      // Pausa breve al morir antes de reiniciar
      demoTimerRef.current = setTimeout(() => {
        if (!demoRef.current) return;
        snakeRef.current = initSnake();
        setStats(prev => ({ ...prev, demoScore: 0 }));
        demoTimerRef.current = setTimeout(demoLoop, demoSpeedRef.current);
      }, 600);
    } else {
      demoTimerRef.current = setTimeout(demoLoop, demoSpeedRef.current);
    }
  }, [hiddenLayers, optimizerType]);

  const setDemoSpeed = useCallback((ms: number) => {
    demoSpeedRef.current = ms;
    setDemoSpeedState(ms);
  }, []);

  const probar = useCallback(() => {
    runningRef.current = false;
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (demoTimerRef.current !== null) { clearTimeout(demoTimerRef.current); demoTimerRef.current = null; }
    setRunning(false);
    demoRef.current = true;
    snakeRef.current = initSnake();
    setDemo(true);
    demoTimerRef.current = setTimeout(demoLoop, demoSpeedRef.current);
  }, [demoLoop]);

  const detenerDemo = useCallback(() => {
    demoRef.current = false;
    if (demoTimerRef.current !== null) { clearTimeout(demoTimerRef.current); demoTimerRef.current = null; }
    setDemo(false);
  }, []);

  // ── Controles ─────────────────────────────────────────────────────────────

  const iniciar = useCallback(() => {
    if (runningRef.current) return;
    // Detener demo si está activa
    demoRef.current = false;
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    setDemo(false);
    runningRef.current = true;
    setRunning(true);
    loop();
  }, [loop]);

  const pausar = useCallback(() => {
    runningRef.current = false;
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    setRunning(false);
  }, []);

  const resetear = useCallback(() => {
    demoRef.current = false;
    if (demoTimerRef.current !== null) { clearTimeout(demoTimerRef.current); demoTimerRef.current = null; }
    setDemo(false);
    pausar();
    localStorage.removeItem(storageKey(hiddenLayers));
    setHasSave(false);
    netRef.current       = buildNet(hiddenLayers, optimizerType);
    bufRef.current       = new ReplayBuffer();
    snakeRef.current     = initSnake();
    stepsRef.current     = 0;
    epsRef.current       = EPS_START;
    episodesRef.current  = 0;
    bestScoreRef.current = 0;
    setStats({ score: 0, epsilon: EPS_START, episodes: 0, steps: 0, bestScore: 0, demoScore: 0, demoBest: 0 });
    setRedrawVersion(v => v + 1);
  }, [pausar, hiddenLayers, optimizerType]);

  const setLr  = useCallback((v: number) => { lrRef.current = v; setLrState(v); }, []);

  // ── Cargar desde leaderboard ──────────────────────────────────────────────

  const loadEntry = useCallback((entry: LeaderboardEntry) => {
    // Detener todo antes de cambiar arquitectura
    runningRef.current = false;
    demoRef.current    = false;
    if (animRef.current     !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (demoTimerRef.current !== null) { clearTimeout(demoTimerRef.current);   demoTimerRef.current = null; }
    setDemo(false);
    // Aplicar configuración — el useEffect de hiddenLayers cargará los pesos
    lrRef.current = entry.lr;
    setLrState(entry.lr);
    setOptimizerType(entry.optimizer);
    setHiddenLayers(entry.hidden);   // dispara el useEffect de rebuild+load
  }, []);

  // ── Arquitectura ──────────────────────────────────────────────────────────

  const addLayer = useCallback(() => {
    setHiddenLayers(prev => [...prev, { neurons: 8, activation: "relu" }]);
  }, []);

  const removeLayer = useCallback((i: number) => {
    setHiddenLayers(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const updateLayer = useCallback((i: number, patch: Partial<LayerConfig>) => {
    setHiddenLayers(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }, []);

  useEffect(() => () => {
    runningRef.current = false;
    demoRef.current    = false;
    if (animRef.current    !== null) cancelAnimationFrame(animRef.current);
    if (demoTimerRef.current !== null) clearTimeout(demoTimerRef.current);
  }, []);

  return {
    // Estado juego
    stateRef: snakeRef,
    redrawVersion,
    stats,
    // Red
    netRef,
    activationsRef,
    // Arquitectura
    hiddenLayers, optimizerType, lr,
    // Controles
    running, iniciar, pausar, resetear,
    demo, probar, detenerDemo, demoSpeed, setDemoSpeed, hasSave,
    leaderboard, loadEntry,
    setLr, setOptimizerType,
    addLayer, removeLayer, updateLayer,
  };
}
