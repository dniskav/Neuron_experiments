// ─── Nivel 3: RL con memoria ──────────────────────────────────────────────────

import { Box, Flex, Heading, Separator, Text } from "@chakra-ui/react";
import { DetectorLaberinto } from "../cards/LaberintoCard";
import { DetectorArquitecto } from "../cards/ArquitectoCard";

export function RLMemoriaPage() {
  return (
    <Box minH="100vh" bg="gray.50">

      {/* Intro */}
      <Box py={10} px={6} textAlign="center">
        <Heading size="2xl" color="gray.800" mb={2}>RL con memoria</Heading>
        <Text color="gray.500" fontSize="md" maxW="540px" mx="auto">
          Cuando el entorno no es suficiente — el agente necesita recordar el pasado
          para tomar decisiones. LSTM, BPTT y TD(λ) para navegar laberintos
          sin repetir callejones ya explorados.
        </Text>
      </Box>

      {/* Laberinto demo */}
      <Box px={6} pb={10}>
        <Flex wrap="wrap" gap={8} justify="center" align="flex-start">
          <DetectorLaberinto />
        </Flex>
      </Box>

      {/* Arquitecto — Laberinto LSTM */}
      <Separator />
      <Box py={14} px={6} bg="#0f172a">
        <Box textAlign="center" mb={10}>
          <Heading size="xl" color="white" mb={2}>🧪 Arquitecto — Laberinto LSTM</Heading>
          <Text color="gray.400" fontSize="md" maxW="520px" mx="auto">
            Configura el tamaño del LSTM y las capas densas. El agente aprende
            a memorizar qué bifurcaciones ya exploró con BPTT sobre el episodio completo.
          </Text>
        </Box>
        <Flex justify="center">
          <DetectorArquitecto problemIds={["maze"]} />
        </Flex>
      </Box>

    </Box>
  );
}
