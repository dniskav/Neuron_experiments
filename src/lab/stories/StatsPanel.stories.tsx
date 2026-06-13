import { StatsPanel } from '../components/StatsPanel'

export default { title: 'Lab Components' }

export const StatsPanelBasico = () => (
  <StatsPanel
    label="ENTRENAMIENTO"
    metrics={[
      { label: 'Pasos',     value: '12,304' },
      { label: 'Episodios', value: '847' },
    ]}
  />
)
StatsPanelBasico.storyName = 'StatsPanel — básico'

export const StatsPanelConColores = () => (
  <StatsPanel
    label="ENTRENAMIENTO"
    metrics={[
      { label: 'Pasos',     value: '1,915' },
      { label: 'Loss (CE)', value: '1.4231', color: '#4ade80',  hint: '≈ 2.20 al inicio' },
      { label: 'Loss (CE)', value: '1.9812', color: '#fbbf24',  hint: '≈ 2.20 al inicio' },
      { label: 'Loss (CE)', value: '7342.00', color: 'gray.300', hint: '≈ 2.20 al inicio' },
    ]}
  />
)
StatsPanelConColores.storyName = 'StatsPanel — colores y hint'
