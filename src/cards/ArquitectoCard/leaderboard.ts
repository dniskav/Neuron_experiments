// ─── Leaderboard ──────────────────────────────────────────────────────────────
//
// Top 10 configuraciones Snake persistidas en localStorage.
// Una entrada por arquitectura única — si mejora el score se actualiza.
//

import type { LayerConfig, OptimizerType } from "./hooks/training/useSnakeRL";

const KEY = "snake-dqn-leaderboard";

export interface LeaderboardEntry {
  id:         string;
  hidden:     LayerConfig[];
  optimizer:  OptimizerType;
  lr:         number;
  bestScore:  number;
  episodes:   number;
  steps:      number;
  savedAt:    number;
}

function archKey(hidden: LayerConfig[]): string {
  return hidden.map(l => `${l.neurons}${l.activation[0]}`).join("-") || "empty";
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Añade o actualiza la entrada para esta arquitectura. Devuelve el board actualizado. */
export function upsertLeaderboard(entry: Omit<LeaderboardEntry, "id" | "savedAt">): LeaderboardEntry[] {
  const board   = getLeaderboard();
  const key     = archKey(entry.hidden);
  const existing = board.find(e => archKey(e.hidden) === key);

  // Solo actualizar si el nuevo score es mayor
  if (existing && existing.bestScore >= entry.bestScore) return board;

  const newEntry: LeaderboardEntry = {
    ...entry,
    id:      existing?.id ?? Math.random().toString(36).slice(2),
    savedAt: Date.now(),
  };

  const updated = [
    ...board.filter(e => archKey(e.hidden) !== key),
    newEntry,
  ]
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 10);

  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* quota */ }
  return updated;
}

export function clearLeaderboard() {
  localStorage.removeItem(KEY);
}
