// Fórmula estándar de luminancia perceptual (ITU-R BT.601)
export function luminancia(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Datos para DOS neuronas especializadas:
//   Neurona 1 — ¿es muy claro?   (luminancia > 0.65)
//   Neurona 2 — ¿es muy oscuro?  (luminancia < 0.35)
// Si ninguna dispara → neutro
export type MuestraColor = {
  r: number;
  g: number;
  b: number;
  esMuyClaro:  number; // etiqueta para neurona 1
  esMuyOscuro: number; // etiqueta para neurona 2
};

export function generarDatos(n: number): MuestraColor[] {
  return Array.from({ length: n }, () => {
    const r = Math.random();
    const g = Math.random();
    const b = Math.random();
    const lum = luminancia(r, g, b);
    return {
      r, g, b,
      esMuyClaro:  lum > 0.65 ? 1 : 0,
      esMuyOscuro: lum < 0.35 ? 1 : 0,
    };
  });
}

// Interpreta las salidas de ambas neuronas en una de 3 clases
export function clasificar(salidaClaro: number, salidaOscuro: number): "claro" | "neutro" | "oscuro" {
  if (salidaClaro > 0.5)  return "claro";
  if (salidaOscuro > 0.5) return "oscuro";
  return "neutro";
}
