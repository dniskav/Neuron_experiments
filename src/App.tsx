import { Box, Flex, Heading, Text, Separator } from "@chakra-ui/react";
import { DetectorNeuron } from "./cards/NeuronCard";
import { DetectorColor }  from "./cards/ColorCard";
import { DetectorCirculo } from "./cards/CirculoCard";
import { DetectorAngryBird } from "./cards/AngryBirdCard";
import { DetectorCañon } from "./cards/CañonCard";
import { DetectorLaberinto } from "./cards/LaberintoCard";
import { DetectorArkanoid }   from "./cards/ArkanoidCard";
import { DetectorArquitecto } from "./cards/ArquitectoCard";
import datosMayor   from "./data/datos.json";
import datosAnciano from "./data/datos_anciano.json";

const EDADES_MAYOR   = Array.from({ length: 30 }, (_, i) => i + 1);
const EDADES_ANCIANO = Array.from({ length: 30 }, (_, i) => i + 40);

export default function App() {
  return (
    <Box minH="100vh" bg="gray.50" py={10} px={6}>
      <Box mb={10} textAlign="center">
        <Heading size="3xl" color="gray.800" mb={2}>Neuron Lab</Heading>
        <Text color="gray.500" fontSize="md">Experimentos interactivos de redes neuronales</Text>
      </Box>

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
        <DetectorAngryBird />
        <DetectorCañon />
        <DetectorLaberinto />
        <DetectorArkanoid />
      </Flex>

      {/* ── Sección: Arquitecto de Redes ─────────────────────────────────── */}
      <Separator mt={12} />
      <Box py={14} px={6} bg="#0f172a">
        <Box textAlign="center" mb={10}>
          <Heading size="2xl" color="white" mb={2}>🧪 Arquitecto de Redes</Heading>
          <Text color="gray.400" fontSize="md">
            Construye tu propia red neuronal y resuelve problemas de clasificación 2D.
            Añade capas, elige activaciones y ve la frontera de decisión en tiempo real.
          </Text>
        </Box>
        <Flex justify="center" px={4}>
          <DetectorArquitecto />
        </Flex>
      </Box>
    </Box>
  );
}
