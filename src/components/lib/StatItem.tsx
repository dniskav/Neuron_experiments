import { Box, Text, VStack } from "@chakra-ui/react";
import type { StatItemProps } from "./types";

/**
 * Reusable stat display: small uppercase label + prominent value.
 * Used across AngryBird, Cañon, Círculo (block) and Laberinto (compact) cards.
 */
export function StatItem({ label, value, highlight, variant = "block" }: StatItemProps) {
  if (variant === "compact") {
    return (
      <VStack gap={0} alignItems="center">
        <Text fontSize="10px" color="gray.400" textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Text>
        <Text as="strong" fontSize="sm" color="gray.800">{value}</Text>
      </VStack>
    );
  }

  return (
    <Box
      flex={1}
      minW="80px"
      bg={highlight ? "green.100" : "gray.50"}
      borderRadius="md"
      p={2}
      display="flex"
      flexDirection="column"
      gap="2px"
      border="1px solid"
      borderColor={highlight ? "green.300" : "gray.200"}
    >
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing={1}>
        {label}
      </Text>
      <Text fontSize="lg" fontWeight={700} color="gray.800">{value}</Text>
    </Box>
  );
}
