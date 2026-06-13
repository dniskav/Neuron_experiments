// ─── useMazeRL ────────────────────────────────────────────────────────────────
//
// DQN + LSTM para el laberinto con arquitectura configurable.
// Adaptado de useLaberintoRL con capas configurables y persistencia por arquitectura.
//

import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkLSTM, NetworkTransformerRL, Adam, relu, leakyRelu, tanh, sigmoid, linear } from "@dniskav/neuron";
import type { Activation } from "@dniskav/neuron";
import {
  START, GOAL_R, WAYPOINTS, WAYPOINT_R, PROX_UMBRAL,
  moverAgente, distObjetivo, entradas,
  type Agente,
} from "../../../../data/laberinto";
import { accionGreedy, accionReflejoChoque, actualizarLambda, computeLSTMActs } from "../../../LaberintoCard/rl";
import { ventanaVacia, avanzarVentana } from "../../../LaberintoTransformerCard/rl";
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

const TRANSFORMER_SEQ_LEN = 8;
const TRANSFORMER_D_MODEL = 32;
const TRANSFORMER_N_HEADS = 2;
const TRANSFORMER_D_FF    = 64;
const TRANSFORMER_BLOCKS  = 2;

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DenseConfig { neurons: number; }

export type NetworkType = "lstm" | "transformer";

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

function archKey(netType: NetworkType, lstmSize: number, dense: DenseConfig[], actKey: DenseActKey): string {
  if (netType === "transformer") {
    return `maze-transformer-${TRANSFORMER_D_MODEL}-${TRANSFORMER_N_HEADS}-${TRANSFORMER_BLOCKS}`;
  }
  return `maze-lstm${lstmSize}-${dense.map(l => l.neurons).join("-") || "nodense"}-${actKey}`;
}

type SavedMazeLSTM = {
  type:      "lstm";
  weights:   ReturnType<NetworkLSTM["getWeights"]>;
  episodios: number;
  epsilon:   number;
  exitos:    number;
};

type SavedMazeTransformer = {
  type:      "transformer";
  weights:   number[];
  episodios: number;
  epsilon:   number;
  exitos:    number;
};

type SavedMaze = SavedMazeLSTM | SavedMazeTransformer;

function saveToStorage(net: NetworkLSTM | NetworkTransformerRL, netType: NetworkType, lstmSize: number, dense: DenseConfig[], actKey: DenseActKey, episodios: number, epsilon: number, exitos: number) {
  try {
    const data: SavedMaze = netType === "transformer"
      ? { type: "transformer", weights: (net as NetworkTransformerRL).getWeightsFlat(), episodios, epsilon, exitos }
      : { type: "lstm", weights: (net as NetworkLSTM).getWeights(), episodios, epsilon, exitos };
    localStorage.setItem(archKey(netType, lstmSize, dense, actKey), JSON.stringify(data));
  } catch { /* quota */ }
}

function loadFromStorage(net: NetworkLSTM | NetworkTransformerRL, netType: NetworkType, lstmSize: number, dense: DenseConfig[], actKey: DenseActKey): { episodios: number; epsilon: number; exitos: number } | null {
  try {
    const raw = localStorage.getItem(archKey(netType, lstmSize, dense, actKey));
    if (!raw) return null;
    const data: SavedMaze = JSON.parse(raw);
    if (netType === "transformer" && data.type === "transformer") {
      (net as NetworkTransformerRL).setWeightsFlat((data as SavedMazeTransformer).weights);
    } else if (netType === "lstm" && data.type === "lstm") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (net as NetworkLSTM).setWeights((data as SavedMazeLSTM).weights as any);
    }
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

function buildTransformerNet(): NetworkTransformerRL {
  return new NetworkTransformerRL(TRANSFORMER_SEQ_LEN, N_IN, {
    d_model:  TRANSFORMER_D_MODEL,
    nHeads:   TRANSFORMER_N_HEADS,
    d_ff:     TRANSFORMER_D_FF,
    nBlocks:  TRANSFORMER_BLOCKS,
    nActions: N_OUT,
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMazeRL() {
  // Arquitectura configurable
  const [networkType, setNetworkType] = useState<NetworkType>("lstm");
  const [lstmSize,    setLstmSize]    = useState(16);
  const [denseLayers, setDenseLayers] = useState<DenseConfig[]>([{ neurons: 16 }]);
  const [denseActKey, setDenseActKey] = useState<DenseActKey>("relu");
  const [lr,          setLrState]     = useState(LR_DEFAULT);
  const lrRef = useRef(LR_DEFAULT);

  // Refs para que los loops lean siempre la arquitectura actual
  const networkTypeRef = useRef(networkType);
  const lstmSizeRef    = useRef(lstmSize);
  const denseLayersRef = useRef(denseLayers);
  const denseActKeyRef = useRef(denseActKey);
  useEffect(() => { networkTypeRef.current = networkType; }, [networkType]);
  useEffect(() => { lstmSizeRef.current    = lstmSize;    }, [lstmSize]);
  useEffect(() => { denseLayersRef.current = denseLayers; }, [denseLayers]);
  useEffect(() => { denseActKeyRef.current = denseActKey; }, [denseActKey]);

  // Red
  const netRef = useRef<NetworkLSTM | NetworkTransformerRL>(buildNet(lstmSize, denseLayers, denseActKey));

  // Ventana deslizante para TransformerRL
  const ventanaRef = useRef<number[][]>(ventanaVacia());

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bestWeightsRef = useRef<any | null>(null);
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
    ventanaRef.current   = ventanaVacia();
    const net = netRef.current;
    if (net instanceof NetworkLSTM) net.resetState();
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

    const net: NetworkLSTM | NetworkTransformerRL = networkType === "transformer"
      ? buildTransformerNet()
      : buildNet(lstmSize, denseLayers, denseActKey);
    netRef.current = net;

    const saved = loadFromStorage(net, networkType, lstmSize, denseLayers, denseActKey);
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
  }, [networkType, lstmSize, denseLayers, denseActKey, resetEpisodio]);

  // ── Loop principal ─────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const esDemo     = demoRef.current;
    const pasosFrame = esDemo ? 1 : PASOS_FRAME_TRAIN;
    const isTransformer = networkTypeRef.current === "transformer";

    for (let f = 0; f < pasosFrame; f++) {
      const ag  = agenteRef.current;
      const inp = entradas(ag, visitedRef.current);

      let q: number[];
      if (isTransformer) {
        ventanaRef.current = avanzarVentana(ventanaRef.current, inp);
        q = (netRef.current as NetworkTransformerRL).predict(ventanaRef.current);
      } else {
        q = (netRef.current as NetworkLSTM).predict(inp);
      }
      activationsRef.current = isTransformer ? [] : computeLSTMActs(netRef.current as NetworkLSTM, inp);

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

      if (!esDemo) {
        if (isTransformer) {
          (episodeBufRef.current as unknown as Array<{ seq: number[][]; q: number[]; a: number; r: number; done: boolean }>)
            .push({ seq: ventanaRef.current.map(s => [...s]), q, a: action, r: reward, done });
        } else {
          episodeBufRef.current.push({ inp, q, a: action, r: reward, done });
        }
      }

      if (done) {
        if (!esDemo) {
          if (isTransformer) {
            // TD(λ) + per-step train for transformer
            const buf = episodeBufRef.current as unknown as Array<{ seq: number[][]; q: number[]; a: number; r: number; done: boolean }>;
            const n = buf.length;
            if (n > 0) {
              const GAMMA = 0.95, LAMBDA = 0.85, R_SCALE = 14;
              const vNext = buf.map((step, t) => {
                if (step.done) return 0.5;
                if (t + 1 < n) return Math.max(...buf[t + 1].q);
                return 0.5;
              });
              const G = new Array<number>(n);
              G[n - 1] = Math.max(0, Math.min(1, buf[n - 1].r / R_SCALE + GAMMA * vNext[n - 1]));
              for (let t = n - 2; t >= 0; t--) {
                G[t] = Math.max(0, Math.min(1,
                  buf[t].r / R_SCALE + GAMMA * ((1 - LAMBDA) * vNext[t] + LAMBDA * G[t + 1])
                ));
              }
              for (let t = 0; t < n; t++) {
                const targets = [...buf[t].q];
                targets[buf[t].a] = G[t];
                (netRef.current as NetworkTransformerRL).train(buf[t].seq, targets, lrRef.current);
              }
            }
          } else {
            actualizarLambda(netRef.current as NetworkLSTM, episodeBufRef.current, lrRef.current);
          }
          if (llego) exitosRef.current++;
          episodiosRef.current++;
          epsilonRef.current = Math.max(EPS_FIN, epsilonRef.current * EPS_DECAY);

          // Guardar cada SAVE_EVERY episodios
          if (episodiosRef.current % SAVE_EVERY === 0) {
            saveToStorage(
              netRef.current, networkTypeRef.current, lstmSizeRef.current, denseLayersRef.current, denseActKeyRef.current,
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
          const net = netRef.current;
          if (net instanceof NetworkLSTM) net.resetState();
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
    localStorage.removeItem(archKey(networkType, lstmSize, denseLayers, denseActKey));
    setHasSave(false);
    netRef.current = networkType === "transformer"
      ? buildTransformerNet()
      : buildNet(lstmSize, denseLayers, denseActKey);
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
  }, [networkType, lstmSize, denseLayers, denseActKey, resetEpisodio]);

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
    // Tipo de red
    networkType, setNetworkType,
    // Arquitectura
    lstmSize, denseLayers, denseActKey, setDenseActKey, lr,
    // UI
    running, demo, hasSave, stats,
    // Controles
    iniciar, pausar, probar, resetear, setLr,
    setLstm, addDense, removeDense, updateDense,
  };
}
