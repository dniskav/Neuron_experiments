import { useState } from "react";
import { Box, Button, Flex, HStack, Heading, Input, Text, VStack } from "@chakra-ui/react";
import { CardRoot, SectionLabel, TrainingControls, WeightsDisplay } from "../../components/lib";
import { useNeuronTraining } from "./useNeuronTraining";
import { NormalizationBox } from "./NormalizationBox";
import { PredictionHeatmap } from "./PredictionHeatmap";
import type { DetectorNeuronProps } from "./types";

export function DetectorNeuron({
  titulo,
  umbral,
  datos,
  edadesVisualizacion,
  colorPositivo,
  colorNegativo,
  etiquetaPositivo,
  etiquetaNegativo,
}: DetectorNeuronProps) {
  const {
    neurona,
    epocas,
    setEpocas,
    totalEpocas,
    cargadoDeMemoria,
    entrenando,
    normalizar,
    train,
    reiniciar,
    toggleNormalizar,
    media,
    std,
    escalar,
    umbralNorm,
  } = useNeuronTraining({ titulo, umbral, datos });

  const [edad, setEdad] = useState<string>("");
  const [prediccion, setPrediccion] = useState<{ confianza: number; esPositivo: boolean } | null>(null);

  const edades = datos.map(([e]) => e);

  const mapa = edadesVisualizacion.map((e) => {
    const c = neurona.predict(escalar(e));
    return { edad: e, confianza: c, esPositivo: c > 0.5 };
  });

  const handleReiniciar = () => {
    reiniciar();
    setPrediccion(null);
    setEdad("");
  };

  const predict = () => {
    const num = Number(edad);
    if (isNaN(num) || edad === "") return;
    const confianza = neurona.predict(escalar(num));
    setPrediccion({ confianza, esPositivo: confianza > 0.5 });
  };

  const handleTrain = () => {
    setPrediccion(null);
    train();
  };

  const porcentaje = prediccion ? (prediccion.confianza * 100).toFixed(1) : null;
  const estaVirgen = totalEpocas === 0;

  return (
    <CardRoot w="420px" p={7} gap={6}>
      {/* ENCABEZADO */}
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Heading size="md" color="gray.800">{titulo}</Heading>
          <Text fontSize="xs" color="gray.400" mt={1}>
            {estaVirgen
              ? "Sin train — pesos aleatorios"
              : `${totalEpocas.toLocaleString()} épocas${cargadoDeMemoria ? " · 💾 cargado" : ""}`}
          </Text>
        </Box>
        <Button variant="outline" size="sm" onClick={handleReiniciar}>Reiniciar</Button>
      </Flex>

      {/* PESOS */}
      <WeightsDisplay weights={[
        { label: "peso", value: neurona.weight },
        { label: "sesgo", value: neurona.bias },
      ]} />

      {/* NORMALIZACIÓN */}
      <NormalizationBox
        normalizar={normalizar}
        toggleNormalizar={toggleNormalizar}
        umbral={umbral}
        media={media}
        std={std}
        umbralNorm={umbralNorm}
        edades={edades}
      />

      {/* MAPA DE CALOR */}
      <PredictionHeatmap
        mapa={mapa}
        edadesRange={[edadesVisualizacion[0], edadesVisualizacion[edadesVisualizacion.length - 1]]}
        etiquetaPositivo={etiquetaPositivo}
        etiquetaNegativo={etiquetaNegativo}
      />

      {/* ENTRENAMIENTO */}
      <TrainingControls
        label="Entrenar neurona"
        epocas={epocas}
        setEpocas={setEpocas}
        onTrain={handleTrain}
        loading={entrenando}
      />

      {/* PREDICCIÓN */}
      <VStack align="stretch" gap={2}>
        <SectionLabel>Probar una edad</SectionLabel>
        <HStack gap={2}>
          <Input
            type="number"
            placeholder="Ej: 45"
            value={edad}
            onChange={(e) => { setEdad(e.target.value); setPrediccion(null); }}
            onKeyDown={(e) => e.key === "Enter" && predict()}
          />
          <Button colorPalette="violet" onClick={predict}>Predecir</Button>
        </HStack>

        {prediccion && (
          <Box
            borderRadius="xl"
            p={4}
            display="flex"
            flexDirection="column"
            gap={3}
            mt={1}
            style={{ background: prediccion.esPositivo ? colorPositivo.fondo : colorNegativo.fondo }}
          >
            <Text
              fontWeight={700}
              fontSize="lg"
              style={{ color: prediccion.esPositivo ? colorPositivo.texto : colorNegativo.texto }}
            >
              {prediccion.esPositivo ? etiquetaPositivo : etiquetaNegativo}
            </Text>
            <Box bg="gray.200" borderRadius="full" h="8px" overflow="hidden">
              <Box
                h="100%"
                borderRadius="full"
                style={{
                  width: `${porcentaje}%`,
                  background: prediccion.esPositivo ? colorPositivo.barra : colorNegativo.barra,
                  transition: "width 0.4s ease",
                }}
              />
            </Box>
            <Text fontSize="sm" color="gray.600">Confianza: {porcentaje}%</Text>
          </Box>
        )}
      </VStack>
    </CardRoot>
  );
}
