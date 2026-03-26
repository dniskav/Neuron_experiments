import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkN, Adam, leakyRelu, sigmoid } from "@dniskav/neuron";
import {
  N_IN, N_OUT, DT, STEPS_PER_FRAME, MAX_PASOS, SUCCESS_UMBRAL, MAX_TRAIL,
  LR, GAMMA, EPSILON_INICIO, EPSILON_FIN, EPSILON_DECAY,
  type BallState, type PadState,
  initBall, initPad, physicsStep, getInputs, greedyAction,
} from "./physics";
import { saveNetworkN, loadNetworkN, type NetworkNState } from "../../data/storage";

// ─── Red neuronal ─────────────────────────────────────────────────────────────
// Dense(5→32→16→3) · leakyRelu+leakyRelu+sigmoid · Adam
// Salidas: Q(izquierda), Q(quieto), Q(derecha)

const STORAGE_KEY = "arkanoid_dqn_v1";
const SAVE_EVERY  = 25; // guardar cada N episodios

function computeActs(net: NetworkN, inputs: number[]): number[][] {
  const acts: number[][] = [inputs];
  for (const layer of net.layers) acts.push(layer.predict(acts[acts.length - 1]));
  return acts;
}

function crearRed(): NetworkN {
  return new NetworkN([N_IN, 32, 16, N_OUT], {
    activations: [leakyRelu, leakyRelu, sigmoid],
    optimizer:   () => new Adam(),
  });
}

function extractWeights(net: NetworkN): NetworkNState["layers"] {
  return net.layers.map(layer =>
    layer.neurons.map(n => ({ weights: [...n.weights], bias: n.bias }))
  );
}

function restoreWeights(net: NetworkN, saved: NetworkNState["layers"]): void {
  saved.forEach((layerData, li) => {
    layerData.forEach((nd, ni) => {
      net.layers[li].neurons[ni].weights = [...nd.weights];
      net.layers[li].neurons[ni].bias    = nd.bias;
    });
  });
}

// ─── Hook principal ───────────────────────────────────────────────────────────

function initFromStorage(): {
  net: NetworkN; episodio: number; epsilon: number; exitos: number;
} {
  const saved = loadNetworkN(STORAGE_KEY);
  const net   = crearRed();
  if (saved) {
    restoreWeights(net, saved.layers);
    return { net, episodio: saved.episodio, epsilon: saved.epsilon, exitos: saved.exitos };
  }
  return { net, episodio: 0, epsilon: EPSILON_INICIO, exitos: 0 };
}

export function useArkanoidRL() {
  const init = initFromStorage();

  const netRef         = useRef<NetworkN>(init.net);
  const ballRef        = useRef<BallState>(initBall());
  const padRef         = useRef<PadState>(initPad());
  const trailRef       = useRef<Array<{ x: number; y: number }>>([]);
  const activationsRef = useRef<number[][]>([]);

  const runningRef  = useRef(false);
  const demoRef     = useRef(false);
  const rafRef      = useRef(0);
  const epsilonRef  = useRef(init.epsilon);
  const episodioRef = useRef(init.episodio);
  const pasosRef    = useRef(0);
  const mejorRef    = useRef(0);
  const exitosRef   = useRef(init.exitos);

  const [stats, setStats] = useState({
    episodio: init.episodio,
    pasos:    0,
    mejor:    0,
    tasa:     init.episodio > 0 ? Math.round((init.exitos / init.episodio) * 100) : 0,
    epsilon:  Math.round(init.epsilon * 100) / 100,
  });
  const [demoActivo, setDemoActivo] = useState(false);

  // ── Reset de episodio ───────────────────────────────────────────────────────

  const resetEpisodio = useCallback(() => {
    ballRef.current  = initBall();
    padRef.current   = initPad();
    trailRef.current = [];
    pasosRef.current = 0;
  }, []);

  // ── Bucle principal ─────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    const esDemo = demoRef.current;
    const steps  = esDemo ? 1 : STEPS_PER_FRAME;

    for (let f = 0; f < steps; f++) {
      const inp  = getInputs(ballRef.current, padRef.current);
      const acts = computeActs(netRef.current, inp);
      activationsRef.current = acts;
      const q = acts[acts.length - 1];

      const eps    = esDemo ? 0 : epsilonRef.current;
      const action = greedyAction(q, eps);

      const { ball, pad, hitPad, done } = physicsStep(
        ballRef.current, padRef.current, action, DT,
      );

      ballRef.current = ball;
      padRef.current  = pad;
      pasosRef.current++;

      // Rastro visual
      trailRef.current.push({ x: ball.x, y: ball.y });
      if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift();

      // ── Q-learning online (solo durante entrenamiento) ────────────────────
      if (!esDemo) {
        // Recompensa: 1.0 al golpear paleta · 0.0 al perder · 0.0 neutro
        const r = hitPad ? 1.0 : 0.0;

        let targetQ: number;
        if (done) {
          targetQ = 0.0; // terminal: perdió
        } else {
          const nextQ = netRef.current.predict(getInputs(ball, pad));
          targetQ = Math.min(1, r + GAMMA * Math.max(...nextQ));
        }

        const tgts   = [...q];
        tgts[action] = targetQ;
        netRef.current.train(inp, tgts, LR);
      }

      const survived = pasosRef.current;
      const finished = done || survived >= MAX_PASOS;

      if (finished) {
        if (survived > mejorRef.current) mejorRef.current = survived;
        if (survived >= SUCCESS_UMBRAL)  exitosRef.current++;
        episodioRef.current++;

        if (!esDemo) {
          epsilonRef.current = Math.max(EPSILON_FIN, epsilonRef.current * EPSILON_DECAY);

          if (episodioRef.current % SAVE_EVERY === 0) {
            saveNetworkN(STORAGE_KEY, {
              layers:   extractWeights(netRef.current),
              episodio: episodioRef.current,
              epsilon:  epsilonRef.current,
              exitos:   exitosRef.current,
            });
          }
        }

        setStats({
          episodio: episodioRef.current,
          pasos:    survived,
          mejor:    mejorRef.current,
          tasa:     episodioRef.current > 0
            ? Math.round((exitosRef.current / episodioRef.current) * 100)
            : 0,
          epsilon:  Math.round(epsilonRef.current * 100) / 100,
        });

        resetEpisodio();

        if (esDemo) {
          runningRef.current = false;
          demoRef.current    = false;
          setDemoActivo(false);
          return;
        }
        break;
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [resetEpisodio]);

  // ── Controles ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (runningRef.current) return;
    demoRef.current    = false;
    runningRef.current = true;
    loop();
  }, [loop]);

  const handleStop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setDemoActivo(false);
  }, []);

  const handleDemo = useCallback(() => {
    handleStop();
    resetEpisodio();
    demoRef.current    = true;
    runningRef.current = true;
    setDemoActivo(true);
    loop();
  }, [loop, handleStop, resetEpisodio]);

  const handleReset = useCallback(() => {
    handleStop();
    localStorage.removeItem(STORAGE_KEY);
    netRef.current      = crearRed();
    epsilonRef.current  = EPSILON_INICIO;
    episodioRef.current = 0;
    exitosRef.current   = 0;
    mejorRef.current    = 0;
    resetEpisodio();
    setStats({ episodio: 0, pasos: 0, mejor: 0, tasa: 0, epsilon: EPSILON_INICIO });
  }, [handleStop, resetEpisodio]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    ballRef,
    padRef,
    trailRef,
    activationsRef,
    stats,
    demoActivo,
    handleStart,
    handleStop,
    handleDemo,
    handleReset,
  };
}
