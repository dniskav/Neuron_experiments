// ─── DetectorArquitecto ───────────────────────────────────────────────────────
//
// Sección interactiva de construcción de redes neuronales.
// El usuario elige un problema, construye la arquitectura y ve la frontera
// de decisión actualizarse en tiempo real.
//

import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  NativeSelect,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { StatItem, DetailsBox, BodyText, NetworkDiagram } from "../../components/lib";
import type { ActivationType } from "../../components/lib";
import { DecisionCanvas, CANVAS_W } from "./DecisionCanvas";
import { LayerBuilder } from "./LayerBuilder";
import { ActivationGuide } from "./ActivationGuide";
import { TutorPanel } from "./TutorPanel";
import { useTutor } from "./useTutor";
import { useArquitectoTraining, type OptimizerType } from "./useArquitectoTraining";
import { PROBLEMS, type Problem } from "./problems";

// ── Selector de problema ──────────────────────────────────────────────────────

const NIVEL_COLOR: Record<number, string> = { 1: "#10b981", 2: "#f59e0b", 3: "#ef4444" };

function ProblemSelector({
  selected, onChange,
}: { selected: Problem; onChange: (p: Problem) => void }) {
  return (
    <Flex gap={2} flexWrap="wrap" justify="center">
      {PROBLEMS.map(p => (
        <Button
          key={p.id}
          size="sm"
          variant={selected.id === p.id ? "solid" : "subtle"}
          colorPalette={selected.id === p.id ? "violet" : "gray"}
          onClick={() => onChange(p)}
          borderWidth={selected.id === p.id ? 0 : "1.5px"}
          borderColor="gray.200"
        >
          <Box
            as="span"
            display="inline-block"
            w="8px" h="8px"
            borderRadius="full"
            bg={NIVEL_COLOR[p.nivel]}
            mr={1}
            flexShrink={0}
          />
          {p.emoji} {p.titulo}
        </Button>
      ))}
    </Flex>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const OPT_LABEL: Record<OptimizerType, string> = {
  sgd: "SGD", momentum: "Momentum", adam: "Adam",
};

export function DetectorArquitecto() {
  const [selectedProblem, setSelectedProblem] = useState<Problem>(PROBLEMS[2]); // fiesta por defecto
  const t = useArquitectoTraining(selectedProblem);

  const tutorMsg = useTutor({
    problem:       selectedProblem,
    hiddenLayers:  t.hiddenLayers,
    optimizerType: t.optimizerType,
    lr:            t.lr,
    epochs:        t.epochs,
    accuracy:      t.accuracy,
    loss:          t.loss,
  });

  const networkLayers = useMemo(() => [
    { size: 2 },
    ...t.hiddenLayers.map(l => ({ size: l.neurons, activation: l.activation as ActivationType })),
    { size: 1, activation: "sigmoid" as ActivationType },
  ], [t.hiddenLayers]);

  const accuracyStr = t.accuracy !== null ? `${(t.accuracy * 100).toFixed(1)} %` : "—";
  const lossStr     = t.loss     !== null ? t.loss.toFixed(4) : "—";

  return (
    <Flex direction="column" gap={6} align="center" w="100%">

      {/* ── Selector de problema ───────────────────────────────────────── */}
      <ProblemSelector selected={selectedProblem} onChange={setSelectedProblem} />

      {/* ── Layout principal: canvas izq, controles der ────────────────── */}
      <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">

        {/* Columna izquierda: canvas */}
        <Flex direction="column" gap={3} align="center">
          <Flex justify="space-between" w={`${CANVAS_W}px`}>
            <Text fontSize="9px" color="gray.400">↑ eje Y</Text>
            <Text fontSize="9px" color="gray.400">eje X →</Text>
          </Flex>

          <DecisionCanvas
            netRef={t.netRef}
            points={t.points}
            drawVersion={t.drawVersion}
            cornerLabels={selectedProblem.cornerLabels}
          />

          {/* Leyenda */}
          <Flex gap={4} justify="center">
            <Flex align="center" gap={1}>
              <Box w="10px" h="10px" borderRadius="full" bg="indigo.400" />
              <Text fontSize="10px" color="gray.400">clase 1</Text>
            </Flex>
            <Flex align="center" gap={1}>
              <Box w="10px" h="10px" borderRadius="full" bg="red.400" />
              <Text fontSize="10px" color="gray.400">clase 0</Text>
            </Flex>
          </Flex>

        </Flex>

        {/* Columna derecha: controles */}
        <Flex direction="column" gap={4} maxW="380px" w="100%">

          {/* Descripción del problema */}
          <Box
            bg="white"
            border="1px solid"
            borderColor="gray.100"
            borderRadius="xl"
            p={4}
          >
            <Flex align="center" gap={2} mb={2}>
              <Text fontSize="20px" lineHeight={1}>{selectedProblem.emoji}</Text>
              <Heading size="sm" color="gray.700">{selectedProblem.titulo}</Heading>
              <Box
                fontSize="9px" fontWeight={700} color="white" px={2} py="1px"
                borderRadius="full"
                bg={NIVEL_COLOR[selectedProblem.nivel]}
              >
                {selectedProblem.nivel === 1 ? "FÁCIL" : selectedProblem.nivel === 2 ? "MEDIO" : "DIFÍCIL"}
              </Box>
            </Flex>
            <Text fontSize="13px" color="gray.500" lineHeight={1.6}>
              {selectedProblem.descripcion}
            </Text>
          </Box>

          {/* Diagrama de red (live) */}
          <NetworkDiagram
            layers={networkLayers}
            optimizer={`${OPT_LABEL[t.optimizerType]} lr=${t.lr}`}
            activationsRef={t.activationsRef}
          />

          {/* Constructor de arquitectura */}
          <Box
            bg="gray.50"
            border="1px dashed"
            borderColor="gray.200"
            borderRadius="xl"
            p={3}
          >
            <Text fontSize="10px" color="gray.400" mb={2} textAlign="center" fontWeight={600} letterSpacing="wide">
              ARQUITECTURA
            </Text>
            <LayerBuilder
              hiddenLayers={t.hiddenLayers}
              onAdd={t.addLayer}
              onRemove={t.removeLayer}
              onUpdate={t.updateLayer}
            />
          </Box>

          {/* Controles globales */}
          <Flex gap={2} flexWrap="wrap" align="center">
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.400">Opt:</Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field value={t.optimizerType} onChange={e => t.setOptimizerType(e.target.value as OptimizerType)} fontSize="12px">
                  <option value="adam">Adam</option>
                  <option value="momentum">Momentum</option>
                  <option value="sgd">SGD</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.400">lr:</Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field value={t.lr} onChange={e => t.setLr(Number(e.target.value))} fontSize="12px">
                  {[0.1, 0.05, 0.01, 0.001].map(v => <option key={v} value={v}>{v}</option>)}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.400">vel:</Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field value={t.epf} onChange={e => t.setEpf(Number(e.target.value))} fontSize="12px">
                  {[1, 5, 20, 50, 100].map(v => <option key={v} value={v}>{v} ép/f</option>)}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
          </Flex>

          {/* Métricas */}
          <SimpleGrid columns={3} gap={3}>
            <StatItem variant="compact" label="Épocas"    value={t.epochs} />
            <StatItem variant="compact" label="Loss"      value={lossStr} />
            <StatItem
              variant="compact" label="Precisión" value={accuracyStr}
              highlight={t.accuracy !== null && t.accuracy >= 0.95}
            />
          </SimpleGrid>

          {/* Botones */}
          <Flex gap={2} flexWrap="wrap">
            {!t.entrenando
              ? <Button colorPalette="violet" size="sm" onClick={t.iniciar}>▶ Entrenar</Button>
              : <Button colorPalette="orange" size="sm" onClick={t.pausar}>⏸ Pausar</Button>
            }
            <Button variant="outline" size="sm" onClick={t.resetear}>↺ Reiniciar pesos</Button>
          </Flex>

          {/* Tutor contextual */}
          {tutorMsg && <TutorPanel message={tutorMsg} />}

          {/* Guía de activaciones */}
          <DetailsBox summary="¿Qué activación usar? Guía visual">
            <ActivationGuide />
          </DetailsBox>

          {/* Explicación arquitectura */}
          <DetailsBox summary="¿Por qué importa la arquitectura?">
            <BodyText>
              <strong>Lineal vs no-lineal:</strong> sin capas ocultas, la red solo puede
              trazar una línea recta. Muchos problemas (XOR, círculo, espiral) requieren
              fronteras curvas — imposibles sin neuronas ocultas.
            </BodyText>
            <BodyText>
              <strong>Truco del linear:</strong> añade capas ocultas con activación
              <em> linear</em> — por muchas que pongas, matemáticamente equivalen a
              una sola neurona. La no-linealidad (ReLU, Tanh…) es lo que da potencia real.
            </BodyText>
            <BodyText>
              <strong>La espiral</strong> es el reto definitivo: necesitas 2-3 capas,
              8-16 neuronas y la activación correcta. Con sigmoid suele colapsar;
              prueba ReLU o Tanh.
            </BodyText>
          </DetailsBox>
        </Flex>
      </Flex>
    </Flex>
  );
}
