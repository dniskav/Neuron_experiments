// ─── TextGeneratorCard ─────────────────────────────────────────────────────────
//
// Character-level text generation with a Transformer.
// Demonstrates how self-attention learns sequential patterns in text.
//
// ─────────────────────────────────────────────────────────────────────────────

import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { SpeedSelector, TRAIN_SPEED_OPTIONS } from '../../components/shared/SpeedSelector'
import { useTextGenerator } from './useTextGenerator'

export function TextGeneratorCard() {
  const s = useTextGenerator()
  const { state } = s

  const lossStr = (state.trainLoss > 0 && isFinite(state.trainLoss))
    ? state.trainLoss.toFixed(4)
    : '\u2014'

  return (
    <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">

      {/* ── Left column: generated text + controls ── */}
      <Flex direction="column" gap={3} minW="340px" maxW="480px" flex={1}>

        {/* Generated text */}
        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={4}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            TEXTO GENERADO
          </Text>
          <Text
            fontSize="14px" color="gray.200" fontFamily="monospace" lineHeight={1.6}
            minH="60px" wordBreak="break-all"
          >
            {state.generated || '\u2026'}
          </Text>
        </Box>

        {/* Training corpus */}
        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={1}>
            CORPUS
          </Text>
          <Text fontSize="12px" color="gray.400" fontFamily="monospace">
            &ldquo;{state.corpus}&rdquo;
          </Text>
        </Box>

        {/* Controls */}
        <Flex gap={2} w="100%">
          {!state.running ? (
            <Button colorPalette="violet" size="sm" flex={1} onClick={s.startTraining}>
              ▶ Entrenar
            </Button>
          ) : (
            <Button colorPalette="orange" size="sm" flex={1} onClick={s.pause}>
              ⏸ Pausar
            </Button>
          )}
          <Button colorPalette="teal" size="sm" flex={1} onClick={s.generate} disabled={state.running}>
            ✨ Generar
          </Button>
          <Button variant="outline" size="sm" onClick={s.reset} color="gray.400" borderColor="gray.600">
            ↺
          </Button>
        </Flex>

        {state.running && (
          <SpeedSelector
            options={TRAIN_SPEED_OPTIONS}
            value={s.trainSpeed}
            onChange={s.setTrainSpeed}
            colorPalette="violet"
          />
        )}

        {/* Stats */}
        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={3} w="100%">
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            ENTRENAMIENTO
          </Text>
          <Flex direction="column" gap={1}>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">Pasos</Text>
              <Text fontSize="12px" fontWeight={700} color="gray.300">{state.trainStep.toLocaleString()}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">Épocas</Text>
              <Text fontSize="12px" fontWeight={700} color="gray.300">{state.epoch}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="12px" color="gray.500">Loss (CE)</Text>
              <Text fontSize="12px" fontWeight={700} color={state.trainLoss < 2.5 ? '#4ade80' : state.trainLoss < 3.5 ? '#fbbf24' : 'gray.300'}>
                {lossStr}
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>

      {/* ── Right column: explanation ── */}
      <Flex direction="column" gap={4} w="300px">

        <Box bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.08)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            ARQUITECTURA
          </Text>
          <Flex direction="column" gap={1}>
            <Text fontSize="11px" color="gray.400">Tipo: Transformer (causal)</Text>
            <Text fontSize="11px" color="gray.400">Vocabulario: 27 tokens (a-z + espacio)</Text>
            <Text fontSize="11px" color="gray.400">d_model: {16} · Cabezas: {2} · d_ff: {32}</Text>
            <Text fontSize="11px" color="gray.400">Bloques: {2} · Ventana: {20} caracteres</Text>
          </Flex>
        </Box>

        <Box bg="rgba(255,255,255,0.04)" border="1px dashed rgba(255,255,255,0.12)" borderRadius="xl" p={3}>
          <Text fontSize="10px" color="gray.500" fontWeight={600} letterSpacing="wide" mb={2}>
            ¿CÓMO FUNCIONA?
          </Text>
          <Flex direction="column" gap={2}>
            <ExplainItem
              title="Modelo de lenguaje"
              text="El Transformer aprende a predecir el siguiente carácter dado los anteriores. Cada posición atiende a todas las posiciones previas mediante self-attention causal."
            />
            <ExplainItem
              title="Ventana deslizante"
              text="Se extraen ventanas de 20 caracteres del corpus. El modelo entrena con cada ventana: la entrada son los caracteres [0..18] y el target son los caracteres [1..19]."
            />
            <ExplainItem
              title="Generación"
              text="Para generar texto, se alimenta un prefijo al modelo, se predice el siguiente carácter, se añade al contexto y se repite. Se usa muestreo probabilístico para diversidad."
            />
            <ExplainItem
              title="Limitaciones"
              text="Con un corpus pequeño y un modelo mínimo, el resultado no será gramaticalmente perfecto. El objetivo es ver cómo la red aprende patrones básicos de secuencia."
            />
          </Flex>
        </Box>

      </Flex>
    </Flex>
  )
}

// ── ExplainItem ─────────────────────────────────────────────────────────────────

function ExplainItem({ title, text }: { title: string; text: string }) {
  return (
    <Box>
      <Text fontSize="11px" color="gray.300" fontWeight={600} mb="2px">{title}</Text>
      <Text fontSize="11px" color="gray.500" lineHeight="short">{text}</Text>
    </Box>
  )
}
