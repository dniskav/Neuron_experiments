// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE ENTRENAMIENTO — CLASIFICACIÓN DE PUNTOS DENTRO/FUERA DE UN CÍRCULO
//
// El espacio de entrada es [x, y] donde ambas coordenadas están en [-1, 1].
// Por defecto el círculo está centrado en (0, 0) con radio 0.5.
// Las funciones aceptan cx/cy/radio opcionales para soportar círculos móviles.
// ─────────────────────────────────────────────────────────────────────────────

export interface PuntoCirculo {
  x: number;
  y: number;
  dentro: number; // 1 = dentro, 0 = fuera
}

export const RADIO = 0.5;

/**
 * Decide si el punto (x, y) está dentro del círculo dado.
 */
export function estaAdentro(x: number, y: number, cx = 0, cy = 0, radio = RADIO): number {
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < radio * radio ? 1 : 0;
}

/**
 * Genera `n` puntos BALANCEADOS: exactamente n/2 dentro y n/2 fuera del círculo.
 *
 * Sin balanceo, el círculo de radio 0.5 ocupa solo ~19.6% del cuadrado [-1,1]×[-1,1],
 * por lo que habría 4× más ejemplos "fuera" que "dentro". La red aprendería el atajo
 * de decir siempre "fuera" (~80% de precisión sin haber aprendido nada útil).
 *
 * Con datos balanceados la red no puede hacer trampa y tiene que aprender la frontera real.
 */
export function generarDatosCirculo(n: number, cx = 0, cy = 0, radio = RADIO): PuntoCirculo[] {
  const mitad = Math.floor(n / 2);
  const dentro: PuntoCirculo[] = [];
  const fuera: PuntoCirculo[]  = [];

  // Dentro: muestreamos en la caja del círculo — mucho más eficiente que muestrear
  // [-1,1] completo (especialmente con círculos pequeños)
  while (dentro.length < mitad) {
    const x = cx + (Math.random() * 2 - 1) * radio;
    const y = cy + (Math.random() * 2 - 1) * radio;
    if (x >= -1 && x <= 1 && y >= -1 && y <= 1 && estaAdentro(x, y, cx, cy, radio)) {
      dentro.push({ x, y, dentro: 1 });
    }
  }

  // Fuera: muestreo con rechazo en todo el espacio
  while (fuera.length < mitad) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    if (!estaAdentro(x, y, cx, cy, radio)) fuera.push({ x, y, dentro: 0 });
  }

  return [...dentro, ...fuera];
}
