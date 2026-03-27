// ─── Generador de datos: "¿Voy a la fiesta?" (XOR) ───────────────────────────
//
// Eje X → "¿va la novia?"  (0 = no, 1 = sí)
// Eje Y → "¿va la esposa?" (0 = no, 1 = sí)
//
// Tabla de verdad (XOR):
//   (0,0) → 0  😴  no va ninguna → me quedo en casa
//   (1,0) → 1  🕺  solo la novia → ¡voy!
//   (0,1) → 1  🕺  solo la esposa → ¡voy!
//   (1,1) → 0  💀  van las dos  → me matan
//

export interface Point {
  x:     number; // [0, 1]
  y:     number; // [0, 1]
  label: number; // 0 | 1
}

function gauss(std: number): number {
  const u = Math.max(1e-10, Math.random());
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

export function generarFiesta(n = 240): Point[] {
  const corners = [
    { x: 0.1, y: 0.1, label: 0 }, // 😴
    { x: 0.9, y: 0.1, label: 1 }, // 🕺 novia
    { x: 0.1, y: 0.9, label: 1 }, // 🕺 esposa
    { x: 0.9, y: 0.9, label: 0 }, // 💀
  ];
  const out: Point[] = [];
  const perCorner = Math.floor(n / 4);
  for (const c of corners) {
    for (let i = 0; i < perCorner; i++) {
      out.push({
        x: Math.max(0.01, Math.min(0.99, c.x + gauss(0.09))),
        y: Math.max(0.01, Math.min(0.99, c.y + gauss(0.09))),
        label: c.label,
      });
    }
  }
  return out.sort(() => Math.random() - 0.5);
}
