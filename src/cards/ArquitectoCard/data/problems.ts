// ─── Tipos de problemas de clasificación 2D ────────────────────────────────────
//
// Las implementaciones y el catálogo PROBLEMS están en ../problems.ts
// Este archivo solo exporta los tipos para que otros módulos los importen.
//

export interface Point {
  x: number // [0, 1]
  y: number // [0, 1]
  label: number // 0 | 1
}

export interface Hint {
  minEpochs: number
  maxAcc: number
  noLayers?: boolean // solo si no hay capas ocultas
  msg: string
}

export interface Problem {
  id: string
  emoji: string
  titulo: string
  nivel: 1 | 2 | 3
  descripcion: string
  successMsg: string
  hints: Hint[]
  generar: () => Point[]
  cornerLabels?: [string, string, string, string] // [bottom-left, bottom-right, top-left, top-right]
}
