import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import type { PredictionHeatmapProps } from "./types";

function colorDesdeConfianza(confianza: number, esPositivo: boolean): string {
  const i = Math.round(confianza * 200);
  return esPositivo ? `rgb(0, ${i + 55}, 80)` : `rgb(${i + 55}, 0, 80)`;
}

export function PredictionHeatmap({
  mapa,
  edadesRange,
  etiquetaPositivo,
  etiquetaNegativo,
}: PredictionHeatmapProps) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.400" mb={2}>
        Predicciones · edad {edadesRange[0]} → {edadesRange[1]}
      </Text>
      <Flex gap="3px" flexWrap="wrap">
        {mapa.map(({ edad, confianza, esPositivo }) => (
          <Box
            key={edad}
            title={`Edad ${edad}: ${(confianza * 100).toFixed(1)}%`}
            w="24px"
            h="32px"
            borderRadius="4px"
            display="flex"
            alignItems="flex-end"
            justifyContent="center"
            pb="2px"
            cursor="default"
            style={{ background: colorDesdeConfianza(confianza, esPositivo), transition: "background 0.4s ease" }}
          >
            <Text as="span" fontSize="8px" color="rgba(255,255,255,0.7)">{edad}</Text>
          </Box>
        ))}
      </Flex>
      <HStack gap={4} fontSize="xs" mt={2} color="gray.500">
        <Text as="span" style={{ color: "#b00050" }}>■ {etiquetaNegativo}</Text>
        <Text as="span" style={{ color: "#007740" }}>■ {etiquetaPositivo}</Text>
      </HStack>
    </Box>
  );
}
