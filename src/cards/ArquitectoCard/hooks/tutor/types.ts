// Tipos compartidos para el sistema de tutoría

export type TutorType = 'critical' | 'warning' | 'tip' | 'success'

export interface TutorMessage {
  type: TutorType
  icon: string
  title: string
  body: string
}

export interface TutorRule<Context = any> {
  id: string
  type: TutorType
  title: string
  applies: (ctx: Context) => boolean
  message: (ctx: Context) => string
}

export interface TutorContext {
  // Común a todos los dominios
  hiddenLayers?: any
  accuracy?: number
  loss?: number
  epochs?: number
  // Snake
  epsilon?: number
  score?: number
  // Maze
  lstmSize?: number
  waypointsFound?: number
}
