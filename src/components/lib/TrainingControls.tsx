import { Button, HStack, Input, VStack, Wrap } from "@chakra-ui/react";
import { SectionLabel } from "./SectionLabel";
import type { TrainingControlsProps } from "./types";

/**
 * Reusable training controls: epoch input + Entrenar button + shortcut buttons.
 * Used by NeuronCard, ColorCard (and any future card with epoch-based training).
 */
export function TrainingControls({
  label = "Entrenar",
  epocas,
  setEpocas,
  onTrain,
  loading,
  shortcuts = [100, 500, 1000, 5000, 10000],
}: TrainingControlsProps) {
  return (
    <VStack align="stretch" gap={2}>
      <SectionLabel>{label}</SectionLabel>
      <HStack gap={2}>
        <Input
          type="number"
          min="1"
          value={epocas}
          onChange={(e) => setEpocas(e.target.value)}
          placeholder="Épocas"
        />
        <Button
          colorPalette="violet"
          onClick={onTrain}
          loading={loading}
          loadingText="Entrenando..."
        >
          Entrenar
        </Button>
      </HStack>
      <Wrap gap={1}>
        {shortcuts.map((n) => (
          <Button key={n} variant="outline" size="sm" onClick={() => setEpocas(String(n))}>
            {n.toLocaleString()}
          </Button>
        ))}
      </Wrap>
    </VStack>
  );
}
