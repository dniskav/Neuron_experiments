import type { RefObject } from "react";
import type { Escena } from "../../data/fisicas";

export interface AngryBirdSceneProps {
  escenaRef:     RefObject<Escena>;
  anguloPredRef: RefObject<number | null>;
  hoverRef:      RefObject<"target" | "obstacle" | null>;
}
