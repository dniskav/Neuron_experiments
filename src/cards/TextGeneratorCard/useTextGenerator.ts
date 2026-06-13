// ─── useTextGenerator — React adapter ──────────────────────────────────────────
//
// Creates the session once, subscribes to state changes, exposes controls.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react'
import { TextGeneratorSession } from '../../core/text/TextGeneratorSession'
import type { TextGeneratorState } from '../../core/text/TextGeneratorSession'

export type { TextGeneratorState }

export function useTextGenerator() {
  const trainSpeedRef = useRef(1)
  const sessionRef    = useRef<TextGeneratorSession | null>(null)

  if (!sessionRef.current) {
    sessionRef.current = new TextGeneratorSession({
      trainSpeed: trainSpeedRef,
    })
  }

  const [state, setState] = useState<TextGeneratorState>(
    () => sessionRef.current!.getState()
  )

  const [trainSpeed, setTrainSpeedState] = useState(1)

  useEffect(() => sessionRef.current!.subscribe(setState), [])
  useEffect(() => () => sessionRef.current!.destroy(), [])

  const setTrainSpeed = useCallback((v: number) => {
    trainSpeedRef.current = v
    setTrainSpeedState(v)
  }, [])

  return {
    state,
    trainSpeed,
    setTrainSpeed,
    startTraining: () => sessionRef.current!.startTraining(),
    pause:         () => sessionRef.current!.pause(),
    reset:         () => sessionRef.current!.reset(),
    generate:      () => sessionRef.current!.generate(),
  }
}
