import { Badge, Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { BodyText, TableCell } from "../../components/lib";
import type { NormalizationBoxProps } from "./types";

export function NormalizationBox({
  normalizar,
  toggleNormalizar,
  umbral,
  media,
  std,
  umbralNorm,
  edades,
}: NormalizationBoxProps) {
  const [explicacion, setExplicacion] = useState(false);
  const minEdad = Math.min(...edades);
  const maxEdad = Math.max(...edades);
  const umbralMinMax = ((umbral - minEdad) / (maxEdad - minEdad)).toFixed(3);

  return (
    <Box
      border="1.5px solid"
      borderColor={normalizar ? "violet.400" : "gray.200"}
      borderRadius="xl"
      p={4}
      display="flex"
      flexDirection="column"
      gap={3}
      style={{ transition: "border-color 0.3s" }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <HStack gap={2}>
          <Text fontSize="sm" color="gray.700" fontWeight={500}>Normalizar entradas (z-score)</Text>
          <Badge colorPalette={normalizar ? "violet" : "gray"} variant="subtle" borderRadius="full">
            {normalizar ? "activo" : "inactivo"}
          </Badge>
        </HStack>
        <Button
          size="sm"
          variant={normalizar ? "outline" : "solid"}
          colorPalette={normalizar ? "gray" : "violet"}
          onClick={toggleNormalizar}
        >
          {normalizar ? "Desactivar" : "Activar"}
        </Button>
      </Flex>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExplicacion((p) => !p)}
        alignSelf="flex-start"
        color="violet.500"
        fontSize="xs"
        px={0}
      >
        {explicacion ? "▲ ocultar explicación" : "▼ ¿por qué importa esto?"}
      </Button>

      {explicacion && (
        <Box bg="gray.50" borderRadius="md" p={3} display="flex" flexDirection="column" gap={2}>
          <BodyText>
            <strong>Z-score</strong> transforma cada edad restando la media y dividiendo por la desviación estándar:
          </BodyText>
          <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden" mb={1}>
            <Flex bg="white" borderBottom="1px solid" borderColor="gray.100">
              <TableCell fontFamily="monospace">
                z = (edad − {media.toFixed(1)}) / {std.toFixed(1)}
              </TableCell>
            </Flex>
          </Box>
          <BodyText>
            El resultado tiene <strong>media = 0</strong> y <strong>desviación estándar = 1</strong>.
            El umbral <code>{umbral}</code> queda en <code>{umbralNorm}</code>, que es negativo porque está
            por debajo de la media de los datos (<code>{media.toFixed(1)}</code>).
            Esto coloca el umbral <em>simétricamente</em> respecto al centro, lo que equilibra los gradientes
            de los ejemplos positivos y negativos durante el entrenamiento.
          </BodyText>
          <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
            <Flex bg="#fef2f2" borderBottom="1px solid" borderColor="gray.100">
              <TableCell>Sin normalizar</TableCell>
              <TableCell>umbral en <code>{umbral}</code></TableCell>
              <TableCell color="red.500">pesos enormes · millones de épocas</TableCell>
            </Flex>
            <Flex bg="#fffbeb" borderBottom="1px solid" borderColor="gray.100">
              <TableCell>÷ umbral</TableCell>
              <TableCell>umbral en <code>1.00</code></TableCell>
              <TableCell color="yellow.600">pesos medianos · miles de épocas</TableCell>
            </Flex>
            <Flex bg="#fefce8" borderBottom="1px solid" borderColor="gray.100">
              <TableCell>min-max</TableCell>
              <TableCell>umbral en <code>{umbralMinMax}</code></TableCell>
              <TableCell color="yellow.700">resolución uniforme · aún asimétrico</TableCell>
            </Flex>
            <Flex bg="#f0fdf4">
              <TableCell>z-score (este caso)</TableCell>
              <TableCell>umbral en <code>{umbralNorm}</code></TableCell>
              <TableCell color="green.600">centrado · gradientes equilibrados</TableCell>
            </Flex>
          </Box>
          <Text fontSize="xs" color="gray.400" fontStyle="italic">
            Z-score es el estándar en redes neuronales reales porque hace que el umbral quede cerca del 0,
            donde el gradiente del sigmoid es máximo y el aprendizaje es más eficiente.
          </Text>
        </Box>
      )}
    </Box>
  );
}
