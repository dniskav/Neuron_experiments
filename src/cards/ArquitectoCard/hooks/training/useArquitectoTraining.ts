// ─── useArquitectoTraining ────────────────────────────────────────────────────
//
// Hook genérico: acepta cualquier Problem y gestiona la red dinámica.
// Rebuilds the network when architecture, optimizer, or problem changes.
//

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { NetworkN, SGD, Momentum, Adam, relu, leakyRelu, sigmoid, tanh, linear, elu } from "@dniskav/neuron";
import type { ActivationType } from "../../../../components/lib";
import type { Problem } from "../../problems";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface LayerConfig {
  neurons:    number;
  activation: ActivationType;
}

export type OptimizerType = "sgd" | "momentum" | "adam";

// ── Mapas ─────────────────────────────────────────────────────────────────────

const ACT_MAP: Record<string, { fn: (x: number) => number; dfn: (o: number) => number }> = {
  relu, leakyRelu, sigmoid, tanh, linear, elu,
};

const OPT_MAP: Record<OptimizerType, () => unknown> = {
  sgd:      () => new SGD(),
  momentum: () => new Momentum(),
  adam:     () => new Adam(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNet(hidden: LayerConfig[], opt: OptimizerType): NetworkN {
  const sizes = [2, ...hidden.map(l => l.neurons), 1];
  const acts  = [...hidden.map(l => ACT_MAP[l.activation] ?? relu), sigmoid];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NetworkN(sizes, { activations: acts, optimizer: OPT_MAP[opt] as any });
}

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs];
  for (const layer of net.layers) acts.push(layer.predict(acts[acts.length - 1]));
  return acts;
}

function calcAccuracy(net: NetworkN, points: { x: number; y: number; label: number }[]): number {
  let ok = 0;
  for (const { x, y, label } of points)
    if ((net.predict([x, y])[0] >= 0.5 ? 1 : 0) === label) ok++;
  return ok / points.length;
}

// ── Hook principal ────────────────────────────────────────────────────────────

// ── Tipos de config de arquitectura por problema ──────────────────────────────

interface ArchConfig {
  hiddenLayers:  LayerConfig[];
  optimizerType: OptimizerType;
  lr:            number;
  epf:           number;
}

// Valores por defecto por nivel de dificultad
function defaultArch(problem: Problem): ArchConfig {
  return {
    hiddenLayers:  [],
    optimizerType: "adam",
    lr:            problem.nivel >= 3 ? 0.01 : 0.05,
    epf:           20,
  };
}

export function useArquitectoTraining(problem: Problem) {
  // Archivo de configuraciones por problema (persiste durante la sesión)
  const archiveRef = useRef<Record<string, ArchConfig>>({});
  const prevProblemIdRef = useRef<string>(problem.id);

  const getArch = (id: string): ArchConfig =>
    archiveRef.current[id] ?? defaultArch(problem);

  const initial = getArch(problem.id);

  const [hiddenLayers,  setHiddenLayers]  = useState<LayerConfig[]>(initial.hiddenLayers);
  const [optimizerType, setOptimizerType] = useState<OptimizerType>(initial.optimizerType);

  const lrRef            = useRef(initial.lr);
  const [lr, setLrState] = useState(initial.lr);
  const epfRef           = useRef(initial.epf);
  const [epf, setEpfState] = useState(initial.epf);

  const netRef         = useRef<NetworkN>(buildNet([], "adam"));
  const runningRef     = useRef(false);
  const animRef        = useRef<number | null>(null);
  const activationsRef = useRef<number[][]>([]);
  const epochsAccRef   = useRef(0);

  // Regenerar datos cuando cambia el problema
  const points = useMemo(() => problem.generar(), [problem]);

  const [entrenando,  setEntrenando]  = useState(false);
  const [epochs,      setEpochs]      = useState(0);
  const [loss,        setLoss]        = useState<number | null>(null);
  const [accuracy,    setAccuracy]    = useState<number | null>(null);
  const [drawVersion, setDrawVersion] = useState(0);

  // ── Rebuild en cambio de arquitectura, optimizador o problema ─────────────

  useEffect(() => {
    const prevId = prevProblemIdRef.current;

    if (prevId !== problem.id) {
      // Save current arch before switching
      archiveRef.current[prevId] = {
        hiddenLayers,
        optimizerType,
        lr:  lrRef.current,
        epf: epfRef.current,
      };
      prevProblemIdRef.current = problem.id;

      // Restore arch for new problem
      const saved = archiveRef.current[problem.id] ?? defaultArch(problem);
      setHiddenLayers(saved.hiddenLayers);
      setOptimizerType(saved.optimizerType);
      lrRef.current  = saved.lr;
      epfRef.current = saved.epf;
      setLrState(saved.lr);
      setEpfState(saved.epf);
      return; // state changes will re-trigger this effect to rebuild the net
    }

    runningRef.current = false;
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    netRef.current       = buildNet(hiddenLayers, optimizerType);
    epochsAccRef.current = 0;
    setEntrenando(false);
    setEpochs(0);
    setLoss(null);
    setAccuracy(null);
    setDrawVersion(v => v + 1);
  }, [hiddenLayers, optimizerType, problem]);

  // ── Bucle de entrenamiento ────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const net      = netRef.current;
    const shuffled = [...points].sort(() => Math.random() - 0.5);
    let totalLoss  = 0;
    let lastInp    = [0.5, 0.5];

    for (let e = 0; e < epfRef.current; e++) {
      for (const { x, y, label } of shuffled) {
        totalLoss += net.train([x, y], [label], lrRef.current);
        lastInp = [x, y];
      }
    }

    epochsAccRef.current += epfRef.current;
    activationsRef.current = computeActs(net, lastInp);
    setEpochs(epochsAccRef.current);
    setLoss(totalLoss / (epfRef.current * points.length));
    setAccuracy(calcAccuracy(net, points));
    setDrawVersion(v => v + 1);
    animRef.current = requestAnimationFrame(loop);
  }, [points]);

  // ── Controles ─────────────────────────────────────────────────────────────

  const iniciar = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setEntrenando(true);
    loop();
  }, [loop]);

  const pausar = useCallback(() => {
    runningRef.current = false;
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    setEntrenando(false);
  }, []);

  const resetear = useCallback(() => {
    pausar();
    netRef.current       = buildNet(hiddenLayers, optimizerType);
    epochsAccRef.current = 0;
    setEpochs(0); setLoss(null); setAccuracy(null);
    setDrawVersion(v => v + 1);
  }, [pausar, hiddenLayers, optimizerType]);

  const setLr  = useCallback((v: number) => { lrRef.current = v; setLrState(v); }, []);
  const setEpf = useCallback((v: number) => { epfRef.current = v; setEpfState(v); }, []);

  // ── Modificar arquitectura ────────────────────────────────────────────────

  const addLayer = useCallback(() => {
    setHiddenLayers(prev => [...prev, { neurons: 4, activation: "relu" }]);
  }, []);

  const removeLayer = useCallback((i: number) => {
    setHiddenLayers(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const updateLayer = useCallback((i: number, patch: Partial<LayerConfig>) => {
    setHiddenLayers(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }, []);

  useEffect(() => () => {
    runningRef.current = false;
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
  }, []);

  return {
    points, netRef, activationsRef,
    hiddenLayers, optimizerType, lr, epf,
    entrenando, epochs, loss, accuracy, drawVersion,
    iniciar, pausar, resetear,
    setLr, setEpf, setOptimizerType,
    addLayer, removeLayer, updateLayer,
  };
}
