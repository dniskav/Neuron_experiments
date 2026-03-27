// ─── ActivationGuide ──────────────────────────────────────────────────────────
//
// Panel de referencia visual para las funciones de activación.
// Muestra la curva SVG + casos ideales + qué evitar.
//

import { Box, Flex, Text } from "@chakra-ui/react";

// ── Datos de cada activación ──────────────────────────────────────────────────

interface ActInfo {
  key:     string;
  name:    string;
  formula: string;
  color:   string;
  fn:      (x: number) => number;
  best:    string;
  avoid:   string | null;
}

const ACTS: ActInfo[] = [
  {
    key:     "relu",
    name:    "ReLU",
    formula: "max(0, x)",
    color:   "#6366f1",
    fn:      (x) => Math.max(0, x),
    best:    "Redes profundas, la mayoría de problemas",
    avoid:   "Puede dejar neuronas 'muertas' (siempre 0)",
  },
  {
    key:     "leakyRelu",
    name:    "Leaky ReLU",
    formula: "x > 0 ? x : 0.01x",
    color:   "#8b5cf6",
    fn:      (x) => x > 0 ? x : 0.01 * x,
    best:    "Cuando ReLU falla — evita neuronas muertas",
    avoid:   null,
  },
  {
    key:     "tanh",
    name:    "Tanh",
    formula: "(eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)",
    color:   "#f59e0b",
    fn:      (x) => { const e = Math.exp(2 * x); return (e - 1) / (e + 1); },
    best:    "Formas curvas y simétricas (círculo, espiral)",
    avoid:   "Gradientes pequeños en redes muy profundas",
  },
  {
    key:     "sigmoid",
    name:    "Sigmoid",
    formula: "1 / (1 + e⁻ˣ)",
    color:   "#10b981",
    fn:      (x) => 1 / (1 + Math.exp(-x)),
    best:    "Capa de salida — probabilidades entre 0 y 1",
    avoid:   "Capas ocultas: los gradientes se apagan",
  },
  {
    key:     "elu",
    name:    "ELU",
    formula: "x > 0 ? x : α(eˣ−1)",
    color:   "#06b6d4",
    fn:      (x) => x > 0 ? x : Math.exp(x) - 1,
    best:    "Alternativa suave a ReLU, media ≈ 0",
    avoid:   null,
  },
  {
    key:     "linear",
    name:    "Linear",
    formula: "f(x) = x",
    color:   "#94a3b8",
    fn:      (x) => x,
    best:    "Capa de salida en regresión",
    avoid:   "Ocultas: N capas lineales = 1 capa lineal",
  },
];

// ── Mini SVG de la curva ──────────────────────────────────────────────────────

const SW = 110; // svg width
const SH = 54;  // svg height
const X_MIN = -3, X_MAX = 3;
const Y_MIN = -1.5, Y_MAX = 1.5;
const N_PTS = 80;

function toSvgX(x: number) { return ((x - X_MIN) / (X_MAX - X_MIN)) * SW; }
function toSvgY(y: number) {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, y));
  return ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * SH;
}

function ActCurve({ fn, color }: { fn: (x: number) => number; color: string }) {
  const pts = Array.from({ length: N_PTS }, (_, i) => {
    const x = X_MIN + (i / (N_PTS - 1)) * (X_MAX - X_MIN);
    return `${toSvgX(x).toFixed(1)},${toSvgY(fn(x)).toFixed(1)}`;
  }).join(" ");

  const ox = toSvgX(0);
  const oy = toSvgY(0);

  return (
    <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} style={{ display: "block" }}>
      {/* Eje X */}
      <line x1={0} y1={oy} x2={SW} y2={oy} stroke="#e2e8f0" strokeWidth={1} />
      {/* Eje Y */}
      <line x1={ox} y1={0} x2={ox} y2={SH} stroke="#e2e8f0" strokeWidth={1} />
      {/* Curva */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Tarjeta de activación ─────────────────────────────────────────────────────

function ActCard({ info }: { info: ActInfo }) {
  return (
    <Box
      bg="white"
      border="1.5px solid"
      borderColor="gray.100"
      borderRadius="xl"
      p={3}
      minW="150px"
      flex="1"
    >
      {/* Nombre + fórmula */}
      <Flex align="baseline" gap={1} mb={1}>
        <Text fontSize="13px" fontWeight={800} color={info.color}>{info.name}</Text>
      </Flex>
      <Text fontSize="9px" color="gray.400" fontFamily="monospace" mb={2}>
        {info.formula}
      </Text>

      {/* Curva */}
      <Box
        bg="gray.50"
        borderRadius="md"
        p={1}
        mb={2}
        overflow="hidden"
      >
        <ActCurve fn={info.fn} color={info.color} />
      </Box>

      {/* Ideal para */}
      <Flex gap={1} align="flex-start" mb={info.avoid ? 1 : 0}>
        <Text fontSize="10px" color="green.500" fontWeight={700} flexShrink={0}>✓</Text>
        <Text fontSize="10px" color="gray.600" lineHeight={1.4}>{info.best}</Text>
      </Flex>

      {/* Evitar */}
      {info.avoid && (
        <Flex gap={1} align="flex-start">
          <Text fontSize="10px" color="red.400" fontWeight={700} flexShrink={0}>✗</Text>
          <Text fontSize="10px" color="gray.400" lineHeight={1.4}>{info.avoid}</Text>
        </Flex>
      )}
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ActivationGuide() {
  return (
    <Box>
      <Text fontSize="10px" color="gray.400" fontWeight={700} letterSpacing="wide" mb={3} textAlign="center">
        GUÍA DE ACTIVACIONES
      </Text>
      <Flex gap={2} flexWrap="wrap">
        {ACTS.map(a => <ActCard key={a.key} info={a} />)}
      </Flex>
    </Box>
  );
}
