import { Box, Text } from '@chakra-ui/react'
import { ExperimentLayout } from '../components/ExperimentLayout'
import { ConfigBox }        from '../components/ConfigBox'
import { StatsPanel }       from '../components/StatsPanel'
import { ControlBar }       from '../components/ControlBar'
import { GoalBar }          from '../components/GoalBar'
import { ExplainPanel }     from '../components/ExplainPanel'

export default { title: 'Lab Components' }

// Canvas simulado
function MockCanvas() {
  return (
    <Box
      w="360px" h="280px"
      bg="#1e293b"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="xl"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="gray.600" fontSize="sm">canvas del experimento</Text>
    </Box>
  )
}

export const ExperimentLayoutCompleto = () => (
  <ExperimentLayout
    left={<>
      <MockCanvas />
      <ControlBar
        running={false}
        onStart={() => {}}
        onPause={() => {}}
        onReset={() => {}}
        inferenceButtons={[
          { label: '▷ Un paso',  colorPalette: 'teal',  onClick: () => {} },
          { label: '⚡ Resolver', colorPalette: 'green', onClick: () => {} },
        ]}
      />
      <StatsPanel
        label="ENTRENAMIENTO"
        metrics={[
          { label: 'Pasos',     value: '4,512' },
          { label: 'Loss (CE)', value: '1.8234', color: '#fbbf24', hint: '≈ 2.20 al inicio' },
        ]}
      />
    </>}
    right={<>
      <ConfigBox label="DIFICULTAD">
        <Text color="gray.400" fontSize="sm">Fácil (51 pistas)</Text>
      </ConfigBox>
      <GoalBar
        label="META — loss &lt; 1.0"
        current={0.4}
        target={1.2}
        valueLabel="1.82"
      />
      <ExplainPanel
        sections={[
          { title: 'Self-attention', body: 'Cada celda mira a todas las demás para decidir qué dígito encaja.' },
          { title: 'Mapa de atención', body: 'Visualiza qué celdas se prestan atención mutuamente.' },
        ]}
      />
    </>}
  />
)
ExperimentLayoutCompleto.storyName = 'ExperimentLayout — completo'
