import { useState, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import type { Obstacle } from '../../useAgentRL'

export function useObstacles(obstaclesRef: MutableRefObject<Obstacle[]>, count = 2) {
  const [obstacles, setObstacles] = useState<(Obstacle | null)[]>(() => Array(count).fill(null))

  useEffect(() => {
    obstaclesRef.current = obstacles.filter(Boolean) as Obstacle[]
  }, [obstacles, obstaclesRef])

  const activeObstacles = obstacles.filter(Boolean) as Obstacle[]

  function handleObstacleChange(index: number, value: Obstacle | null) {
    setObstacles(prev => prev.map((o, i) => i === index ? value : o))
  }

  return { obstacles, activeObstacles, handleObstacleChange }
}
