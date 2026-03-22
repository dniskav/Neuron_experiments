export interface SimpleWeights {
  weight: number;
  bias: number;
  totalEpocas: number;
}

export interface WeightsN {
  weights: number[];
  bias: number;
  totalEpocas: number;
}

export function saveWeightsSimple(key: string, data: SimpleWeights): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadWeightsSimple(key: string): SimpleWeights | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as SimpleWeights; } catch { return null; }
}

export function saveWeightsN(key: string, data: WeightsN): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadWeightsN(key: string): WeightsN | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as WeightsN; } catch { return null; }
}

export function deleteWeights(key: string): void {
  localStorage.removeItem(key);
}

// ─── NetworkN (multicapa) ─────────────────────────────────────────────────────

export interface NetworkNState {
  layers: Array<Array<{ weights: number[]; bias: number }>>;
  episodio: number;
  epsilon:  number;
  exitos:   number;
}

export function saveNetworkN(key: string, data: NetworkNState): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadNetworkN(key: string): NetworkNState | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as NetworkNState; } catch { return null; }
}

// ─── NetworkLSTM ──────────────────────────────────────────────────────────────

export interface NetworkLSTMState {
  weights:  object;   // ReturnType<NetworkLSTM['getWeights']>
  episodio: number;
  epsilon:  number;
  exitos:   number;
}

export function saveNetworkLSTM(key: string, data: NetworkLSTMState): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadNetworkLSTM(key: string): NetworkLSTMState | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as NetworkLSTMState; } catch { return null; }
}
