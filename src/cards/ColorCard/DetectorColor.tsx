import { useState, useEffect } from "react";
import { Box, Button, Flex, HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { CardRoot, SectionLabel, TrainingControls } from "../../components/lib";
import { clasificar, luminancia } from "../../data/datosColor";
import { PanelNeurona } from "./PanelNeurona";
import { useColorTraining } from "./useColorTraining";
import { hexToRgb, CLASE_ESTILO, limpiarFormatoViejo, MUESTRAS } from "./utils";
import { OutputRulesBox } from "./OutputRulesBox";
import { ColorSwatchGrid } from "./ColorSwatchGrid";
import { ColorDecisionCanvas } from "./ColorDecisionCanvas";

// Limpia datos del formato antiguo al cargar el módulo
limpiarFormatoViejo();

export function DetectorColor() {
  const {
    n1,
    n2,
    datos,
    epocas,
    setEpocas,
    totalEpocas,
    cargadoDeMemoria,
    entrenando,
    entrenar,
    reiniciar,
    muestras,
  } = useColorTraining();

  const [colorHex, setColorHex] = useState("#3b82f6");
  const [drawVersion, setDrawVersion] = useState(0);
  useEffect(() => { setDrawVersion(v => v + 1); }, [n1, n2]);

  const rgb      = hexToRgb(colorHex);
  const s1       = n1.predict(rgb);
  const s2       = n2.predict(rgb);
  const clase    = clasificar(s1, s2);
  const lumReal  = luminancia(rgb[0], rgb[1], rgb[2]);
  const claseReal = clasificar(lumReal > 0.65 ? 1 : 0, lumReal < 0.35 ? 1 : 0);

  const estiloClase = CLASE_ESTILO[clase];

  return (
    <CardRoot w="480px" p={7} gap={6}>
      {/* ENCABEZADO */}
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Heading size="md" color="gray.800">Claro / Neutro / Oscuro · 2 × NeuronN(3)</Heading>
          <Text fontSize="xs" color="gray.400" mt={1}>
            {totalEpocas === 0
              ? "Sin entrenar — pesos aleatorios"
              : `${totalEpocas.toLocaleString()} épocas · ${datos.length.toLocaleString()} colores${cargadoDeMemoria ? " · 💾 cargado" : ""}`}
          </Text>
        </Box>
        <Button variant="outline" size="sm" onClick={reiniciar}>Reiniciar</Button>
      </Flex>

      {/* PANELES NEURONAS */}
      <HStack gap={3} alignItems="stretch">
        <PanelNeurona titulo="N1 — ¿muy claro? (lum > 0.65)" neurona={n1} />
        <PanelNeurona titulo="N2 — ¿muy oscuro? (lum < 0.35)" neurona={n2} />
      </HStack>

      {/* REGLAS */}
      <OutputRulesBox />

      {/* FRONTERA DE DECISIÓN */}
      <ColorDecisionCanvas
        n1={n1}
        n2={n2}
        muestras={MUESTRAS}
        drawVersion={drawVersion}
      />

      {/* MUESTRAS */}
      <ColorSwatchGrid muestras={muestras} />

      {/* ENTRENAR */}
      <TrainingControls
        label="Entrenar ambas neuronas"
        epocas={epocas}
        setEpocas={setEpocas}
        onTrain={entrenar}
        loading={entrenando}
      />

      {/* PROBAR COLOR */}
      <VStack align="stretch" gap={2}>
        <SectionLabel>Probar un color</SectionLabel>
        <HStack gap={3} alignItems="stretch">
          <input
            type="color"
            value={colorHex}
            onChange={e => setColorHex(e.target.value)}
            style={{ width: 64, height: 64, border: "none", borderRadius: 10, cursor: "pointer", padding: 0 }}
          />
          <Box
            flex={1}
            borderRadius="lg"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap="4px"
            boxShadow="0 1px 4px rgba(0,0,0,0.12)"
            style={{ background: colorHex, transition: "background 0.2s ease" }}
          >
            <Text fontWeight={700} fontSize="lg" style={{ color: estiloClase.texto }}>
              {clase.toUpperCase()}
            </Text>
            <Text fontSize="xs" style={{ color: estiloClase.texto }}>
              N1: {(s1 * 100).toFixed(1)}%  ·  N2: {(s2 * 100).toFixed(1)}%
            </Text>
          </Box>
        </HStack>

        <Box
          borderRadius="lg"
          p={4}
          display="flex"
          flexDirection="column"
          gap={1}
          boxShadow="0 1px 4px rgba(0,0,0,0.12)"
          style={{ background: colorHex, transition: "background 0.2s ease" }}
        >
          <Text fontSize="sm" color="black">Texto negro sobre este color</Text>
          <Text fontSize="sm" color="white">Texto blanco sobre este color</Text>
        </Box>

        <Box bg="gray.50" borderRadius="lg" p={4} display="flex" flexDirection="column" gap={2}>
          <Flex justifyContent="space-between" alignItems="center">
            <Text fontSize="xs" color="gray.400">Neurona predice</Text>
            <Text fontWeight={600} style={{ color: estiloClase.badge }}>{clase}</Text>
          </Flex>
          <Flex justifyContent="space-between" alignItems="center">
            <Text fontSize="xs" color="gray.400">Respuesta correcta</Text>
            <Text fontWeight={600} style={{ color: CLASE_ESTILO[claseReal].badge }}>
              {claseReal} (lum: {(lumReal * 100).toFixed(1)}%)
            </Text>
          </Flex>
          {clase !== claseReal && (
            <Box
              bg="red.100"
              color="red.800"
              borderRadius="md"
              px={2}
              py={1}
              fontSize="xs"
              alignSelf="flex-start"
              mt={1}
            >
              predicción incorrecta
            </Box>
          )}
        </Box>
      </VStack>
    </CardRoot>
  );
}
