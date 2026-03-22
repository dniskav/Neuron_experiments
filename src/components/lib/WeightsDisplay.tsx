import { HStack, Text, VStack } from "@chakra-ui/react";
import type { WeightsDisplayProps } from "./types";

/**
 * Horizontal display of labeled weight/bias values in monospace.
 * Used by NeuronCard, ColorCard (any card showing raw neuron parameters).
 */
export function WeightsDisplay({ weights }: WeightsDisplayProps) {
  return (
    <HStack bg="gray.50" borderRadius="lg" p={4} gap={6}>
      {weights.map(({ label, value }) => (
        <VStack key={label} align="flex-start" gap={0}>
          <Text fontSize="xs" color="gray.400" textTransform="uppercase">{label}</Text>
          <Text fontSize="sm" fontFamily="monospace" color="gray.700">
            {isNaN(value) ? "error — reinicia" : value.toFixed(6)}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
}
