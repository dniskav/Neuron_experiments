// ─── Lab Framework ────────────────────────────────────────────────────────────
//
// Mini-framework para experimentos de Neuron Lab.
// Importa todo desde aquí — no necesitas saber dónde vive cada pieza.
//
// Uso en un experimento nuevo:
//
//   import {
//     ExperimentLayout,
//     ConfigBox, StatsPanel, StatusBar, ControlBar, GoalBar, ExplainPanel,
//     NetworkDiagram, LayerBuilder, SpeedSelector,
//     useSession, useCanvasVersion,
//     type Metric, type ExplainSection, type HiddenLayerConfig,
//   } from '../../lab'
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type { Metric, ExplainSection }                      from './types'
export type { HiddenLayerConfig }                           from './components/LayerBuilder'
export type { LayerDef, NetworkDiagramProps, ActivationType } from './components/NetworkDiagram'
export type { SpeedOption }                                 from './components/SpeedSelector'

// ── Layout ────────────────────────────────────────────────────────────────────
export { ExperimentLayout } from './components/ExperimentLayout'

// ── Componentes UI ────────────────────────────────────────────────────────────
export { ConfigBox      } from './components/ConfigBox'
export { StatsPanel     } from './components/StatsPanel'
export { StatusBar      } from './components/StatusBar'
export { ControlBar     } from './components/ControlBar'
export { GoalBar        } from './components/GoalBar'
export { ExplainPanel   } from './components/ExplainPanel'

// ── Visualización de red ──────────────────────────────────────────────────────
export { NetworkDiagram } from './components/NetworkDiagram'

// ── Controles de arquitectura ─────────────────────────────────────────────────
export { LayerBuilder   } from './components/LayerBuilder'

// ── Controles de velocidad ────────────────────────────────────────────────────
export { SpeedSelector, TRAIN_SPEED_OPTIONS, TEST_SPEED_OPTIONS } from './components/SpeedSelector'

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useSession       } from './hooks/useSession'
export { useCanvasVersion } from './hooks/useCanvasVersion'
