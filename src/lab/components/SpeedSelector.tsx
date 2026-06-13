// ─── SpeedSelector ────────────────────────────────────────────────────────────
//
// Selector de velocidad de entrenamiento/prueba.
// Muestra botones toggle para las opciones disponibles.
//
// Uso:
//   <SpeedSelector
//     options={TRAIN_SPEED_OPTIONS}
//     value={speed}
//     onChange={setSpeed}
//     colorPalette="violet"
//   />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Button, Flex } from '@chakra-ui/react'

export interface SpeedOption {
  label: string
  value: number
}

interface Props {
  options:        SpeedOption[]
  value:          number
  onChange:       (v: number) => void
  colorPalette?:  string
}

export function SpeedSelector({ options, value, onChange, colorPalette = 'violet' }: Props) {
  return (
    <Flex gap={1} justify="center">
      {options.map((opt) => (
        <Button
          key={opt.value}
          size="xs"
          flex={1}
          variant={value === opt.value ? 'solid' : 'outline'}
          colorPalette={colorPalette}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </Flex>
  )
}

export const TRAIN_SPEED_OPTIONS: SpeedOption[] = [
  { label: '1×',  value: 1  },
  { label: '2×',  value: 2  },
  { label: '4×',  value: 4  },
  { label: '10×', value: 10 },
]

export const TEST_SPEED_OPTIONS: SpeedOption[] = [
  { label: '🐢', value: 0.1 },
  { label: '1×', value: 1   },
  { label: '3×', value: 3   },
  { label: '10×', value: 10 },
]
