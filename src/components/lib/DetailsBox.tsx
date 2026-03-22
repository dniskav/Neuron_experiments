import { Box, Text } from "@chakra-ui/react";
import type { DetailsBoxProps } from "./types";

/**
 * Collapsible explanation block using native <details>/<summary>
 * with Chakra styling. Used across CañonCard, AngryBirdCard, CirculoCard.
 */
export function DetailsBox({ summary, children }: DetailsBoxProps) {
  return (
    <Box
      as="details"
      bg="gray.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      px={3}
      py={2}
    >
      <Text
        as="summary"
        fontSize="xs"
        fontWeight={600}
        color="gray.700"
        cursor="pointer"
      >
        {summary}
      </Text>
      <Box display="flex" flexDirection="column" gap={2} mt={2}>
        {children}
      </Box>
    </Box>
  );
}
