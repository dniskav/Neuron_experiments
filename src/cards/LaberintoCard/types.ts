import type { RefObject } from "react";
import type { Agente } from "../../data/laberinto";

export interface StepBuf {
  inp: number[];
  q: number[];
  a: number;
  r: number;
  done: boolean;
}

export interface MazeSceneProps {
  agenteRef:   RefObject<Agente>;
  trailRef:    RefObject<Array<{ x: number; y: number }>>;
  wpRef:       RefObject<Set<number>>;
  showSensors: boolean;
}
