import { G, type Escena } from "./fisicas";

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE ENTRENAMIENTO — RED CON 2 SALIDAS: ángulo + fuerza
//
// La red ya no recibe la fuerza como entrada — la tiene que calcular.
// Inputs:  [xBlanco, xObs, hObs]          → 3 entradas
// Outputs: [ángulo_norm, v0_norm]          → 2 salidas
//
// La clave: para cada escenario calculamos el tiro ÓPTIMO (mínima fuerza
// que llega al blanco y supera el obstáculo). Hay infinitas combinaciones
// (ángulo, fuerza) que funcionan — elegimos la de menor fuerza para que
// el entrenamiento sea consistente (una sola respuesta correcta por escena).
//
// ── Matemática del tiro óptimo ───────────────────────────────────────────────
// Para un blanco en (xB, 0) con velocidad v0 y ángulo θ:
//   alcance = v0² · sin(2θ) / g  →  v0² = g·xB / sin(2θ)
//
// Sustituyendo v0² en la condición de superar el obstáculo:
//   y(xObs) = xObs·tan(θ) - xObs²·tan(θ) / xBlanco ≥ hObs
//   tan(θ) ≥ hObs·xBlanco / (xObs·(xBlanco − xObs))
//
// La mínima v0 se da a θ=45° (sin(90°)=1). Si el obstáculo obliga a θ>45°,
// usamos ese ángulo mínimo. En ambos casos v0 = sqrt(g·xB / sin(2θ)).
// ─────────────────────────────────────────────────────────────────────────────

export interface EjemploCañon {
  entradas: number[]; // [xBlanco/16, xObs/12, hObs/8] ∈ [0,1]³
  salidas:  number[]; // [ángulo_norm, v0_norm]          ∈ [0,1]²
  escena:   Escena;
  angulo:   number;   // ángulo óptimo en radianes
  v0:       number;   // fuerza óptima en m/s
}

export const ANGULO_MIN_RAD = 10 * Math.PI / 180;
export const ANGULO_MAX_RAD = 89 * Math.PI / 180;
export const V0_MIN = 5;
export const V0_MAX = 22;

export function normAngulo(a: number): number {
  return (a - ANGULO_MIN_RAD) / (ANGULO_MAX_RAD - ANGULO_MIN_RAD);
}
export function desnormAngulo(n: number): number {
  return ANGULO_MIN_RAD + n * (ANGULO_MAX_RAD - ANGULO_MIN_RAD);
}
export function normV0(v: number): number {
  return (v - V0_MIN) / (V0_MAX - V0_MIN);
}
export function desnormV0(n: number): number {
  return V0_MIN + n * (V0_MAX - V0_MIN);
}

/**
 * Calcula el tiro óptimo (mínima fuerza) para la escena dada.
 * Devuelve null si no existe solución dentro de los rangos permitidos.
 */
export function encontrarOptimo(escena: Escena): { angulo: number; v0: number } | null {
  const { xObstaculo: xO, hObstaculo: hO, xBlanco: xB } = escena;
  if (xO >= xB || xB - xO <= 0) return null;

  // Ángulo mínimo para superar el obstáculo con la mínima fuerza posible
  const tanMin   = (hO * xB) / (xO * (xB - xO));
  const thetaMin = Math.atan(tanMin);

  // θ óptimo: máximo entre 45° (mínima fuerza sin obstáculo) y θ_min
  const theta = Math.max(Math.PI / 4, thetaMin);

  // Fuerza mínima para alcanzar xBlanco con este ángulo
  const sinDoble = Math.sin(2 * theta);
  if (sinDoble <= 0) return null;
  const v0 = Math.sqrt((G * xB) / sinDoble);

  if (v0 < V0_MIN) return null;

  return { angulo: theta, v0 };
}

/**
 * Genera n ejemplos con la solución óptima (ángulo + fuerza mínima).
 */
export function generarDatosCañon(n: number): EjemploCañon[] {
  const datos: EjemploCañon[] = [];
  let intentos = 0;

  while (datos.length < n && intentos < n * 30) {
    intentos++;

    // 30% de los ejemplos fuerzan casos difíciles (ángulo alto, obstáculo alto/cercano)
    const casosDificil = datos.length < n * 0.3;
    let xObs: number, hObs: number, xBlanco: number;

    if (casosDificil) {
      xObs    = 2 + Math.random() * 7;              // [2, 9]
      hObs    = 4 + Math.random() * 3.5;            // [4, 7.5] — obstáculos altos
      xBlanco = xObs + 1 + Math.random() * 5;       // [xObs+1, xObs+6] — blanco cercano
    } else {
      xObs    = 2 + Math.random() * 10;             // [2, 12]
      hObs    = 0.5 + Math.random() * 6;            // [0.5, 6.5]
      xBlanco = xObs + 2 + Math.random() * 12;      // [xObs+2, xObs+14]
    }

    if (xBlanco > 19.5) continue;

    const escena: Escena = { xObstaculo: xObs, hObstaculo: hObs, xBlanco };
    const optimo = encontrarOptimo(escena);
    if (!optimo) continue;

    datos.push({
      entradas: [xBlanco / 20, xObs / 12, hObs / 8],
      salidas:  [normAngulo(optimo.angulo), normV0(optimo.v0)],
      escena,
      angulo: optimo.angulo,
      v0:     optimo.v0,
    });
  }

  return datos;
}
