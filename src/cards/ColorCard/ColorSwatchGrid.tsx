import { Box, Flex, Text } from "@chakra-ui/react";
import { SectionLabel } from "../../components/lib";
import type { ColorSwatchGridProps } from "./types";

export function ColorSwatchGrid({ muestras }: ColorSwatchGridProps) {
  return (
    <Box>
      <SectionLabel mb={2}>Predicción en colores de referencia</SectionLabel>
      <Flex gap="6px" flexWrap="wrap">
        {muestras.map(m => {
          const textColor = m.clase === "claro" ? "#1e293b" : m.clase === "oscuro" ? "#f8fafc" : "#1e40af";
          return (
            <Box
              key={m.label}
              w="72px"
              h="50px"
              borderRadius="md"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap="1px"
              boxShadow="0 1px 3px rgba(0,0,0,0.15)"
              style={{ background: m.hex, transition: "all 0.4s ease" }}
            >
              <Text as="span" fontSize="9px" style={{ color: textColor }}>{m.label}</Text>
              <Text as="span" fontSize="xs" fontWeight={700} style={{ color: textColor }}>{m.clase}</Text>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
