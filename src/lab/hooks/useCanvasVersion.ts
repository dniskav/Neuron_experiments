// ─── useCanvasVersion ─────────────────────────────────────────────────────────
//
// Devuelve un contador que sube cada vez que se llama a `tick()`.
// Úsalo como prop `version` de un canvas para forzar un redibujado
// sin depender de referencia de objeto (que nunca cambia).
//
// Uso:
//   const [version, tick] = useCanvasVersion()
//
//   // En el loop de entrenamiento:
//   tick()
//
//   // En el canvas:
//   useEffect(() => {
//     const ctx = canvasRef.current?.getContext('2d')
//     // ... dibujar ...
//   }, [version])
//
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'

export function useCanvasVersion(): [version: number, tick: () => void] {
  const [version, setVersion] = useState(0)
  const tick = useCallback(() => setVersion(v => v + 1), [])
  return [version, tick]
}
