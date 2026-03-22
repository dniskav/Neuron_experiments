// ─────────────────────────────────────────────────────────────────────────────
// FÍSICA DEL TIRO PARABÓLICO — sin librerías, matemática pura
//
// Lanzamos un proyectil desde el origen (0, 0) con velocidad inicial V0
// y ángulo θ respecto a la horizontal. Las ecuaciones paramétricas son:
//
//   x(t) = V0 · cos(θ) · t
//   y(t) = V0 · sin(θ) · t  −  ½ · g · t²
//
// Eliminando t obtenemos la altura en función de x:
//   y(x) = x·tan(θ)  −  g·x² / (2·V0²·cos²(θ))
//
// La escena tiene:
//   - Un obstáculo en x = xObstaculo con altura hObstaculo (muro vertical)
//   - Un blanco en el suelo (y = 0) en x = xBlanco
//
// El objetivo: encontrar θ tal que y(xObstaculo) ≥ hObstaculo  Y  x_aterrizaje ≈ xBlanco
// ─────────────────────────────────────────────────────────────────────────────

export const G     = 9.8;  // gravedad (m/s²)
export const V0    = 15;   // velocidad inicial fija (m/s)
export const MAX_X = 20;   // ancho de la escena (metros)
export const MAX_Y = 12;   // alto máximo visible (metros)

export interface Escena {
  xObstaculo: number; // posición horizontal del obstáculo [m]
  hObstaculo: number; // altura del obstáculo [m]
  xBlanco:    number; // posición horizontal del blanco [m]
}

/**
 * Altura del proyectil en la posición horizontal x para un ángulo dado.
 * Ecuación derivada de las ecuaciones paramétricas (eliminando t):
 *   y = x·tan(θ) − g·x² / (2·V0²·cos²(θ))
 */
// v0 es opcional en todas las funciones — por defecto usa la constante V0 (15 m/s).
// Esto mantiene compatibilidad con DetectorAngryBird que usa V0 fijo.

export function alturaEn(x: number, angulo: number, v0 = V0): number {
  const tan  = Math.tan(angulo);
  const cos2 = Math.cos(angulo) ** 2;
  return x * tan - (G * x * x) / (2 * v0 * v0 * cos2);
}

/**
 * Distancia horizontal de aterrizaje:  x = v0² · sin(2θ) / g
 * Máximo alcance (a 45°): v0²/g
 */
export function xAterrizaje(angulo: number, v0 = V0): number {
  return (v0 * v0 * Math.sin(2 * angulo)) / G;
}

/**
 * Encuentra analíticamente el ángulo para un blanco en el suelo con velocidad v0.
 *   sin(2θ) = g · xBlanco / v0²
 * Dos soluciones: θ_bajo (rasante) y θ_alto (arco).
 * Devuelve el que supera el obstáculo, null si ninguno lo hace.
 */
export function encontrarAngulo(escena: Escena, v0 = V0): number | null {
  const { xObstaculo, hObstaculo, xBlanco } = escena;

  const sinVal = (G * xBlanco) / (v0 * v0);
  if (sinVal > 1) return null; // fuera del alcance máximo para esta v0

  const thetaBajo = Math.asin(sinVal) / 2;
  const thetaAlto = Math.PI / 2 - thetaBajo;

  for (const theta of [thetaAlto, thetaBajo]) {
    if (alturaEn(xObstaculo, theta, v0) >= hObstaculo) return theta;
  }

  return null;
}

/**
 * Puntos de la trayectoria para visualización, calculados con velocidad v0.
 */
export function simularTrayectoria(angulo: number, v0 = V0): Array<{ x: number; y: number }> {
  const puntos: Array<{ x: number; y: number }> = [];
  const vx = v0 * Math.cos(angulo);
  const vy = v0 * Math.sin(angulo);

  for (let t = 0; t <= 5; t += 0.05) {
    const x = vx * t;
    const y = vy * t - 0.5 * G * t * t;
    if (y < -0.1) break;
    if (y >= 0) puntos.push({ x, y });
  }

  return puntos;
}
