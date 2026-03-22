import { encontrarAngulo, type Escena } from "./fisicas";

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE ENTRENAMIENTO — TIRO PARABÓLICO
//
// Cada ejemplo es un escenario aleatorio (obstáculo + blanco) junto con
// el ángulo correcto calculado analíticamente mediante las ecuaciones de
// tiro parabólico.
//
// La red recibe entradas normalizadas [0, 1] para facilitar el entrenamiento.
// La salida también está normalizada: 0 = ANGULO_MIN, 1 = ANGULO_MAX.
// ─────────────────────────────────────────────────────────────────────────────

export interface EjemploTiro {
  entradas:  number[]; // [xBlanco/18, xObs/12, hObs/9] ∈ [0,1]³
  salida:    number;   // ángulo normalizado ∈ [0,1]
  escena:    Escena;
  angulo:    number;   // ángulo correcto en radianes
}

// Rango de ángulos que enseñamos a la red
export const ANGULO_MIN_RAD = 10 * Math.PI / 180; //  10°
export const ANGULO_MAX_RAD = 80 * Math.PI / 180; //  80°

/** Convierte un ángulo en radianes a [0, 1] */
export function normAngulo(a: number): number {
  return (a - ANGULO_MIN_RAD) / (ANGULO_MAX_RAD - ANGULO_MIN_RAD);
}

/** Convierte un valor [0, 1] a radianes */
export function desnormAngulo(n: number): number {
  return ANGULO_MIN_RAD + n * (ANGULO_MAX_RAD - ANGULO_MIN_RAD);
}

/**
 * Genera `n` escenarios aleatorios válidos junto con el ángulo correcto.
 *
 * Un escenario es "válido" si:
 *   - El blanco está dentro del alcance del proyectil
 *   - Existe un ángulo en [ANGULO_MIN, ANGULO_MAX] que supera el obstáculo
 *
 * Normalización de entradas:
 *   - xBlanco   ∈ [5, 18] → dividimos entre 18
 *   - xObs      ∈ [3, 10] → dividimos entre 12
 *   - hObs      ∈ [1,  8] → dividimos entre 9
 */
export function generarDatos(n: number): EjemploTiro[] {
  const datos: EjemploTiro[] = [];
  let intentos = 0;

  while (datos.length < n && intentos < n * 30) {
    intentos++;

    const xObs    = 3 + Math.random() * 7;          // [3, 10]
    const hObs    = 1 + Math.random() * 7;           // [1, 8]
    const xBlanco = xObs + 2 + Math.random() * 8;   // [xObs+2, xObs+10]

    if (xBlanco > 18) continue;

    const escena: Escena = { xObstaculo: xObs, hObstaculo: hObs, xBlanco };
    const angulo = encontrarAngulo(escena);

    if (angulo === null) continue;
    if (angulo < ANGULO_MIN_RAD || angulo > ANGULO_MAX_RAD) continue;

    datos.push({
      entradas: [xBlanco / 18, xObs / 12, hObs / 9],
      salida:   normAngulo(angulo),
      escena,
      angulo,
    });
  }

  return datos;
}
