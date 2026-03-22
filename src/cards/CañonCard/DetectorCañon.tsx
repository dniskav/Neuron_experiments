import { useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Heading,
  Text,
} from "@chakra-ui/react";
import { StatItem, CardRoot, DetailsBox, BodyText } from "../../components/lib";
import { Canvas } from "@react-three/fiber";
import { encontrarOptimo } from "../../data/datosCañon";
import { CañonScene, CW, CH } from "./CañonScene";
import { useCañonTraining } from "./useCañonTraining";
import { useCañonDrag } from "./useCañonDrag";

// ─── Configuración ────────────────────────────────────────────────────────────
const ESTRUCTURA = [3, 24, 16, 2];

// ─── Componente ───────────────────────────────────────────────────────────────
export function DetectorCañon() {
  const predRef = useRef<{ angulo: number; v0: number } | null>(null);
  const [pred, setPred] = useState<{ angulo: number; v0: number } | null>(null);

  const drag = useCañonDrag(
    (esc) => training.getPred(esc),
    predRef,
    setPred,
  );

  const training = useCañonTraining(
    predRef,
    drag.escenaRef,
    setPred,
    () => { drag.resetEscena(); },
  );

  const escena = drag.escena;

  const optimo    = encontrarOptimo(escena);
  const predDeg   = pred ? (pred.angulo * 180 / Math.PI).toFixed(1) : "—";
  const predV0    = pred ? pred.v0.toFixed(1) : "—";
  const corrDeg   = optimo ? (optimo.angulo * 180 / Math.PI).toFixed(1) : "—";
  const corrV0    = optimo ? optimo.v0.toFixed(1) : "—";
  const errStr    = training.errorDeg !== null ? `${training.errorDeg.toFixed(2)} m` : "—";
  const pctStr    = training.precision !== null ? `${(training.precision * 100).toFixed(1)}%` : "—";
  const preciso   = training.precision !== null && training.precision >= 0.80;

  return (
    <CardRoot maxW="420px" w="100%">
      <Heading size="md" color="gray.800">Red de 3 capas · Cañón autónomo</Heading>
      <Text fontSize="sm" color="gray.600" lineHeight={1.5}>
        La red calcula <strong>ángulo y fuerza</strong> a la vez — 2 salidas.
        Aprende el tiro de <strong>mínima fuerza</strong> que supera el obstáculo e impacta el blanco.
        La precisión mide si el tiro <em>físicamente</em> da en el blanco sin chocar el obstáculo.
        Arquitectura: <strong>[{ESTRUCTURA.join(" → ")}]</strong>
      </Text>

      <Box
        ref={drag.containerRef}
        borderRadius="lg"
        border="2px solid"
        borderColor="gray.200"
        display="block"
        alignSelf="center"
        style={{ cursor: drag.cursor, width: CW, height: CH }}
        onMouseDown={drag.handleMouseDown}
        onMouseMove={drag.handleMouseMove}
        onMouseUp={drag.handleMouseUp}
        onMouseLeave={drag.handleMouseUp}
      >
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
          style={{ width: CW, height: CH, display: "block" }}
        >
          <CañonScene escenaRef={drag.escenaRef} predRef={predRef} hoverRef={drag.hoverRef} />
        </Canvas>
      </Box>

      {/* Comparativa ángulo + fuerza */}
      <Box
        display="grid"
        bg="gray.50"
        borderRadius="lg"
        p={4}
        border="1px solid"
        borderColor="gray.200"
        style={{ gridTemplateColumns: "auto 1fr 1fr", gap: "0.3rem 0.75rem", alignItems: "center" }}
      >
        <Box />
        <Text fontSize="10px" color="gray.400" textTransform="uppercase" letterSpacing={1} fontWeight={600}>Ángulo</Text>
        <Text fontSize="10px" color="gray.400" textTransform="uppercase" letterSpacing={1} fontWeight={600}>Fuerza</Text>

        <Text fontSize="xs" color="gray.600">Óptimo</Text>
        <Text fontSize="lg" fontWeight={700} color="green.500">{optimo ? `${corrDeg}°` : "—"}</Text>
        <Text fontSize="lg" fontWeight={700} color="green.500">{optimo ? `${corrV0} m/s` : "—"}</Text>

        <Text fontSize="xs" color="gray.600">Red predice</Text>
        <Text fontSize="lg" fontWeight={700} color={preciso ? "green.500" : "red.500"}>{predDeg}°</Text>
        <Text fontSize="lg" fontWeight={700} color={preciso ? "green.500" : "red.500"}>{predV0} m/s</Text>
      </Box>

      <HStack gap={2} flexWrap="wrap">
        <StatItem label="Épocas"      value={String(training.epocas)} />
        <StatItem label="Error dist." value={errStr} />
        <StatItem label="Precisión"   value={pctStr} highlight={preciso} />
      </HStack>

      <HStack gap={2}>
        {!training.entrenando ? (
          <Button flex={1} colorPalette="green" onClick={training.iniciar}>▶ Entrenar</Button>
        ) : (
          <Button flex={1} colorPalette="yellow" onClick={training.pausar}>⏸ Pausar</Button>
        )}
        <Button
          flex={1}
          colorPalette="violet"
          disabled={training.entrenando}
          onClick={training.pasoUnico}
        >
          1 época
        </Button>
        <Button flex={1} variant="outline" onClick={training.resetear}>↺ Resetear</Button>
      </HStack>

      <DetailsBox summary="¿Por qué hay infinitas soluciones y cómo lo resolvemos?">
        <BodyText>Para un blanco dado existen infinitas combinaciones (ángulo, fuerza) que llegan al mismo punto. Si la red aprende dos ejemplos contradictorios con la misma escena pero distinta solución, los gradientes se anulan y no converge.</BodyText>
        <BodyText><strong>Solución: tiro óptimo de mínima fuerza.</strong> Para cada escena existe una única solución que minimiza v₀ usando la ecuación del alcance. El ángulo óptimo es el mayor entre 45° y el ángulo mínimo que supera el obstáculo. Así el dataset es consistente: una escena → una respuesta.</BodyText>
        <BodyText>La trayectoria punteada es siempre el tiro óptimo. La red aprende a replicarla.</BodyText>
      </DetailsBox>
    </CardRoot>
  );
}
