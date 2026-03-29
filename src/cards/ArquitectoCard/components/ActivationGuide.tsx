// ─── ActivationGuide ──────────────────────────────────────────────────────────
// Panel de referencia visual para las funciones de activación.

interface ActInfo {
  key: string
  name: string
  formula: string
  color: string
  fn: (x: number) => number
  best: string
  avoid: string | null
}

const ACTS: ActInfo[] = [
  {
    key: 'relu',
    name: 'ReLU',
    formula: 'f(x) = max(0, x)',
    color: '#6366f1',
    fn: (x) => Math.max(0, x),
    best: 'Capas ocultas en la mayoría de redes',
    avoid: 'No usar en salida ni con datos centrados en negativo'
  }
  // ...agrega el resto de funciones de activación aquí...
]

export function ActivationGuide() {
  return (
    <div>
      <h2>Funciones de Activación</h2>
      <ul>
        {ACTS.map((act) => (
          <li key={act.key} style={{ color: act.color }}>
            <strong>{act.name}</strong>: {act.formula} <br />
            <em>Mejor uso:</em> {act.best}
            {act.avoid && (
              <>
                <br />
                <em>Evitar:</em> {act.avoid}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
