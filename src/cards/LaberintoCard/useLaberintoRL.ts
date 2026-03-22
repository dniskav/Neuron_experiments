import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkLSTM } from "@dniskav/neuron";
import { saveNetworkLSTM } from "../../data/storage";
import {
  TILE, START, GOAL_R,
  WAYPOINTS, WAYPOINT_R, PROX_UMBRAL,
  moverAgente, distObjetivo, entradas,
  type Agente,
} from "../../data/laberinto";
import {
  crearRed, crearRedLaberinto, accionGreedy, accionReflejoChoque, actualizarLambda,
  STORAGE_KEY, SAVE_EVERY, LR, EPSILON_INICIO, EPSILON_FIN, EPSILON_DECAY,
  MAX_PASOS, PASOS_FRAME, MAX_TRAIL,
  type StepBuf,
} from "./rl";

export function useLaberintoRL() {
  const savedRef     = useRef(crearRedLaberinto());
  const netRef       = useRef<NetworkLSTM>(savedRef.current.net);
  const agenteRef    = useRef<Agente>({ ...START });
  const trailRef     = useRef<Array<{ x: number; y: number }>>([]);
  const wpRef        = useRef<Set<number>>(new Set());
  const epsilonRef   = useRef(savedRef.current.epsilon);
  const episodioRef  = useRef(savedRef.current.episodio);
  const exitosRef    = useRef(savedRef.current.exitos);
  const stepRef      = useRef(0);
  const chocoRef     = useRef(false);
  const runningRef   = useRef(false);
  const demoRef      = useRef(false);
  const rafRef       = useRef(0);
  const demoExitosRef   = useRef(0);
  const demoTotalRef    = useRef(0);
  const episodeBufRef   = useRef<StepBuf[]>([]);
  const bestDemoRateRef = useRef(-1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bestWeightsRef  = useRef<any | null>(null);
  const afterDemoRef    = useRef<(() => void) | null>(null);

  const [stats, setStats] = useState(() => ({
    episodio: savedRef.current.episodio,
    pasos: 0,
    epsilon: savedRef.current.epsilon,
    tasa: savedRef.current.episodio > 0
      ? Math.round((savedRef.current.exitos / savedRef.current.episodio) * 100)
      : 0,
    exito: false,
    wps: 0,
    demoExitos: 0,
    demoTotal:  0,
    mejorDemo:  -1,
  }));
  const [sensores, setSensores] = useState(true);
  const [pasosPorClick, setPasosPorClick] = useState(1);
  const [demoActivo, setDemoActivo] = useState<null | "probar" | "mejor">(null);

  const visitedCellsRef = useRef<Set<string>>(new Set());

  const resetEpisodio = useCallback(() => {
    agenteRef.current     = { ...START };
    trailRef.current      = [];
    wpRef.current         = new Set();
    stepRef.current       = 0;
    chocoRef.current      = false;
    episodeBufRef.current = [];
    visitedCellsRef.current = new Set();
    netRef.current.resetState();  // ← limpia h, c y trayectoria LSTM
  }, []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const esDemo     = demoRef.current;
    const pasosFrame = esDemo ? 1 : PASOS_FRAME;

    for (let f = 0; f < pasosFrame; f++) {
      const ag  = agenteRef.current;
      const inp = entradas(ag, visitedCellsRef.current);

      // Siempre llamamos predict para avanzar el estado LSTM
      // (incluso cuando usamos el reflejo de colisión)
      const q = netRef.current.predict(inp);

      // Selección de acción (igual que antes)
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

      // Waypoints: solo visuales
      WAYPOINTS.forEach((wp, i) => {
        if (!wpRef.current.has(i) && Math.hypot(next.x - wp.x, next.y - wp.y) < WAYPOINT_R) {
          wpRef.current.add(i);
        }
      });

      // Penalización por revisitar celdas
      const cell = `${Math.floor(next.x / TILE)},${Math.floor(next.y / TILE)}`;
      if (visitedCellsRef.current.has(cell)) reward -= 1.0;
      visitedCellsRef.current.add(cell);

      const dist  = distObjetivo(next.x, next.y);
      const llego = dist < GOAL_R;
      if (llego) reward += 50;

      const done = llego || stepRef.current >= MAX_PASOS;

      chocoRef.current = choco;

      // Guardar paso en el buffer del episodio (solo entrenamiento)
      if (!esDemo) {
        episodeBufRef.current.push({ inp, q, a: action, r: reward, done });
      }

      if (done) {
        if (!esDemo) {
          // BPTT + TD(λ): propaga la culpa hacia atrás a través de toda la trayectoria
          actualizarLambda(netRef.current, episodeBufRef.current, LR);
          if (llego) exitosRef.current++;
          episodioRef.current++;
          epsilonRef.current = Math.max(EPSILON_FIN, epsilonRef.current * EPSILON_DECAY);
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
          // Limpiar trayectoria LSTM acumulada durante el demo,
          // para que el próximo episodio de entrenamiento empiece con _acts vacío.
          netRef.current.resetState();
          return;
        }

        // Guardar en localStorage cada SAVE_EVERY episodios
        if (episodioRef.current % SAVE_EVERY === 0) {
          saveNetworkLSTM(STORAGE_KEY, {
            weights:  netRef.current.getWeights(),
            episodio: episodioRef.current,
            epsilon:  epsilonRef.current,
            exitos:   exitosRef.current,
          });
        }

        resetEpisodio();
        break;
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [resetEpisodio]);

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

  const handleDemoBest = useCallback(() => {
    if (!bestWeightsRef.current) return;
    handleStop();
    const pesosActuales = netRef.current.getWeights();
    afterDemoRef.current = () => netRef.current.setWeights(pesosActuales);
    netRef.current.setWeights(bestWeightsRef.current);
    resetEpisodio();
    demoRef.current    = true;
    runningRef.current = true;
    setDemoActivo("mejor");
    loop();
  }, [loop, handleStop, resetEpisodio]);

  const handlePaso = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (stepRef.current >= MAX_PASOS) resetEpisodio();

    let finalExito = false;
    let terminado  = false;

    for (let i = 0; i < pasosPorClick; i++) {
      const ag  = agenteRef.current;
      const inp = entradas(ag, visitedCellsRef.current);
      const q   = netRef.current.predict(inp);

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

  const handleRestoreBest = useCallback(() => {
    if (!bestWeightsRef.current) return;
    handleStop();
    netRef.current.setWeights(bestWeightsRef.current);
    resetEpisodio();
  }, [handleStop, resetEpisodio]);

  const handleReset = useCallback(() => {
    handleStop();
    localStorage.removeItem(STORAGE_KEY);
    netRef.current         = crearRed();
    episodioRef.current    = 0;
    exitosRef.current      = 0;
    epsilonRef.current     = EPSILON_INICIO;
    demoExitosRef.current  = 0;
    demoTotalRef.current   = 0;
    bestDemoRateRef.current = -1;
    bestWeightsRef.current  = null;
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
    stats,
    sensores,
    setSensores,
    pasosPorClick,
    setPasosPorClick,
    demoActivo,
    handleStart,
    handleStop,
    handleDemo,
    handleDemoBest,
    handlePaso,
    handleRestoreBest,
    handleReset,
  };
}
