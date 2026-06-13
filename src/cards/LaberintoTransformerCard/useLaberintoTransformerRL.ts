import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkTransformerRL } from "@dniskav/neuron";
import {
  TILE, START, GOAL_R,
  WAYPOINTS, WAYPOINT_R, PROX_UMBRAL,
  moverAgente, distObjetivo, entradas,
  type Agente,
} from "../../data/laberinto";
import {
  crearRedTransformer, ventanaVacia, avanzarVentana,
  accionGreedy, accionReflejoChoque, actualizarLambda,
  N_BLOCKS, LR, EPSILON_INICIO, EPSILON_FIN, EPSILON_DECAY,
  MAX_PASOS, PASOS_FRAME, MAX_TRAIL, STORAGE_KEY, SAVE_EVERY,
  type TransformerStepBuf,
} from "./rl";
import { saveNetworkTransformerRL } from "../../data/storage";

export function useLaberintoTransformerRL() {
  const init = crearRedTransformer();

  const netRef       = useRef<NetworkTransformerRL>(init.net);
  const agenteRef    = useRef<Agente>({ ...START });
  const trailRef     = useRef<Array<{ x: number; y: number }>>([]);
  const wpRef        = useRef<Set<number>>(new Set());
  const windowRef    = useRef<number[][]>(ventanaVacia());
  const epsilonRef   = useRef(init.epsilon);
  const episodioRef  = useRef(init.episodio);
  const exitosRef    = useRef(init.exitos);
  const stepRef      = useRef(0);
  const chocoRef     = useRef(false);
  const runningRef   = useRef(false);
  const demoRef      = useRef(false);
  const rafRef       = useRef(0);
  const demoExitosRef    = useRef(0);
  const demoTotalRef     = useRef(0);
  const episodeBufRef    = useRef<TransformerStepBuf[]>([]);
  const bestDemoRateRef  = useRef(-1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bestWeightsRef   = useRef<any | null>(null);
  const afterDemoRef     = useRef<(() => void) | null>(null);
  const visitedCellsRef  = useRef<Set<string>>(new Set());

  // Refs para visualización en TransformerRLDiagram
  const attentionRef = useRef<number[][] | null>(null);
  const qValuesRef   = useRef<number[] | null>(null);

  const [stats, setStats] = useState({
    episodio: init.episodio, pasos: 0, epsilon: init.epsilon,
    tasa: init.episodio > 0 ? Math.round((init.exitos / init.episodio) * 100) : 0,
    exito: false, wps: 0,
    demoExitos: 0, demoTotal: 0, mejorDemo: -1,
  });
  const [sensores, setSensores]             = useState(true);
  const [pasosPorClick, setPasosPorClick]   = useState(1);
  const [demoActivo, setDemoActivo]         = useState<null | "probar" | "mejor">(null);

  const resetEpisodio = useCallback(() => {
    agenteRef.current    = { ...START };
    trailRef.current     = [];
    wpRef.current        = new Set();
    windowRef.current    = ventanaVacia();
    stepRef.current      = 0;
    chocoRef.current     = false;
    episodeBufRef.current = [];
    visitedCellsRef.current = new Set();
  }, []);

  const guardarStorage = useCallback(() => {
    saveNetworkTransformerRL(STORAGE_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      weights:  netRef.current.getWeights() as any,
      episodio: episodioRef.current,
      epsilon:  epsilonRef.current,
      exitos:   exitosRef.current,
    });
  }, []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const esDemo     = demoRef.current;
    const pasosFrame = esDemo ? 1 : PASOS_FRAME;

    for (let f = 0; f < pasosFrame; f++) {
      const ag  = agenteRef.current;
      const inp = entradas(ag, visitedCellsRef.current);

      // Avanzar ventana y predecir
      windowRef.current = avanzarVentana(windowRef.current, inp);
      const q = netRef.current.predict(windowRef.current);

      // Actualizar refs de visualización
      const attnAll = netRef.current.getAttentionWeights();
      attentionRef.current = attnAll[N_BLOCKS - 1]?.[0] ?? null;
      qValuesRef.current   = q;

      // Selección de acción
      let eps = esDemo ? 0.04 : epsilonRef.current;
      if (esDemo && trailRef.current.length >= 25) {
        const hist = trailRef.current;
        const p0 = hist[hist.length - 25];
        const p1 = hist[hist.length - 1];
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < TILE) eps = 0.85;
      }
      const sensorFrente = inp[2];
      const action = (sensorFrente < PROX_UMBRAL || chocoRef.current)
        ? accionReflejoChoque(inp)
        : accionGreedy(q, eps);

      const { next, choco } = moverAgente(ag, action);
      agenteRef.current = next;

      trailRef.current.push({ x: next.x, y: next.y });
      if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift();

      stepRef.current++;

      // Recompensa
      let reward = -0.02;
      if (choco) reward -= 2.0;
      const maxSensor = Math.max(inp[0], inp[1], inp[2], inp[3], inp[4]);
      if (!choco && maxSensor < 0.2) reward -= 3.0;

      WAYPOINTS.forEach((wp, i) => {
        if (!wpRef.current.has(i) && Math.hypot(next.x - wp.x, next.y - wp.y) < WAYPOINT_R) {
          wpRef.current.add(i);
        }
      });

      const cell = `${Math.floor(next.x / TILE)},${Math.floor(next.y / TILE)}`;
      if (visitedCellsRef.current.has(cell)) reward -= 1.0;
      visitedCellsRef.current.add(cell);

      const dist  = distObjetivo(next.x, next.y);
      const llego = dist < GOAL_R;
      if (llego) reward += 50;

      const done = llego || stepRef.current >= MAX_PASOS;
      chocoRef.current = choco;

      if (!esDemo) {
        episodeBufRef.current.push({ seq: windowRef.current.map(r => r.slice()), q, a: action, r: reward, done });
      }

      if (done) {
        if (!esDemo) {
          actualizarLambda(netRef.current, episodeBufRef.current, LR);
          if (llego) exitosRef.current++;
          episodioRef.current++;
          epsilonRef.current = Math.max(EPSILON_FIN, epsilonRef.current * EPSILON_DECAY);

          if (episodioRef.current % SAVE_EVERY === 0) guardarStorage();
        }

        if (esDemo) {
          demoTotalRef.current++;
          if (llego) demoExitosRef.current++;
          const total = demoTotalRef.current;
          const tasa  = demoExitosRef.current / total;
          if (total >= 3 && tasa > bestDemoRateRef.current) {
            bestDemoRateRef.current = tasa;
            bestWeightsRef.current  = netRef.current.getWeights();
          }
        }

        setStats({
          episodio:   episodioRef.current,
          pasos:      stepRef.current,
          epsilon:    Math.round(epsilonRef.current * 100) / 100,
          tasa:       episodioRef.current > 0
            ? Math.round((exitosRef.current / episodioRef.current) * 100) : 0,
          exito:      llego,
          wps:        wpRef.current.size,
          demoExitos: demoExitosRef.current,
          demoTotal:  demoTotalRef.current,
          mejorDemo:  bestDemoRateRef.current,
        });

        if (esDemo) {
          runningRef.current = false;
          demoRef.current    = false;
          setDemoActivo(null);
          afterDemoRef.current?.();
          afterDemoRef.current = null;
          return;
        }

        resetEpisodio();
        break;
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [resetEpisodio, guardarStorage]);

  const handleStart = useCallback(() => {
    if (runningRef.current) return;
    demoRef.current    = false;
    runningRef.current = true;
    loop();
  }, [loop]);

  const handleStop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setDemoActivo(null);
  }, []);

  const handleDemo = useCallback(() => {
    handleStop();
    resetEpisodio();
    demoRef.current    = true;
    runningRef.current = true;
    setDemoActivo("probar");
    loop();
  }, [loop, handleStop, resetEpisodio]);

  const handleVerMejor = useCallback(() => {
    if (!bestWeightsRef.current) return;
    handleStop();
    resetEpisodio();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    netRef.current.setWeights(bestWeightsRef.current as any);
    demoRef.current    = true;
    runningRef.current = true;
    setDemoActivo("mejor");
    loop();
  }, [loop, handleStop, resetEpisodio]);

  const handleRestaurarMejor = useCallback(() => {
    if (!bestWeightsRef.current) return;
    handleStop();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    netRef.current.setWeights(bestWeightsRef.current as any);
  }, [handleStop]);

  const handlePaso = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (stepRef.current >= MAX_PASOS) resetEpisodio();

    let finalExito = false;
    let terminado  = false;

    for (let i = 0; i < pasosPorClick; i++) {
      const ag  = agenteRef.current;
      const inp = entradas(ag, visitedCellsRef.current);
      windowRef.current = avanzarVentana(windowRef.current, inp);
      const q = netRef.current.predict(windowRef.current);
      const attnAll = netRef.current.getAttentionWeights();
      attentionRef.current = attnAll[N_BLOCKS - 1]?.[0] ?? null;
      qValuesRef.current   = q;

      let eps = 0.04;
      if (trailRef.current.length >= 25) {
        const hist = trailRef.current;
        const p0 = hist[hist.length - 25];
        const p1 = hist[hist.length - 1];
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < TILE) eps = 0.85;
      }
      const sensorFrente = inp[2];
      const action = (sensorFrente < PROX_UMBRAL || chocoRef.current)
        ? accionReflejoChoque(inp)
        : accionGreedy(q, eps);

      const { next, choco } = moverAgente(ag, action);
      agenteRef.current = next;
      trailRef.current.push({ x: next.x, y: next.y });
      if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift();
      stepRef.current++;
      chocoRef.current = choco;

      WAYPOINTS.forEach((wp, wi) => {
        if (!wpRef.current.has(wi) && Math.hypot(next.x - wp.x, next.y - wp.y) < WAYPOINT_R) {
          wpRef.current.add(wi);
        }
      });

      const llego = distObjetivo(next.x, next.y) < GOAL_R;
      if (llego || stepRef.current >= MAX_PASOS) {
        finalExito = llego;
        terminado  = true;
        break;
      }
    }

    setStats({
      episodio:   episodioRef.current,
      pasos:      stepRef.current,
      epsilon:    Math.round(epsilonRef.current * 100) / 100,
      tasa:       episodioRef.current > 0
        ? Math.round((exitosRef.current / episodioRef.current) * 100) : 0,
      exito:      finalExito,
      wps:        wpRef.current.size,
      demoExitos: demoExitosRef.current,
      demoTotal:  demoTotalRef.current,
      mejorDemo:  bestDemoRateRef.current,
    });

    if (terminado) resetEpisodio();
  }, [pasosPorClick, resetEpisodio]);

  const handleReset = useCallback(() => {
    handleStop();
    localStorage.removeItem(STORAGE_KEY);
    netRef.current        = crearRedTransformer().net;
    episodioRef.current   = 0;
    exitosRef.current     = 0;
    epsilonRef.current    = EPSILON_INICIO;
    demoExitosRef.current = 0;
    demoTotalRef.current  = 0;
    bestDemoRateRef.current = -1;
    bestWeightsRef.current  = null;
    attentionRef.current    = null;
    qValuesRef.current      = null;
    resetEpisodio();
    setStats({ episodio: 0, pasos: 0, epsilon: EPSILON_INICIO, tasa: 0, exito: false, wps: 0, demoExitos: 0, demoTotal: 0, mejorDemo: -1 });
  }, [handleStop, resetEpisodio]);

  useEffect(() => {
    return () => { runningRef.current = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  return {
    agenteRef,
    trailRef,
    wpRef,
    attentionRef,
    qValuesRef,
    stats,
    sensores,
    setSensores,
    pasosPorClick,
    setPasosPorClick,
    demoActivo,
    bestWeightsRef,
    handleStart,
    handleStop,
    handleDemo,
    handleVerMejor,
    handleRestaurarMejor,
    handlePaso,
    handleReset,
  };
}
