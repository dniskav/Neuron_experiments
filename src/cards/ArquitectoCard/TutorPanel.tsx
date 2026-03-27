// ─── TutorPanel ───────────────────────────────────────────────────────────────
//
// Panel visual del tutor: muestra el mensaje actual con icono, título y cuerpo.
// El color varía según la gravedad del mensaje.
//

import { Box, Flex, Text } from "@chakra-ui/react";
import type { TutorMessage, TutorType } from "./useTutor";

const STYLE: Record<TutorType, { bg: string; border: string; titleColor: string }> = {
  critical: { bg: "#fef2f2", border: "#fca5a5", titleColor: "#991b1b" },
  warning:  { bg: "#fffbeb", border: "#fcd34d", titleColor: "#92400e" },
  tip:      { bg: "#eff6ff", border: "#93c5fd", titleColor: "#1e40af" },
  success:  { bg: "#f0fdf4", border: "#86efac", titleColor: "#14532d" },
};

interface Props {
  message: TutorMessage;
}

export function TutorPanel({ message }: Props) {
  const s = STYLE[message.type];

  return (
    <Box
      bg={s.bg}
      border="1.5px solid"
      borderColor={s.border}
      borderRadius="xl"
      p={4}
      position="relative"
    >
      {/* Icono + título */}
      <Flex align="center" gap={2} mb={2}>
        <Text fontSize="18px" lineHeight={1}>{message.icon}</Text>
        <Text fontSize="13px" fontWeight={700} color={s.titleColor} lineHeight={1.3}>
          {message.title}
        </Text>
      </Flex>

      {/* Cuerpo explicativo */}
      <Text fontSize="12px" color="gray.600" lineHeight={1.7}>
        {message.body}
      </Text>
    </Box>
  );
}
