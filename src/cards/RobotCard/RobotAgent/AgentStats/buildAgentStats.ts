import { GOAL_SUCCESS_RATE } from '../../useAgentRL'
import type { Level } from '../../useAgentRL'
import type { StatEntry } from './StatEntry'

export function buildAgentStats(
  level: Level,
  episodes: number,
  currentSteps: number,
  avgSteps: number,
  bestSteps: number,
  successRate: number,
): StatEntry[] {
  return [
    { label: 'Episodios',      value: episodes },
    { label: 'Pasos actuales', value: currentSteps },
    level === 2
      ? { label: 'Frenos exitosos',       value: `${(successRate * 100).toFixed(0)} %`, highlight: successRate >= GOAL_SUCCESS_RATE }
      : { label: 'Promedio (últimos 20)', value: avgSteps },
    { label: 'Mejor episodio', value: bestSteps },
  ]
}
