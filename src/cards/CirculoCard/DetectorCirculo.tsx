import { useCallback } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
} from "@chakra-ui/react";
import { StatItem, CardRoot, DetailsBox, BodyText, NetworkDiagram } from "../../components/lib";
import { Canvas } from "@react-three/fiber";
import { CirculoScene, W, H } from "./CirculoScene";
import { useCirculoTraining } from "./useCirculoTraining";
import { useCirculoDrag } from "./useCirculoDrag";

const N_OCULTAS = 24;

export function DetectorCirculo() {
  const training = useCirculoTraining();
  const { activationsRef } = training;

  const handleDrop = useCallback((cx: number, cy: number, radio: number) => {
    training.resetear(cx, cy, radio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drag = useCirculoDrag(handleDrop);

  const pct    = training.correcto !== null ? (training.correcto * 100).toFixed(1) : "—";
  const errStr = training.error    !== null ? training.error.toFixed(4) : "—";

  return (
    <CardRoot maxW="380px" w="100%">
      <Heading size="md" color="gray.800">Red de 2 capas · Clasificador de círculo</Heading>

      <Text fontSize="sm" color="gray.600" lineHeight={1.5}>
        Una sola neurona no puede aprender a separar puntos dentro y fuera de un círculo
        porque la frontera es curva. La red usa una{" "}
        <strong>capa oculta de {N_OCULTAS} neuronas</strong> para aprender la forma.
        Puedes <strong>arrastrar el círculo</strong> o <strong>redimensionarlo</strong>{" "}
        desde su borde — la red olvidará lo aprendido y empezará de cero.
      </Text>

      <Flex alignItems="center" flexWrap="wrap" gap={1} fontSize="xs">
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>Entradas: x, y</Box>
        <Text as="span" color="gray.400">→</Text>
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>Capa oculta: {N_OCULTAS} neuronas</Box>
        <Text as="span" color="gray.400">→</Text>
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>Salida: 1 neurona</Box>
        <Text as="span" color="gray.400">→</Text>
        <Box as="span" bg="gray.100" borderRadius="md" px={2} py="2px" color="gray.700" fontWeight={600}>dentro / fuera</Box>
      </Flex>

      <NetworkDiagram
        layers={[
          { size: 2 },
          { size: N_OCULTAS, activation: "relu" },
          { size: 1, activation: "sigmoid" },
        ]}
        optimizer="Momentum β=0.9"
        activationsRef={activationsRef}
      />

      {/* Canvas principal */}
      <Box
        ref={drag.containerRef}
        alignSelf="center"
        borderRadius="lg"
        border="2px solid"
        borderColor="gray.200"
        overflow="hidden"
        style={{ cursor: drag.cursor, width: W, height: H }}
        onMouseDown={drag.handleMouseDown}
        onMouseMove={drag.handleMouseMove}
        onMouseUp={drag.handleMouseUp}
        onMouseLeave={drag.handleMouseUp}
      >
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
          style={{ width: W, height: H, display: "block" }}
        >
          <CirculoScene
            redRef={training.redRef}
            puntosRef={training.puntosRef}
            circuloRef={drag.circuloRef}
          />
        </Canvas>
      </Box>

      <Flex gap={3} fontSize="xs" flexWrap="wrap" color="gray.500">
        <Text as="span" color="#10b981">● dentro</Text>
        <Box as="span" color="#1e1e2e" bg="gray.300" borderRadius="sm" px={1}>● fuera</Box>
        <Text as="span" color="gray.400">― borde real</Text>
        <Text as="span" color="violet.500">● handle redimensión</Text>
      </Flex>

      <HStack gap={4} fontSize="xs" color="gray.500" fontFamily="monospace">
        <Text as="span">Centro: ({drag.circulo.cx.toFixed(2)}, {drag.circulo.cy.toFixed(2)})</Text>
        <Text as="span">Radio: {drag.circulo.radio.toFixed(2)}</Text>
      </HStack>

      <HStack gap={2} flexWrap="wrap">
        <StatItem label="Épocas"    value={String(training.epocas)} />
        <StatItem label="Error MSE" value={errStr} />
        <StatItem label="Precisión" value={`${pct}%`} highlight={training.correcto !== null && training.correcto >= 0.9} />
      </HStack>

      <HStack gap={2}>
        {!training.entrenando ? (
          <Button flex={1} colorPalette="green" onClick={training.iniciarEntrenamiento}>
            ▶ Entrenar
          </Button>
        ) : (
          <Button flex={1} colorPalette="yellow" onClick={training.pausarEntrenamiento}>
            ⏸ Pausar
          </Button>
        )}
        <Button
          flex={1}
          colorPalette="violet"
          disabled={training.entrenando}
          onClick={training.pasoUnico}
        >
          1 época
        </Button>
        <Button flex={1} variant="outline" onClick={() => {
          drag.resetCirculo();
          training.resetear(0, 0, drag.circuloRef.current.radio);
        }}>
          ↺ Resetear
        </Button>
      </HStack>

      <DetailsBox summary="Activaciones y optimizador">
        <BodyText><strong>Capas ocultas · relu:</strong> evita la saturación de sigmoid para entradas grandes — los gradientes no se aplanan y el entrenamiento avanza más rápido.</BodyText>
        <BodyText><strong>Salida · sigmoid:</strong> mapea la predicción a [0, 1], interpretable directamente como probabilidad de estar dentro del círculo.</BodyText>
        <BodyText><strong>Momentum (β=0.9):</strong> acumula velocidad en la dirección del gradiente. Reduce oscilaciones y converge más rápido que SGD puro sin necesitar un lr tan pequeño como Adam.</BodyText>
      </DetailsBox>

      <DetailsBox summary="¿Cómo aprende la red? (backpropagation)">
        <BodyText><strong>1. Forward pass:</strong> el punto (x, y) entra a la red. Cada neurona oculta calcula una combinación de x e y, pasa el resultado por sigmoid y produce un número entre 0 y 1. La neurona de salida combina las {N_OCULTAS} salidas y da la predicción final.</BodyText>
        <BodyText><strong>2. Error:</strong> comparamos la predicción con la respuesta correcta (1 = dentro, 0 = fuera).</BodyText>
        <BodyText><strong>3. Backpropagation:</strong> propagamos el error hacia atrás usando la regla de la cadena. Primero ajustamos los pesos de salida, luego los de la capa oculta.</BodyText>
        <BodyText><strong>4. Repetir:</strong> el mapa de colores muestra en tiempo real cómo evoluciona la frontera de decisión.</BodyText>
      </DetailsBox>
    </CardRoot>
  );
}
