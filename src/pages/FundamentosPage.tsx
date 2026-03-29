// ─── Nivel 1: Clasificación 2D ────────────────────────────────────────────────

import { Box, Flex, Heading, Separator, Text } from "@chakra-ui/react";
import { DetectorNeuron }   from "../cards/NeuronCard";
import { DetectorColor }    from "../cards/ColorCard";
import { DetectorCirculo }  from "../cards/CirculoCard";
import { DetectorArquitecto, CurriculumArquitecto } from "../cards/ArquitectoCard";
import datosMayor   from "../data/datos.json";
import datosAnciano from "../data/datos_anciano.json";

const EDADES_MAYOR   = Array.from({ length: 30 }, (_, i) => i + 1);
const EDADES_ANCIANO = Array.from({ length: 30 }, (_, i) => i + 40);

const CLASSIFICATION_PROBLEMS = ["diagonal", "nubes", "fiesta", "circulo", "espiral"];

export function FundamentosPage() {
  return (
    <Box minH="100vh" bg="gray.50">

      {/* Intro */}
      <Box py={10} px={6} textAlign="center">
        <Heading size="2xl" color="gray.800" mb={2}>Clasificación 2D</Heading>
        <Text color="gray.500" fontSize="md" maxW="540px" mx="auto">
          Una neurona, un peso, un sesgo. Cómo una red mínima aprende a separar datos
          con backpropagation — desde un umbral de edad hasta fronteras de decisión no lineales.
        </Text>
      </Box>

      {/* Cards básicas */}
      <Box px={6} pb={10}>
        <Flex wrap="wrap" gap={8} justify="center" align="flex-start">
          <DetectorNeuron
            titulo="Mayoría de edad · umbral: 18"
            umbral={18}
            datos={datosMayor as [number, number][]}
            edadesVisualizacion={EDADES_MAYOR}
            etiquetaPositivo="Mayor de edad"
            etiquetaNegativo="Menor de edad"
            colorPositivo={{ fondo: "#d1fae5", barra: "#10b981", texto: "#065f46" }}
            colorNegativo={{ fondo: "#fee2e2", barra: "#ef4444", texto: "#991b1b" }}
          />
          <DetectorNeuron
            titulo="Ancianidad · umbral: 60"
            umbral={60}
            datos={datosAnciano as [number, number][]}
            edadesVisualizacion={EDADES_ANCIANO}
            etiquetaPositivo="Anciano"
            etiquetaNegativo="No anciano"
            colorPositivo={{ fondo: "#ede9fe", barra: "#8b5cf6", texto: "#4c1d95" }}
            colorNegativo={{ fondo: "#fef3c7", barra: "#f59e0b", texto: "#78350f" }}
          />
          <DetectorColor />
          <DetectorCirculo />
        </Flex>
      </Box>

      {/* Modo currículum guiado */}
      <Separator />
      <Box py={14} px={6} bg="#0f172a">
        <Box textAlign="center" mb={10}>
          <Heading size="xl" color="white" mb={2}>🎓 Aprende construyendo</Heading>
          <Text color="gray.400" fontSize="md" maxW="540px" mx="auto">
            4 niveles progresivos. En cada uno tienes una arquitectura restringida
            y una meta de precisión que alcanzar. Cuando la logras, se desbloquea
            el siguiente bloque de construcción.
          </Text>
        </Box>
        <Flex justify="center">
          <CurriculumArquitecto />
        </Flex>
      </Box>

      {/* Arquitecto libre — solo problemas de clasificación */}
      <Separator />
      <Box py={14} px={6} bg="gray.50">
        <Box textAlign="center" mb={10}>
          <Heading size="xl" color="gray.800" mb={2}>🧪 Arquitecto libre</Heading>
          <Text color="gray.500" fontSize="md" maxW="520px" mx="auto">
            Sin restricciones. Construye cualquier arquitectura y ve la frontera de
            decisión en tiempo real. Experimenta con capas, activaciones y optimizadores.
          </Text>
        </Box>
        <Flex justify="center">
          <DetectorArquitecto problemIds={CLASSIFICATION_PROBLEMS} />
        </Flex>
      </Box>

    </Box>
  );
}
