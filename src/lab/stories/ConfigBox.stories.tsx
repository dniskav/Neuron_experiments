import { Text } from '@chakra-ui/react'
import { ConfigBox } from '../components/ConfigBox'

export default { title: 'Lab Components' }

export const ConfigBoxBasic = () => (
  <ConfigBox label="ARQUITECTURA">
    <Text color="gray.400" fontSize="sm">Contenido de configuración aquí</Text>
  </ConfigBox>
)
ConfigBoxBasic.storyName = 'ConfigBox — básico'

export const ConfigBoxDashed = () => (
  <ConfigBox label="PARÁMETROS" dashed>
    <Text color="gray.400" fontSize="sm">Sección editable (borde punteado)</Text>
  </ConfigBox>
)
ConfigBoxDashed.storyName = 'ConfigBox — dashed'

export const ConfigBoxSinLabel = () => (
  <ConfigBox>
    <Text color="gray.400" fontSize="sm">Sin etiqueta de sección</Text>
  </ConfigBox>
)
ConfigBoxSinLabel.storyName = 'ConfigBox — sin label'
