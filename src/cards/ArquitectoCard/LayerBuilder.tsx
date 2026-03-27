// ─── LayerBuilder ─────────────────────────────────────────────────────────────
//
// UI para construir la arquitectura de la red interactivamente.
// Muestra: [Entrada] → [Capa 1] → [Capa 2] → ... → [+ Añadir] → [Salida]
//

import { Fragment } from "react";
import { Box, Button, Flex, NativeSelect, Text } from "@chakra-ui/react";
import type { ActivationType } from "../../components/lib";
import type { LayerConfig } from "./useArquitectoTraining";

const ACT_OPTIONS: { value: ActivationType; label: string }[] = [
  { value: "relu",      label: "ReLU" },
  { value: "leakyRelu", label: "Leaky ReLU" },
  { value: "tanh",      label: "Tanh" },
  { value: "sigmoid",   label: "Sigmoid" },
  { value: "elu",       label: "ELU" },
  { value: "linear",    label: "Linear" },
];

interface Props {
  hiddenLayers: LayerConfig[];
  onAdd:    () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, patch: Partial<LayerConfig>) => void;
  maxLayers?: number;
  inputLabel?: string;
  outputLabel?: string;
}

function Arrow() {
  return (
    <Text color="gray.300" fontSize="18px" lineHeight={1} userSelect="none" flexShrink={0}>
      →
    </Text>
  );
}

function FixedLayerBadge({ label, sub, color }: { label: string; sub: string; color: string }) {
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

function HiddenLayerCard({
  layer, index, onRemove, onUpdate,
}: {
  layer: LayerConfig;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<LayerConfig>) => void;
}) {
  return (
    <Flex
      direction="column" align="center" gap="4px"
      bg="white" border="1.5px solid" borderColor="violet.200"
      borderRadius="lg" px={2} py="6px" flexShrink={0}
      minW="80px"
    >
      {/* Contador de neuronas */}
      <Flex align="center" gap="2px">
        <Button
          size="xs" variant="ghost" px={1} h="18px" minW="18px"
          onClick={() => onUpdate({ neurons: Math.max(1, layer.neurons - 1) })}
        >−</Button>
        <Text fontSize="13px" fontWeight={800} color="violet.700" minW="22px" textAlign="center">
          {layer.neurons}
        </Text>
        <Button
          size="xs" variant="ghost" px={1} h="18px" minW="18px"
          onClick={() => onUpdate({ neurons: Math.min(32, layer.neurons + 1) })}
        >+</Button>
      </Flex>

      {/* Selector de activación */}
      <NativeSelect.Root size="xs" w="76px">
        <NativeSelect.Field
          value={layer.activation}
          onChange={e => onUpdate({ activation: e.target.value as ActivationType })}
          fontSize="10px" py="1px"
        >
          {ACT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>

      {/* Etiqueta + botón eliminar */}
      <Flex align="center" gap={1}>
        <Text fontSize="9px" color="gray.400">capa {index + 1}</Text>
        <Button
          size="xs" variant="ghost" colorPalette="red"
          px="2px" h="14px" fontSize="10px"
          onClick={onRemove}
        >×</Button>
      </Flex>
    </Flex>
  );
}

export function LayerBuilder({ hiddenLayers, onAdd, onRemove, onUpdate, maxLayers = 5, inputLabel = "2 neuronas", outputLabel = "sigmoid" }: Props) {
  return (
    <Flex align="center" gap="6px" flexWrap="wrap" justify="center">
      {/* Capa de entrada (fija) */}
      <FixedLayerBadge label="Entrada" sub={inputLabel} color="#64748b" />
      <Arrow />

      {/* Capas ocultas configurables */}
      {hiddenLayers.map((layer, i) => (
        <Fragment key={i}>
          <HiddenLayerCard
            layer={layer}
            index={i}
            onRemove={() => onRemove(i)}
            onUpdate={patch => onUpdate(i, patch)}
          />
          <Arrow />
        </Fragment>
      ))}

      {/* Botón añadir capa */}
      {hiddenLayers.length < maxLayers && (
        <>
          <Button
            size="xs" colorPalette="violet" variant="subtle"
            borderStyle="dashed" borderWidth="1.5px" borderColor="violet.300"
            h="auto" py="6px" px={3} fontSize="11px"
            onClick={onAdd}
          >
            + capa
          </Button>
          <Arrow />
        </>
      )}

      {/* Capa de salida (fija) */}
      <FixedLayerBadge label="Salida" sub={outputLabel} color="#10b981" />
    </Flex>
  );
}
