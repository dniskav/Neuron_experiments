import { useState } from 'react'
import { Flex, Text } from '@chakra-ui/react'
import { SpeedSelector, TRAIN_SPEED_OPTIONS, TEST_SPEED_OPTIONS } from '../components/SpeedSelector'

export default { title: 'Lab Components' }

export const SpeedSelectorEntrenamiento = () => {
  const [speed, setSpeed] = useState(1)
  return (
    <Flex direction="column" gap={3} maxW="300px">
      <SpeedSelector
        options={TRAIN_SPEED_OPTIONS}
        value={speed}
        onChange={setSpeed}
        colorPalette="violet"
      />
      <Text fontSize="11px" color="gray.500">velocidad: {speed}×</Text>
    </Flex>
  )
}
SpeedSelectorEntrenamiento.storyName = 'SpeedSelector — entrenamiento'

export const SpeedSelectorPrueba = () => {
  const [speed, setSpeed] = useState(1)
  return (
    <Flex direction="column" gap={3} maxW="300px">
      <SpeedSelector
        options={TEST_SPEED_OPTIONS}
        value={speed}
        onChange={setSpeed}
        colorPalette="teal"
      />
      <Text fontSize="11px" color="gray.500">velocidad: {speed}×</Text>
    </Flex>
  )
}
SpeedSelectorPrueba.storyName = 'SpeedSelector — prueba / teal'
