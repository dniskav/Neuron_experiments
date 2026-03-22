import type { RefObject } from "react";
import type { Escena } from "../../data/fisicas";

export interface CañonSceneProps {
  escenaRef: RefObject<Escena>;
  predRef:   RefObject<{ angulo: number; v0: number } | null>;
  hoverRef:  RefObject<"target" | "obstacle" | null>;
}
