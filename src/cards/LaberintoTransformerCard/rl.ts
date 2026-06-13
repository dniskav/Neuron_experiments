import { NetworkTransformerRL } from "@dniskav/neuron";
import { loadNetworkTransformerRL } from "../../data/storage";

// ─── Arquitectura: TransformerRL(seq=8, in=12) → 3 Q-values ──────────────────
export const SEQ_LEN   = 8;   // ventana de pasos anteriores
export const INPUT_DIM = 12;  // 5 sensores + x/y + 5 visited flags (igual que LSTM)
export const D_MODEL   = 32;
export const N_HEADS   = 2;
export const D_FF      = 64;
export const N_BLOCKS  = 2;
export const N_ACTIONS = 3;

export const STORAGE_KEY    = "laberinto_transformer_v2";
export const SAVE_EVERY     = 10;

export const LR             = 0.001;
export const GAMMA          = 0.95;
export const LAMBDA         = 0.85;
export const EPSILON_INICIO = 0.92;
export const EPSILON_FIN    = 0.06;
export const EPSILON_DECAY  = 0.986;
export const R_SCALE        = 14;
export const MAX_PASOS      = 180;  // camino directo ~130 pasos · callejón+retroceso ~260 → siempre falla
export const PASOS_FRAME    = 10;
export const MAX_TRAIL      = 100;

// ─── Red ──────────────────────────────────────────────────────────────────────

export function crearRed(): NetworkTransformerRL {
  return new NetworkTransformerRL(SEQ_LEN, INPUT_DIM, {
    d_model:  D_MODEL,
    nHeads:   N_HEADS,
    d_ff:     D_FF,
    nBlocks:  N_BLOCKS,
    nActions: N_ACTIONS,
  });
}

export function crearRedTransformer() {
  const net  = crearRed();
  const data = loadNetworkTransformerRL(STORAGE_KEY);
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

// ─── Ventana deslizante ───────────────────────────────────────────────────────

export function ventanaVacia(): number[][] {
  return Array.from({ length: SEQ_LEN }, () => new Array(INPUT_DIM).fill(0));
}

export function avanzarVentana(window: number[][], inp: number[]): number[][] {
  return [...window.slice(1), inp];
}

// ─── Selección de acción ──────────────────────────────────────────────────────

export function accionGreedy(q: number[], eps: number): 0 | 1 | 2 {
  if (Math.random() < eps) return Math.floor(Math.random() * 3) as 0 | 1 | 2;
  return (q[0] >= q[1] && q[0] >= q[2] ? 0 : q[1] >= q[2] ? 1 : 2) as 0 | 1 | 2;
}

export function accionReflejoChoque(sensors: number[]): 0 | 1 | 2 {
  const espacioIzq = Math.max(sensors[0], sensors[1]);
  const espacioDer = Math.max(sensors[3], sensors[4]);
  if (espacioIzq > espacioDer) return 0;
  if (espacioDer > espacioIzq) return 2;
  return Math.random() < 0.5 ? 0 : 2;
}

// ─── TD(λ) ────────────────────────────────────────────────────────────────────

export type { TransformerStepBuf } from "./types";
import type { TransformerStepBuf } from "./types";

export function actualizarLambda(
  net: NetworkTransformerRL,
  buf: TransformerStepBuf[],
  lr: number,
) {
  const n = buf.length;
  if (n === 0) return;

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
    net.train(buf[t].seq, targets, lr);
  }
}
