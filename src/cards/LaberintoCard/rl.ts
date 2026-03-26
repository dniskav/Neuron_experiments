import { NetworkLSTM, Adam } from "@dniskav/neuron";
import { loadNetworkLSTM } from "../../data/storage";

// ─── Arquitectura: LSTM(12 → 16) → Dense(16) → Dense(3) ──────────────────────
export const LSTM_IN     = 12;  // 5 sensores + x/CW + y/CH + 5 visited flags
export const LSTM_H      = 16;  // tamaño del estado oculto
export const DENSE       = [16, 3];

export const STORAGE_KEY    = "laberinto_lstm_v2";
export const SAVE_EVERY     = 10;

export const LR             = 0.02;
export const GAMMA          = 0.95;
export const LAMBDA         = 0.85;
export const EPSILON_INICIO = 0.92;
export const EPSILON_FIN    = 0.06;
export const EPSILON_DECAY  = 0.986;
export const R_SCALE        = 14;
export const MAX_PASOS      = 600;
export const PASOS_FRAME    = 10;
export const MAX_TRAIL      = 100;

// ─── Red ──────────────────────────────────────────────────────────────────────

export function crearRed(): NetworkLSTM {
  return new NetworkLSTM(LSTM_IN, LSTM_H, DENSE, { optimizer: () => new Adam() });
}

export function crearRedLaberinto() {
  const net  = crearRed();
  const data = loadNetworkLSTM(STORAGE_KEY);
  if (data?.weights) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      net.setWeights(data.weights as any);
    } catch { /* pesos incompatibles, ignorar */ }
  }
  return {
    net,
    episodio: data?.episodio ?? 0,
    epsilon:  data?.epsilon  ?? EPSILON_INICIO,
    exitos:   data?.exitos   ?? 0,
  };
}

// ─── Activaciones intermedias ─────────────────────────────────────────────────
//
// Reconstruye todas las activaciones de la red LSTM para visualización:
//   acts[0] = entradas
//   acts[1] = salida LSTM (hidden state h)
//   acts[2..n] = salidas de las capas dense
//
// Las capas dense se re-evalúan (sin coste en estado) para obtener
// los valores intermedios que NetworkLSTM no expone directamente.

export function computeLSTMActs(net: NetworkLSTM, inputs: number[]): number[][] {
  const lstmH = net.lstm.h.slice(); // copia del hidden state tras el último predict
  const acts: number[][] = [inputs, lstmH];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const layer of (net as any).denseLayers) {
    acts.push(layer.predict(acts[acts.length - 1]));
  }
  return acts;
}

// ─── Selección de acción ──────────────────────────────────────────────────────

export function accionGreedy(q: number[], eps: number): 0 | 1 | 2 {
  if (Math.random() < eps) return Math.floor(Math.random() * 3) as 0 | 1 | 2;
  return (q[0] >= q[1] && q[0] >= q[2] ? 0 : q[1] >= q[2] ? 1 : 2) as 0 | 1 | 2;
}

// Reflejo de colisión: gira hacia el lado con más espacio libre.
// sensors = [izq(-90°), frente-izq(-45°), frente(0°), frente-der(+45°), der(+90°)]
export function accionReflejoChoque(sensors: number[]): 0 | 1 | 2 {
  const espacioIzq = Math.max(sensors[0], sensors[1]);
  const espacioDer = Math.max(sensors[3], sensors[4]);
  if (espacioIzq > espacioDer) return 0;
  if (espacioDer > espacioIzq) return 2;
  return Math.random() < 0.5 ? 0 : 2;
}

// ─── TD(λ) con BPTT ───────────────────────────────────────────────────────────

export type { StepBuf } from "./types";
import type { StepBuf } from "./types";

export function actualizarLambda(net: NetworkLSTM, buf: StepBuf[], lr: number) {
  if (buf.length === 0) return;
  const n = buf.length;

  // V(s') = max Q del paso siguiente (ya calculado con el estado LSTM correcto)
  const vNext = buf.map((step, t) => {
    if (step.done) return 0.5;
    if (t + 1 < n) return Math.max(...buf[t + 1].q);
    return 0.5;
  });

  // Barrido hacia atrás: G[t] = r + γ·[(1-λ)·V(s') + λ·G[t+1]]
  const G = new Array<number>(n);
  G[n - 1] = Math.max(0, Math.min(1, buf[n - 1].r / R_SCALE + GAMMA * vNext[n - 1]));
  for (let t = n - 2; t >= 0; t--) {
    G[t] = Math.max(0, Math.min(1,
      buf[t].r / R_SCALE + GAMMA * ((1 - LAMBDA) * vNext[t] + LAMBDA * G[t + 1])
    ));
  }

  // Targets: Q-values originales con G[t] en la acción tomada
  const targets = buf.map((step, t) => {
    const tgts = [...step.q];
    tgts[step.a] = G[t];
    return tgts;
  });

  // BPTT: usa la trayectoria almacenada internamente en NetworkLSTM
  net.train(targets, lr);
}
