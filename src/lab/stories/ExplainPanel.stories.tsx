import { ExplainPanel } from '../components/ExplainPanel'

export default { title: 'Lab Components' }

export const ExplainPanelTransformer = () => (
  <ExplainPanel
    sections={[
      {
        title: 'El problema del MLP',
        body:  'Una red clásica ve los 729 inputs como un vector plano. No sabe que la celda (2,5) está en la misma fila que (2,1).',
      },
      {
        title: 'Self-attention',
        body:  'Cada celda calcula Q·KᵀT para todas las demás y decide a cuáles prestarles atención. El resultado es un promedio ponderado de los valores V de cada celda.',
      },
      {
        title: 'Múltiples cabezas',
        body:  'Con 4 cabezas en paralelo, cada una puede especializarse: una para filas, otra para columnas, otra para cajas 3×3.',
      },
      {
        title: 'El mapa de arriba',
        body:  'Cada celda del eje X consulta todas las del eje Y. Más brillante = más atención prestada.',
      },
    ]}
  />
)
ExplainPanelTransformer.storyName = 'ExplainPanel — Transformer Sudoku'

export const ExplainPanelCorto = () => (
  <ExplainPanel
    sections={[
      { title: 'Q-Learning', body: 'El agente aprende el valor de cada acción en cada estado.' },
      { title: 'Epsilon-greedy', body: 'Al inicio explora al azar; con el tiempo explota lo aprendido.' },
    ]}
  />
)
ExplainPanelCorto.storyName = 'ExplainPanel — RL corto'
