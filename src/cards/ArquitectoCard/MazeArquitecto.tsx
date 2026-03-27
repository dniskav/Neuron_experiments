// ─── MazeArquitecto ───────────────────────────────────────────────────────────
//
// Laberinto con agente LSTM — interactivo como Snake.
// El usuario configura tamaño del LSTM y capas densas, ve la red aprender
// con BPTT + TD(λ) y el tutor explica cada concepto en contexto.
//

import { useMemo, Fragment } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  NativeSelect,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { StatItem, NetworkDiagram, DetailsBox } from "../../components/lib";
import type { ActivationType } from "../../components/lib";
import { MazeCanvas2D } from "./MazeCanvas2D";
import { TutorPanel } from "./TutorPanel";
import { useMazeRL, N_IN, N_OUT, DENSE_ACT_OPTIONS } from "./useMazeRL";
import type { DenseConfig, DenseActKey } from "./useMazeRL";
import { useTutorMaze } from "./useTutorMaze";

// ── Constantes ────────────────────────────────────────────────────────────────

const LR_OPTIONS = [0.03, 0.02, 0.01, 0.005];
const LSTM_STEP  = 4;

// ── Builder de capas densas (sin selector de activación) ──────────────────────

function Arrow() {
  return (
    <Text color="gray.300" fontSize="18px" lineHeight={1} userSelect="none" flexShrink={0}>
      →
    </Text>
  );
}

function FixedBadge({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <Flex direction="column" align="center" gap="2px" flexShrink={0}>
      <Box
        bg={color} color="white" borderRadius="md"
        px={2} py="3px" fontSize="11px" fontWeight={700}
        textAlign="center" whiteSpace="nowrap"
      >
        {label}
      </Box>
      <Text fontSize="9px" color="gray.400">{sub}</Text>
    </Flex>
  );
}

function DenseCard({
  layer, index, onRemove, onUpdate,
}: {
  layer: DenseConfig;
  index: number;
  onRemove: () => void;
  onUpdate: (neurons: number) => void;
}) {
  return (
    <Flex
      direction="column" align="center" gap="4px"
      bg="rgba(255,255,255,0.06)" border="1.5px solid rgba(139,92,246,0.4)"
      borderRadius="lg" px={2} py="6px" flexShrink={0}
      minW="72px"
    >
      <Flex align="center" gap="2px">
        <Button
          size="xs" variant="ghost" px={1} h="18px" minW="18px"
          color="gray.300"
          onClick={() => onUpdate(Math.max(4, layer.neurons - 4))}
        >−</Button>
        <Text fontSize="13px" fontWeight={800} color="violet.300" minW="22px" textAlign="center">
          {layer.neurons}
        </Text>
        <Button
          size="xs" variant="ghost" px={1} h="18px" minW="18px"
          color="gray.300"
          onClick={() => onUpdate(Math.min(64, layer.neurons + 4))}
        >+</Button>
      </Flex>
      <Flex align="center" gap={1}>
        <Text fontSize="9px" color="gray.500">densa {index + 1}</Text>
        <Button
          size="xs" variant="ghost" colorPalette="red"
          px="2px" h="14px" fontSize="10px"
          onClick={onRemove}
        >×</Button>
      </Flex>
    </Flex>
  );
}

interface DenseBuilderProps {
  lstmSize:    number;
  denseLayers: DenseConfig[];
  onAddDense:    () => void;
  onRemoveDense: (i: number) => void;
  onUpdateDense: (i: number, neurons: number) => void;
  onSetLstm:   (n: number) => void;
}

function MazeDenseBuilder({ lstmSize, denseLayers, onAddDense, onRemoveDense, onUpdateDense, onSetLstm }: DenseBuilderProps) {
  return (
    <Flex align="center" gap="6px" flexWrap="wrap" justify="center">
      {/* Entrada */}
      <FixedBadge label="Entrada" sub={`${N_IN} sensores`} color="#64748b" />
      <Arrow />

      {/* LSTM (tamaño configurable) */}
      <Flex
        direction="column" align="center" gap="4px"
        bg="rgba(245,158,11,0.12)" border="1.5px solid rgba(245,158,11,0.45)"
        borderRadius="lg" px={2} py="6px" flexShrink={0} minW="72px"
      >
        <Flex align="center" gap="2px">
          <Button
            size="xs" variant="ghost" px={1} h="18px" minW="18px"
            color="amber.300"
            onClick={() => onSetLstm(lstmSize - LSTM_STEP)}
          >−</Button>
          <Text fontSize="13px" fontWeight={800} color="amber.300" minW="22px" textAlign="center">
            {lstmSize}
          </Text>
          <Button
            size="xs" variant="ghost" px={1} h="18px" minW="18px"
            color="amber.300"
            onClick={() => onSetLstm(lstmSize + LSTM_STEP)}
          >+</Button>
        </Flex>
        <Text fontSize="9px" color="amber.500" fontWeight={600}>LSTM</Text>
      </Flex>
      <Arrow />

      {/* Capas densas */}
      {denseLayers.map((layer, i) => (
        <Fragment key={i}>
          <DenseCard
            layer={layer}
            index={i}
            onRemove={() => onRemoveDense(i)}
            onUpdate={n => onUpdateDense(i, n)}
          />
          <Arrow />
        </Fragment>
      ))}

      {/* Botón añadir capa densa */}
      {denseLayers.length < 3 && (
        <>
          <Button
            size="xs" colorPalette="violet" variant="subtle"
            borderStyle="dashed" borderWidth="1.5px" borderColor="rgba(139,92,246,0.4)"
            h="auto" py="6px" px={3} fontSize="11px"
            onClick={onAddDense}
          >
            + densa
          </Button>
          <Arrow />
        </>
      )}

      {/* Salida */}
      <FixedBadge label="Salida" sub={`${N_OUT} acciones`} color="#10b981" />
    </Flex>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function MazeArquitecto() {
  const s = useMazeRL();

  const tutorMsg = useTutorMaze({
    lstmSize:    s.lstmSize,
    denseLayers: s.denseLayers,
    lr:          s.lr,
    stats:       s.stats,
  });

  const networkLayers = useMemo(() => [
    { size: N_IN },
    { size: s.lstmSize, activation: "lstm" as ActivationType },
    ...s.denseLayers.map(l => ({ size: l.neurons, activation: s.denseActKey as ActivationType })),
    { size: N_OUT, activation: "linear" as ActivationType },
  ], [s.lstmSize, s.denseLayers, s.denseActKey]);

  const tasaStr = `${s.stats.tasa} %`;
  const epsStr  = s.stats.epsilon.toFixed(2);

  return (
    <Flex direction="column" gap={5} align="center" w="100%">

      {/* Descripción */}
      <Box
        bg="rgba(255,255,255,0.04)"
        border="1px solid rgba(255,255,255,0.08)"
        borderRadius="xl"
        p={4}
        maxW="620px"
        w="100%"
      >
        <Flex align="center" gap={2} mb={2}>
          <Text fontSize="22px" lineHeight={1}>🗺️</Text>
          <Heading size="sm" color="gray.100">Laberinto — Agente LSTM</Heading>
          <Box
            fontSize="9px" fontWeight={700} color="white" px={2} py="1px"
            borderRadius="full" bg="#ef4444"
          >
            DIFÍCIL
          </Box>
        </Flex>
        <Text fontSize="13px" color="gray.400" lineHeight={1.6}>
          El agente navega un laberinto con 5 bifurcaciones usando una red <strong style={{ color: "#fcd34d" }}>LSTM</strong>.
          A diferencia de Snake, aquí el agente necesita <strong style={{ color: "#fcd34d" }}>memoria</strong> para
          recordar qué bifurcaciones ya exploró y evitar repetir callejones.
          Recibe <strong style={{ color: "#a7f3d0" }}>12 entradas</strong> (sensores de pared, ángulo a meta,
          proximidad, celdas visitadas) y devuelve <strong style={{ color: "#a7f3d0" }}>3 Q-values</strong> (seguir · girar izq · girar der).
          Aprende con <strong style={{ color: "#93c5fd" }}>BPTT + TD(λ)</strong> sobre el episodio completo.
        </Text>
      </Box>

      {/* Layout principal */}
      <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">

        {/* Columna izquierda: canvas */}
        <Flex direction="column" gap={3} align="center">
          <MazeCanvas2D
            agenteRef={s.agenteRef}
            trailRef={s.trailRef}
            wpRef={s.wpRef}
            redrawVersion={s.redrawVersion}
            showSensors={s.showSensors}
          />

          {/* Métricas */}
          <SimpleGrid columns={4} gap={2} w="100%">
            <StatItem variant="compact" label="Episodios" value={s.stats.episodios} />
            <StatItem variant="compact" label="Tasa"      value={tasaStr}
              highlight={s.stats.tasa >= 50}
            />
            <StatItem variant="compact" label="ε"         value={epsStr} />
            <StatItem variant="compact" label="Waypoints" value={`${s.stats.waypoints}/5`}
              highlight={s.stats.waypoints >= 3}
            />
          </SimpleGrid>

          {/* Indicador de guardado */}
          {s.hasSave && (
            <Text fontSize="10px" color="gray.500" textAlign="center">
              💾 Pesos guardados — se recargarán automáticamente
            </Text>
          )}

          {/* Botones */}
          <Flex gap={2} flexWrap="wrap" justify="center">
            {!s.running
              ? <Button colorPalette="green" size="sm" onClick={s.iniciar}>▶ Entrenar</Button>
              : <Button colorPalette="orange" size="sm" onClick={s.pausar}>⏸ Pausar</Button>
            }
            {!s.demo
              ? <Button colorPalette="violet" size="sm" variant="subtle" onClick={s.probar}
                  title="Ejecuta 1 episodio completo con epsilon muy bajo para ver qué aprendió"
                >👁 Probar</Button>
              : <Button colorPalette="red" size="sm" variant="subtle" onClick={s.pausar}>
                  ⏹ Detener demo
                </Button>
            }
            <Button variant="outline" size="sm" onClick={s.resetear}
              color="gray.400" borderColor="gray.600"
            >↺ Reiniciar</Button>
          </Flex>

          {/* Toggle sensores */}
          <Button
            size="xs" variant="ghost" color="gray.500" fontSize="10px"
            onClick={() => s.setShowSensors(!s.showSensors)}
          >
            {s.showSensors ? "🔭 Ocultar sensores" : "🔭 Mostrar sensores"}
          </Button>
        </Flex>

        {/* Columna derecha: controles */}
        <Flex direction="column" gap={4} maxW="380px" w="100%">

          {/* Diagrama de red */}
          <NetworkDiagram
            layers={networkLayers}
            optimizer={`Adam lr=${s.lr}`}
            activationsRef={s.activationsRef}
          />

          {/* Constructor de arquitectura */}
          <Box
            bg="rgba(255,255,255,0.04)"
            border="1px dashed rgba(255,255,255,0.12)"
            borderRadius="xl"
            p={3}
          >
            <Text fontSize="10px" color="gray.500" mb={2} textAlign="center" fontWeight={600} letterSpacing="wide">
              ARQUITECTURA LSTM
            </Text>
            <MazeDenseBuilder
              lstmSize={s.lstmSize}
              denseLayers={s.denseLayers}
              onAddDense={s.addDense}
              onRemoveDense={s.removeDense}
              onUpdateDense={s.updateDense}
              onSetLstm={s.setLstm}
            />
          </Box>

          {/* Activación densa + Learning rate */}
          <Flex gap={3} flexWrap="wrap" align="center">
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.500">Act. densa:</Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={s.denseActKey}
                  onChange={e => s.setDenseActKey(e.target.value as DenseActKey)}
                  fontSize="12px"
                  style={{ background: "transparent", color: "#cbd5e1" }}
                >
                  {DENSE_ACT_OPTIONS.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.500">lr:</Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={s.lr}
                  onChange={e => s.setLr(Number(e.target.value))}
                  fontSize="12px"
                  style={{ background: "transparent", color: "#cbd5e1" }}
                >
                  {LR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
          </Flex>

          {/* Tutor contextual */}
          {tutorMsg && <TutorPanel message={tutorMsg} />}

          {/* Explicación LSTM + BPTT */}
          <DetailsBox summary="¿Por qué LSTM? Memoria a través del tiempo">
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>El problema de memoria:</strong> ante los mismos sensores de pared,
              el agente puede estar en dos puntos distintos del laberinto. Una red feedforward
              tomaría <em>la misma decisión</em> porque ve los mismos inputs — no sabe de dónde viene.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>LSTM:</strong> mantiene un estado oculto h que persiste entre pasos.
              Si el agente entró por la izquierda, h lo reflejará y elegirá diferente que si
              entró por la derecha — aunque los sensores sean idénticos.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7}>
              <strong>BPTT (Backprop Through Time):</strong> al final de cada episodio,
              el error se propaga hacia atrás por todos los pasos. Las decisiones correctas
              tomadas hace 200 pasos reciben crédito — aunque pequeño.
            </Text>
          </DetailsBox>

          {/* Explicación TD(λ) */}
          <DetailsBox summary="TD(λ) — crédito hacia atrás con trazas de elegibilidad">
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>El problema de crédito:</strong> la recompensa +50 llega al final del episodio,
              pero la primera bifurcación correcta fue hace 400 pasos. ¿Cómo sabe el agente
              que esa decisión lejana fue la clave?
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>TD(λ):</strong> combina la señal inmediata (TD) con el retorno completo del episodio (MC).
              El parámetro λ=0.85 mezcla ambas: el paso anterior recibe ≈0.95×0.85 del crédito,
              el anterior ≈(0.95×0.85)², y así. La primera bifurcación recibe crédito pequeño pero
              acumulado en muchos episodios.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7}>
              <strong>vs replay buffer (Snake):</strong> Snake mezcla experiencias de distintos episodios
              en un buffer. El laberinto usa la trayectoria completa del episodio actual — necesario
              porque el LSTM tiene estado secuencial que no se puede mezclar arbitrariamente.
            </Text>
          </DetailsBox>

          {/* Explicación sensores */}
          <DetailsBox summary="¿Qué ven los 12 sensores?">
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>5 sensores de pared</strong> (s0-s4): distancias normalizadas en 5 ángulos
              (frente, ±45°, ±90°). Cercano a la pared → valor bajo; libre → valor alto.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>2 orientación a meta</strong>: seno y coseno del ángulo hacia la meta.
              Dan dirección sin ambigüedad: sin sin/cos, el agente no sabría si girar izquierda
              o derecha para apuntar hacia la meta.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>1 proximidad a meta</strong>: distancia normalizada. El agente sabe
              si está "cerca" o "lejos" aunque no vea la meta directamente.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7}>
              <strong>5 celdas visitadas</strong> (v0-v4): ¿ya pasé por esta celda?
              Estas entradas son cruciales — sin ellas el LSTM tendría que aprender solo
              a recordar qué caminos ya exploró, tardando 10× más episodios.
            </Text>
          </DetailsBox>

        </Flex>
      </Flex>
    </Flex>
  );
}
