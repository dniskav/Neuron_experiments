// ─── DetectorArquitecto ───────────────────────────────────────────────────────
//
// Card interactiva: el usuario construye la arquitectura de una red neuronal
// para resolver el problema XOR "¿Voy a la fiesta?".
// La frontera de decisión se actualiza en tiempo real mientras entrena.
//

import { useMemo } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  NativeSelect,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { StatItem, CardRoot, DetailsBox, BodyText, NetworkDiagram } from "../../components/lib";
import type { ActivationType } from "../../components/lib";
import { DecisionCanvas, CANVAS_W } from "./DecisionCanvas";
import { LayerBuilder } from "./LayerBuilder";
import { useArquitectoTraining, type OptimizerType } from "./useArquitectoTraining";

const OPT_LABEL: Record<OptimizerType, string> = {
  sgd:      "SGD",
  momentum: "Momentum",
  adam:     "Adam",
};

export function DetectorArquitecto() {
  const t = useArquitectoTraining();

  // Capas para el NetworkDiagram (se actualiza live con la arquitectura)
  const networkLayers = useMemo(() => [
    { size: 2 },
    ...t.hiddenLayers.map(l => ({ size: l.neurons, activation: l.activation as ActivationType })),
    { size: 1, activation: "sigmoid" as ActivationType },
  ], [t.hiddenLayers]);

  // Hint / celebración
  const hint = useMemo(() => {
    if (t.accuracy !== null && t.accuracy >= 0.95)
      return { color: "green",  msg: "🎉 ¡Salvado! La red lo resolvió. ¡Voy a la fiesta!" };
    if (t.epochs >= 300 && t.hiddenLayers.length === 0 && (t.accuracy ?? 0) < 0.65)
      return { color: "orange", msg: "🤔 Una neurona sola no puede. Prueba añadiendo una capa oculta." };
    if (t.epochs >= 600 && t.hiddenLayers.length > 0 && (t.accuracy ?? 0) < 0.70)
      return { color: "blue",   msg: "🧠 Puede que necesites más neuronas o cambiar la activación." };
    return null;
  }, [t.accuracy, t.epochs, t.hiddenLayers.length]);

  const accuracyStr = t.accuracy !== null ? `${(t.accuracy * 100).toFixed(1)} %` : "—";
  const lossStr     = t.loss     !== null ? t.loss.toFixed(4) : "—";

  return (
    <CardRoot w="fit-content" alignItems="center">
      <Heading size="md" color="gray.800">Arquitecto de Redes · ¿Voy a la fiesta?</Heading>

      <Text fontSize="sm" color="gray.500" textAlign="center" maxW="460px">
        Construye tu propia red neuronal para resolver este problema. Añade capas, ajusta
        neuronas y elige activaciones hasta que la red lo resuelva.{" "}
        <em>¿Cuántas capas necesitas?</em>
      </Text>

      {/* ── Tabla de verdad (contexto narrativo) ─────────────────────────── */}
      <Box
        as="table"
        fontSize="12px"
        style={{ borderCollapse: "collapse" }}
        color="gray.700"
      >
        <thead>
          <Box as="tr">
            <Box as="th" p={2} />
            <Box as="th" p={2} fontWeight={600} color="gray.500">Novia ❌</Box>
            <Box as="th" p={2} fontWeight={600} color="gray.500">Novia ✅</Box>
          </Box>
        </thead>
        <tbody>
          {[
            ["Esposa ❌", "😴 Me quedo", "🕺 ¡Voy!"],
            ["Esposa ✅", "🕺 ¡Voy!",    "💀 Me matan"],
          ].map(([row, c1, c2]) => (
            <Box as="tr" key={row as string}>
              <Box as="td" p={2} fontWeight={600} color="gray.500" textAlign="right">{row}</Box>
              <Box as="td" p={2} textAlign="center" bg="gray.50" borderRadius="md">{c1}</Box>
              <Box as="td" p={2} textAlign="center" bg="gray.50" borderRadius="md">{c2}</Box>
            </Box>
          ))}
        </tbody>
      </Box>

      {/* ── Diagrama de red (live) ────────────────────────────────────────── */}
      <NetworkDiagram
        layers={networkLayers}
        optimizer={`${OPT_LABEL[t.optimizerType]} lr=${t.lr}`}
        activationsRef={t.activationsRef}
      />

      {/* ── Constructor de arquitectura ───────────────────────────────────── */}
      <Box
        w="100%"
        bg="gray.50"
        border="1px dashed"
        borderColor="gray.200"
        borderRadius="xl"
        p={3}
      >
        <Text fontSize="10px" color="gray.400" mb={2} textAlign="center" fontWeight={600} letterSpacing="wide">
          ARQUITECTURA — añade capas y ajusta neuronas
        </Text>
        <LayerBuilder
          hiddenLayers={t.hiddenLayers}
          onAdd={t.addLayer}
          onRemove={t.removeLayer}
          onUpdate={t.updateLayer}
        />
      </Box>

      {/* ── Controles globales ────────────────────────────────────────────── */}
      <Flex gap={2} flexWrap="wrap" justifyContent="center" alignItems="center">
        <Flex align="center" gap={1}>
          <Text fontSize="11px" color="gray.500">Opt:</Text>
          <NativeSelect.Root size="sm" w="auto">
            <NativeSelect.Field
              value={t.optimizerType}
              onChange={e => t.setOptimizerType(e.target.value as OptimizerType)}
              fontSize="12px"
            >
              <option value="adam">Adam</option>
              <option value="momentum">Momentum</option>
              <option value="sgd">SGD</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Flex>

        <Flex align="center" gap={1}>
          <Text fontSize="11px" color="gray.500">lr:</Text>
          <NativeSelect.Root size="sm" w="auto">
            <NativeSelect.Field
              value={t.lr}
              onChange={e => t.setLr(Number(e.target.value))}
              fontSize="12px"
            >
              {[0.1, 0.05, 0.01, 0.001].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Flex>

        <Flex align="center" gap={1}>
          <Text fontSize="11px" color="gray.500">vel:</Text>
          <NativeSelect.Root size="sm" w="auto">
            <NativeSelect.Field
              value={t.epf}
              onChange={e => t.setEpf(Number(e.target.value))}
              fontSize="12px"
            >
              {[1, 5, 20, 50, 100].map(v => (
                <option key={v} value={v}>{v} ép/frame</option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Flex>
      </Flex>

      {/* ── Canvas de frontera de decisión ───────────────────────────────── */}
      <Box position="relative">
        {/* Etiquetas de ejes */}
        <Flex justify="space-between" w={`${CANVAS_W}px`} mb="2px">
          <Text fontSize="9px" color="gray.400">↑ va la esposa</Text>
          <Text fontSize="9px" color="gray.400">va la novia →</Text>
        </Flex>
        <DecisionCanvas
          netRef={t.netRef}
          points={t.points}
          drawVersion={t.drawVersion}
        />
        {/* Leyenda debajo */}
        <Flex gap={3} mt="4px" justify="center">
          <Flex align="center" gap={1}>
            <Box w="10px" h="10px" borderRadius="full" bg="indigo.400" />
            <Text fontSize="10px" color="gray.500">🕺 voy</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w="10px" h="10px" borderRadius="full" bg="red.400" />
            <Text fontSize="10px" color="gray.500">😴💀 no voy</Text>
          </Flex>
        </Flex>
      </Box>

      {/* ── Hint / celebración ───────────────────────────────────────────── */}
      {hint && (
        <Badge
          colorPalette={hint.color}
          variant="subtle"
          borderRadius="lg"
          px={3} py={2}
          fontSize="12px"
          textAlign="center"
          whiteSpace="normal"
          maxW="400px"
        >
          {hint.msg}
        </Badge>
      )}

      {/* ── Métricas ─────────────────────────────────────────────────────── */}
      <SimpleGrid columns={3} gap={3} w="100%">
        <StatItem variant="compact" label="Épocas"    value={t.epochs} />
        <StatItem variant="compact" label="Loss"      value={lossStr} />
        <StatItem
          variant="compact"
          label="Precisión"
          value={accuracyStr}
          highlight={t.accuracy !== null && t.accuracy >= 0.95}
        />
      </SimpleGrid>

      {/* ── Botones ──────────────────────────────────────────────────────── */}
      <Flex gap={2} flexWrap="wrap" justifyContent="center">
        {!t.entrenando ? (
          <Button colorPalette="violet" size="sm" onClick={t.iniciar}>▶ Entrenar</Button>
        ) : (
          <Button colorPalette="orange" size="sm" onClick={t.pausar}>⏸ Pausar</Button>
        )}
        <Button variant="outline" size="sm" onClick={t.resetear}>↺ Reiniciar pesos</Button>
      </Flex>

      {/* ── Explicación ──────────────────────────────────────────────────── */}
      <DetailsBox summary="¿Por qué no funciona sin capas ocultas?">
        <BodyText>
          <strong>El problema XOR no es linealmente separable.</strong> Sin capas ocultas,
          la red solo puede trazar una línea recta. Pero los casos "voy" (🕺🕺) están
          en esquinas opuestas del cuadrado — ninguna línea recta los separa de los casos
          "no voy" (😴💀).
        </BodyText>
        <BodyText>
          <strong>Con una capa oculta</strong> de al menos 2 neuronas, la red puede aprender
          dos fronteras y combinarlas. Cada neurona oculta aprende a detectar una condición
          diferente; la salida aprende a combinarlas.
        </BodyText>
        <BodyText>
          <strong>Truco:</strong> prueba añadir una capa con activación <em>linear</em>.
          No importa cuántas capas lineales pongas — es matemáticamente equivalente a
          una sola neurona. ¡Para resolver XOR necesitas no-linealidad!
        </BodyText>
      </DetailsBox>
    </CardRoot>
  );
}
