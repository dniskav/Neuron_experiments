// ─── Lab Framework — Types ────────────────────────────────────────────────────
//
// Tipos compartidos por todos los componentes del framework de experimentos.
//
// ─────────────────────────────────────────────────────────────────────────────

/** Una métrica para mostrar en StatsPanel. */
export interface Metric {
  label: string
  value: string | number
  /** Texto de referencia pequeño debajo del valor (ej: "≈ 2.20 al inicio") */
  hint?: string
  /** Color del valor. Por defecto: gray.300. */
  color?: string
}

/** Una sección del panel de explicación "¿Cómo funciona?". */
export interface ExplainSection {
  title: string
  body: string
}
