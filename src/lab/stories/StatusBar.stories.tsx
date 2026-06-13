import { Flex } from '@chakra-ui/react'
import { StatusBar } from '../components/StatusBar'

export default { title: 'Lab Components' }

export const StatusBarVariants = () => (
  <Flex direction="column" gap={3} maxW="400px">
    <StatusBar text="Sin inferencia aún"               variant="neutral" />
    <StatusBar text="Iteración 4 / 20"                 variant="neutral" />
    <StatusBar text="✓ Resuelto en 3 pasos"            variant="success" />
    <StatusBar text="✗ Divergencia detectada — reset"  variant="error"   />
  </Flex>
)
StatusBarVariants.storyName = 'StatusBar — variantes'
