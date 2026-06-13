// ─── useSession ───────────────────────────────────────────────────────────────
//
// Hook genérico para conectar un Session (lógica pura) con React.
// Maneja la suscripción, el estado inicial y la limpieza al desmontar.
//
// Requisito del Session:
//   - session.getState(): S
//   - session.subscribe(fn: (s: S) => void): () => void   // retorna unsubscribe
//
// Uso:
//   const state = useSession(sessionRef)
//
// Ejemplo completo:
//   const sessionRef = useRef(() => new TransformerSudokuSession(...))
//   const state = useSession(sessionRef.current)
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

interface SessionLike<S> {
  getState():                           S
  subscribe(fn: (s: S) => void):        () => void
}

export function useSession<S>(session: SessionLike<S>): S {
  const [state, setState] = useState<S>(() => session.getState())

  useEffect(() => {
    // Sincronizar si el session cambió
    setState(session.getState())
    return session.subscribe(setState)
  }, [session])

  return state
}
