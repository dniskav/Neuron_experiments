// ─── Nivel 2: RL con red feedforward ─────────────────────────────────────────

import { Box, Flex, Heading, Separator, Text } from "@chakra-ui/react";
import { DetectorAngryBird } from "../cards/AngryBirdCard";
import { DetectorCañon }     from "../cards/CañonCard";
import { DetectorArkanoid }  from "../cards/ArkanoidCard";
import { DetectorArquitecto } from "../cards/ArquitectoCard";

export function ExperimentosPage() {
  return (
    <Box minH="100vh" bg="gray.50">

      {/* Intro */}
      <Box py={10} px={6} textAlign="center">
        <Heading size="2xl" color="gray.800" mb={2}>RL con red feedforward</Heading>
        <Text color="gray.500" fontSize="md" maxW="540px" mx="auto">
          Redes densas que aprenden de recompensas, no de datos etiquetados.
          Física, trayectorias y Q-learning — el agente genera su propio dataset
          explorando el entorno.
        </Text>
      </Box>

      {/* Cards de agentes */}
      <Box px={6} pb={10}>
        <Flex wrap="wrap" gap={8} justify="center" align="flex-start">
          <DetectorAngryBird />
          <DetectorCañon />
          <DetectorArkanoid />
        </Flex>
      </Box>

      {/* Arquitecto — Snake DQN */}
      <Separator />
      <Box py={14} px={6} bg="#0f172a">
        <Box textAlign="center" mb={10}>
          <Heading size="xl" color="white" mb={2}>🧪 Arquitecto — Snake DQN</Heading>
          <Text color="gray.400" fontSize="md" maxW="520px" mx="auto">
            Diseña la arquitectura de la red que controla la serpiente.
            Q-learning con replay buffer — construye la red, observa cómo aprende.
          </Text>
        </Box>
        <Flex justify="center">
          <DetectorArquitecto problemIds={["snake"]} />
        </Flex>
      </Box>

    </Box>
  );
}
