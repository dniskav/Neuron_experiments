import type { MutableRefObject } from 'react'
import { useState } from 'react'

interface SpeedRefs {
  speedRef: MutableRefObject<number>
  trainSpeedRef: MutableRefObject<number>
}

export function useSpeedControls({ speedRef, trainSpeedRef }: SpeedRefs) {
  const [speedDisplay, setSpeedDisplay]           = useState(0.1)
  const [trainSpeedDisplay, setTrainSpeedDisplay] = useState(1)

  function handleSpeed(v: number) { speedRef.current = v; setSpeedDisplay(v) }
  function handleTrainSpeed(v: number) { trainSpeedRef.current = v; setTrainSpeedDisplay(v) }

  return { speedDisplay, trainSpeedDisplay, handleSpeed, handleTrainSpeed }
}
