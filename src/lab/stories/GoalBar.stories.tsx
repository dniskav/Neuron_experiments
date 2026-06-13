import { Flex } from '@chakra-ui/react'
import { GoalBar } from '../components/GoalBar'

export default { title: 'Lab Components' }

export const GoalBarVariants = () => (
  <Flex direction="column" gap={4} maxW="400px">
    <GoalBar
      label="META — promedio > 600 pasos sin chocar"
      current={0}
      target={600}
      valueLabel="0 pasos"
    />
    <GoalBar
      label="META — promedio > 600 pasos sin chocar"
      current={320}
      target={600}
      valueLabel="320 pasos"
    />
    <GoalBar
      label="META — promedio > 600 pasos sin chocar"
      current={600}
      target={600}
      valueLabel="600 pasos"
      solved
    />
    <GoalBar
      label="META — ir adelante > 70 % del tiempo"
      current={85}
      target={70}
      valueLabel="85 %"
      solved
    />
  </Flex>
)
GoalBarVariants.storyName = 'GoalBar — estados'
