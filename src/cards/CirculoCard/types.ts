import type { RefObject } from "react";
import type { NetworkN } from "@dniskav/neuron";
import type { PuntoCirculo } from "../../data/datosCirculo";

export interface Circulo {
  cx: number;
  cy: number;
  radio: number;
}

export interface CirculoSceneProps {
  redRef:     RefObject<NetworkN>;
  puntosRef:  RefObject<PuntoCirculo[]>;
  circuloRef: RefObject<Circulo>;
}
