// ─── ControlBar ───────────────────────────────────────────────────────────────
//
// Botones de control para experimentos de entrenamiento continuo.
// Maneja los estados Entrenar / Pausar / Reiniciar.
//
// Uso mínimo:
//   <ControlBar running={running} onStart={start} onPause={pause} onReset={reset} />
//
// Con botones de inferencia adicionales:
//   <ControlBar
//     running={running}
//     onStart={start}
//     onPause={pause}
//     onReset={reset}
//     inferenceButtons={[
//       { label: '▷ Un paso',  colorPalette: 'teal',  onClick: inferStep, disabled: solved },
//       { label: '⚡ Resolver', colorPalette: 'green', onClick: inferAll,  disabled: solved },
//     ]}
//   />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Button, Flex } from '@chakra-ui/react'

interface InferenceButton {
  label:        string
  colorPalette: string
  onClick:      () => void
  disabled?:    boolean
}

interface Props {
  running:           boolean
  onStart:           () => void
  onPause:           () => void
  onReset:           () => void
  /** Etiqueta del botón de inicio. Default: "▶ Entrenar" */
  startLabel?:       string
  /** Botones extra de inferencia (mostrados siempre, no solo al pausar) */
  inferenceButtons?: InferenceButton[]
  width?:            string | number
}

export function ControlBar({
  running,
  onStart,
  onPause,
  onReset,
  startLabel       = '▶ Entrenar',
  inferenceButtons = [],
  width            = '100%',
}: Props) {
  return (
    <Flex direction="column" gap={2} w={width}>
      {/* Fila principal: Entrenar/Pausar + Reiniciar */}
      <Flex gap={2}>
        {!running ? (
          <Button colorPalette="violet" size="sm" flex={1} onClick={onStart}>
            {startLabel}
          </Button>
        ) : (
          <Button colorPalette="orange" size="sm" flex={1} onClick={onPause}>
            ⏸ Pausar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          color="gray.400"
          borderColor="gray.600"
        >
          ↺ Reiniciar
        </Button>
      </Flex>

      {/* Fila de inferencia (si se proporcionan botones) */}
      {inferenceButtons.length > 0 && (
        <Flex gap={2}>
          {inferenceButtons.map((btn) => (
            <Button
              key={btn.label}
              colorPalette={btn.colorPalette}
              size="sm"
              flex={1}
              onClick={btn.onClick}
              disabled={btn.disabled}
            >
              {btn.label}
            </Button>
          ))}
        </Flex>
      )}
    </Flex>
  )
}
