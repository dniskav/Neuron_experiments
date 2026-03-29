// ─── useMazeRL ────────────────────────────────────────────────────────────────
//
// DQN + LSTM para el laberinto con arquitectura configurable.
// Adaptado de useLaberintoRL con capas configurables y persistencia por arquitectura.
//

import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkLSTM, Adam, relu, leakyRelu, tanh, sigmoid, linear } from "@dniskav/neuron";
import type { Activation } from "@dniskav/neuron";
import {
  START, GOAL_R, WAYPOINTS, WAYPOINT_R, PROX_UMBRAL,
  moverAgente, distObjetivo, entradas,
  type Agente,
} from "../../../../data/laberinto";
import { accionGreedy, accionReflejoChoque, actualizarLambda, computeLSTMActs } from "../../../LaberintoCard/rl";
import type { StepBuf } from "../../../LaberintoCard/types";

// ── Constantes ────────────────────────────────────────────────────────────────

export const N_IN         = 12;
export const N_OUT        = 3;

const MAX_PASOS           = 600;
const PASOS_FRAME_TRAIN   = 3;
const MAX_TRAIL           = 150;
const EPS_INICIO          = 0.92;
const EPS_FIN             = 0.06;
const EPS_DECAY           = 0.986;
const SAVE_EVERY          = 10;
const LR_DEFAULT          = 0.02;

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DenseConfig { neurons: number; }

export interface MazeStats {
  episodios:   number;
  pasos:       number;
  epsilon:     number;
  tasa:        number;   // % episodios exitosos
  exito:       boolean;  // último episodio
  waypoints:   number;   // WPs del episodio actual
  demoExitos:  number;
  demoTotal:   number;
}

// ── Persistencia ──────────────────────────────────────────────────────────────

function archKey(lstmSize: number, dense: DenseConfig[], actKey: DenseActKey): string {
  return `maze-lstm${lstmSize}-${dense.map(l => l.neurons).join("-") || "nodense"}-${actKey}`;
}

type SavedMaze = {
  weights:   ReturnType<NetworkLSTM["getWeights"]>;
  episodios: number;
  epsilon:   number;
  exitos:    number;
};

function saveToStorage(net: NetworkLSTM, lstmSize: number, dense: DenseConfig[], actKey: DenseActKey, episodios: number, epsilon: number, exitos: number) {
  try {
    const data: SavedMaze = { weights: net.getWeights(), episodios, epsilon, exitos };
    localStorage.setItem(archKey(lstmSize, dense, actKey), JSON.stringify(data));
  } catch { /* quota */ }
}

function loadFromStorage(net: NetworkLSTM, lstmSize: number, dense: DenseConfig[], actKey: DenseActKey): { episodios: number; epsilon: number; exitos: number } | null {
  try {
    const raw = localStorage.getItem(archKey(lstmSize, dense, actKey));
    if (!raw) return null;
    const data: SavedMaze = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    net.setWeights(data.weights as any);
    return { episodios: data.episodios, epsilon: data.epsilon, exitos: data.exitos };
  } catch { return null; }
}

// ── Activaciones disponibles ──────────────────────────────────────────────────

export const DENSE_ACT_OPTIONS = ["relu", "leakyRelu", "tanh", "sigmoid", "linear"] as const;
export type DenseActKey = typeof DENSE_ACT_OPTIONS[number];

const ACT_MAP: Record<DenseActKey, Activation> = { relu, leakyRelu, tanh, sigmoid, linear };

// ── Builder de red ────────────────────────────────────────────────────────────

function buildNet(lstmSize: number, dense: DenseConfig[], actKey: DenseActKey): NetworkLSTM {
  const sizes = [...dense.map(l => l.neurons), N_OUT];
  return new NetworkLSTM(N_IN, lstmSize, sizes, {
    optimizer:       () => new Adam(),
    denseActivation: ACT_MAP[actKey],
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMazeRL() {
  // Arquitectura configurable
  const [lstmSize,    setLstmSize]    = useState(16);
  const [denseLayers, setDenseLayers] = useState<DenseConfig[]>([{ neurons: 16 }]);
  const [denseActKey, setDenseActKey] = useState<DenseActKey>("relu");
  const [lr,          setLrState]     = useState(LR_DEFAULT);
  const lrRef = useRef(LR_DEFAULT);

  // Refs para que los loops lean siempre la arquitectura actual
  const lstmSizeRef    = useRef(lstmSize);
  const denseLayersRef = useRef(denseLayers);
  const denseActKeyRef = useRef(denseActKey);
  useEffect(() => { lstmSizeRef.current    = lstmSize;    }, [lstmSize]);
  useEffect(() => { denseLayersRef.current = denseLayers; }, [denseLayers]);
  useEffect(() => { denseActKeyRef.current = denseActKey; }, [denseActKey]);

  // Red
  const netRef = useRef<NetworkLSTM>(buildNet(lstmSize, denseLayers, denseActKey));

  // Estado del agente
  const agenteRef = useRef<Agente>({ ...START });
  const trailRef  = useRef<Array<{ x: number; y: number }>>([]);
  const wpRef     = useRef<Set<number>>(new Set());
  const visitedRef = useRef<Set<string>>(new Set());
  const episodeBufRef = useRef<StepBuf[]>([]);

  // Contadores
  const epsilonRef  = useRef(EPS_INICIO);
  const episodiosRef = useRef(0);
  const exitosRef   = useRef(0);
  const stepRef     = useRef(0);
  const chocoRef    = useRef(false);

  // Demo
  const demoExitosRef = useRef(0);
  const demoTotalRef  = useRef(0);
  const bestWeightsRef = useRef<ReturnType<NetworkLSTM["getWeights"]> | null>(null);
  const bestDemoRateRef = useRef(-1);

  // Control
  const runningRef = useRef(false);
  const demoRef    = useRef(false);
  const rafRef     = useRef(0);

  // UI
  const activationsRef  = useRef<number[][]>([]);
  const [running,        setRunning]       = useState(false);
  const [demo,           setDemo]          = useState(false);
  const [hasSave,        setHasSave]       = useState(false);
  const [redrawVersion,  setRedrawVersion] = useState(0);
  const [showSensors,    setShowSensors]   = useState(true);
  const [stats, setStats] = useState<MazeStats>({
    episodios: 0, pasos: 0, epsilon: EPS_INICIO,
    tasa: 0, exito: false, waypoints: 0, demoExitos: 0, demoTotal: 0,
  });

  // ── Reset episodio ─────────────────────────────────────────────────────────

  const resetEpisodio = useCallback(() => {
    agenteRef.current    = { ...START };
    trailRef.current     = [];
    wpRef.current        = new Set();
    visitedRef.current   = new Set();
    episodeBufRef.current = [];
    stepRef.current      = 0;
    chocoRef.current     = false;
    netRef.current.resetState();
  }, []);

  // ── Rebuild en cambio de arquitectura ─────────────────────────────────────

  const loopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const wasTraining = runningRef.current && !demoRef.current;

    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setDemo(false);
    demoRef.current = false;

    const net = buildNet(lstmSize, denseLayers, denseActKey);
    netRef.current = net;

    const saved = loadFromStorage(net, lstmSize, denseLayers, denseActKey);
    if (saved) {
      epsilonRef.current   = saved.epsilon;
      episodiosRef.current = saved.episodios;
      exitosRef.current    = saved.exitos;
      setHasSave(true);
      setStats(prev => ({
        ...prev,
        episodios: saved.episodios,
        epsilon:   saved.epsilon,
        tasa:      saved.episodios > 0 ? Math.round((saved.exitos / saved.episodios) * 100) : 0,
      }));
    } else {
      epsilonRef.current   = EPS_INICIO;
      episodiosRef.current = 0;
      exitosRef.current    = 0;
      setHasSave(false);
      setStats({ episodios: 0, pasos: 0, epsilon: EPS_INICIO, tasa: 0, exito: false, waypoints: 0, demoExitos: 0, demoTotal: 0 });
    }
    resetEpisodio();
    setRedrawVersion(v => v + 1);

    if (wasTraining) {
      runningRef.current = true;
      setRunning(true);
      rafRef.current = requestAnimationFrame(loopRef.current);
    }
  }, [lstmSize, denseLayers, denseActKey, resetEpisodio]);

  // ── Loop principal ─────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const esDemo     = demoRef.current;
    const pasosFrame = esDemo ? 1 : PASOS_FRAME_TRAIN;

    for (let f = 0; f < pasosFrame; f++) {
      const ag  = agenteRef.current;
      const inp = entradas(ag, visitedRef.current);
      const q   = netRef.current.predict(inp);
      activationsRef.current = computeLSTMActs(netRef.current, inp);

      // Anti-bucle en demo: si lleva 25 pasos sin avanzar un TILE, explorar
      let eps = esDemo ? 0.04 : epsilonRef.current;
      if (esDemo && trailRef.current.length >= 25) {
        const h = trailRef.current;
        const p0 = h[h.length - 25], p1 = h[h.length - 1];
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 60) eps = 0.85;
      }

      const action = (inp[2] < PROX_UMBRAL || chocoRef.current)
        ? accionReflejoChoque(inp)
        : accionGreedy(q, eps);

      const { next, choco } = moverAgente(ag, action);
      agenteRef.current = next;
      trailRef.current.push({ x: next.x, y: next.y });
      if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift();
      stepRef.current++;

      // Recompensas
      let reward = -0.02;
      if (choco) reward -= 2.0;
      if (!choco && Math.max(...inp.slice(0, 5)) < 0.2) reward -= 3.0;

      WAYPOINTS.forEach((wp, i) => {
        if (!wpRef.current.has(i) && Math.hypot(next.x - wp.x, next.y - wp.y) < WAYPOINT_R)
          wpRef.current.add(i);
      });

      const cell = `${Math.floor(next.x / 60)},${Math.floor(next.y / 60)}`;
      if (visitedRef.current.has(cell)) reward -= 1.0;
      visitedRef.current.add(cell);

      const dist  = distObjetivo(next.x, next.y);
      const llego = dist < GOAL_R;
      if (llego) reward += 50;

      const done = llego || stepRef.current >= MAX_PASOS;
      chocoRef.current = choco;

      if (!esDemo) episodeBufRef.current.push({ inp, q, a: action, r: reward, done });

      if (done) {
        if (!esDemo) {
          actualizarLambda(netRef.current, episodeBufRef.current, lrRef.current);
          if (llego) exitosRef.current++;
          episodiosRef.current++;
          epsilonRef.current = Math.max(EPS_FIN, epsilonRef.current * EPS_DECAY);

          // Guardar cada SAVE_EVERY episodios
          if (episodiosRef.current % SAVE_EVERY === 0) {
            saveToStorage(
              netRef.current, lstmSizeRef.current, denseLayersRef.current, denseActKeyRef.current,
              episodiosRef.current, epsilonRef.current, exitosRef.current,
            );
            setHasSave(true);
          }

          // Actualizar mejor demo si aplica
          if (bestWeightsRef.current === null) {
            bestWeightsRef.current  = netRef.current.getWeights();
            bestDemoRateRef.current = 0;
          }
        } else {
          demoTotalRef.current++;
          if (llego) demoExitosRef.current++;
          const tasa = demoExitosRef.current / demoTotalRef.current;
          if (demoTotalRef.current >= 3 && tasa > bestDemoRateRef.current) {
            bestDemoRateRef.current = tasa;
            bestWeightsRef.current  = netRef.current.getWeights();
          }
          // Demo termina después de 1 episodio
          runningRef.current = false;
          demoRef.current    = false;
          setRunning(false);
          setDemo(false);
          netRef.current.resetState();
        }

        setStats({
          episodios: episodiosRef.current,
          pasos:     stepRef.current,
          epsilon:   Math.round(epsilonRef.current * 100) / 100,
          tasa:      episodiosRef.current > 0
            ? Math.round((exitosRef.current / episodiosRef.current) * 100) : 0,
          exito:     llego,
          waypoints: wpRef.current.size,
          demoExitos: demoExitosRef.current,
          demoTotal:  demoTotalRef.current,
        });
        setRedrawVersion(v => v + 1);

        if (!esDemo) {
          resetEpisodio();
          rafRef.current = requestAnimationFrame(loop);
        }
        return;
      }
    }

    setRedrawVersion(v => v + 1);
    rafRef.current = requestAnimationFrame(loop);
  }, [resetEpisodio]);

  // Mantener loopRef sincronizado con la versión actual del loop
  useEffect(() => { loopRef.current = loop; }, [loop]);

  // ── Controles ─────────────────────────────────────────────────────────────

  const iniciar = useCallback(() => {
    if (runningRef.current) return;
    demoRef.current    = false;
    runningRef.current = true;
    setRunning(true);
    setDemo(false);
    loop();
  }, [loop]);

  const pausar = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
  }, []);

  const probar = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    resetEpisodio();
    demoRef.current    = true;
    runningRef.current = true;
    setDemo(true);
    loop();
  }, [loop, resetEpisodio]);

  const resetear = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setDemo(false);
    demoRef.current = false;
    localStorage.removeItem(archKey(lstmSize, denseLayers, denseActKey));
    setHasSave(false);
    netRef.current         = buildNet(lstmSize, denseLayers, denseActKey);
    epsilonRef.current     = EPS_INICIO;
    episodiosRef.current   = 0;
    exitosRef.current      = 0;
    demoExitosRef.current  = 0;
    demoTotalRef.current   = 0;
    bestDemoRateRef.current = -1;
    bestWeightsRef.current  = null;
    resetEpisodio();
    setStats({ episodios: 0, pasos: 0, epsilon: EPS_INICIO, tasa: 0, exito: false, waypoints: 0, demoExitos: 0, demoTotal: 0 });
    setRedrawVersion(v => v + 1);
  }, [lstmSize, denseLayers, denseActKey, resetEpisodio]);

  const setLr = useCallback((v: number) => { lrRef.current = v; setLrState(v); }, []);

  // ── Arquitectura ──────────────────────────────────────────────────────────

  const setLstm = useCallback((n: number) => setLstmSize(Math.max(4, Math.min(64, n))), []);

  const addDense    = useCallback(() => setDenseLayers(prev => [...prev, { neurons: 8 }]), []);
  const removeDense = useCallback((i: number) => setDenseLayers(prev => prev.filter((_, idx) => idx !== i)), []);
  const updateDense = useCallback((i: number, neurons: number) =>
    setDenseLayers(prev => prev.map((l, idx) => idx === i ? { neurons } : l)), []);

  useEffect(() => () => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    // Canvas
    agenteRef, trailRef, wpRef, redrawVersion,
    showSensors, setShowSensors,
    // Red
    netRef, activationsRef,
    // Arquitectura
    lstmSize, denseLayers, denseActKey, setDenseActKey, lr,
    // UI
    running, demo, hasSave, stats,
    // Controles
    iniciar, pausar, probar, resetear, setLr,
    setLstm, addDense, removeDense, updateDense,
  };
}
