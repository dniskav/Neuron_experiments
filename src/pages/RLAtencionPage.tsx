// ─── Nivel 4: RL con atención ──────────────────────────────────────────────────

import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { DetectorLaberintoTransformer } from "../cards/LaberintoTransformerCard";

export function RLAtencionPage() {
  return (
    <Box minH="100vh" bg="gray.50">

      <Box py={10} px={6} textAlign="center">
        <Heading size="2xl" color="gray.800" mb={2}>RL con atención</Heading>
        <Text color="gray.500" fontSize="md" maxW="560px" mx="auto">
          En vez de comprimir el pasado en un vector oculto, el agente mantiene
          una ventana de los últimos N pasos y aprende a prestar atención
          a los momentos más relevantes para decidir ahora.
        </Text>
      </Box>

      <Box px={6} pb={16}>
        <Flex wrap="wrap" gap={8} justify="center" align="flex-start">
          <DetectorLaberintoTransformer />
        </Flex>
      </Box>

    </Box>
  );
}
