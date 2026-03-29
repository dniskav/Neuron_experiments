import { Fragment } from 'react'
import { Button, Flex, Text } from '@chakra-ui/react'
import { LEVEL_INFO } from './levelInfo'
import type { Level } from '../useAgentRL'

interface Props {
  level: Level
  onChange: (l: Level) => void
}

export function LevelBreadcrumb({ level, onChange }: Props) {
  const levels = [1, 2, 3, 4] as const
  return (
    <Flex align="center" gap={1} flexWrap="wrap">
      {levels.map((l, i) => (
        <Fragment key={l}>
          <Button
            size="xs"
            variant={l === level ? 'solid' : 'subtle'}
            colorPalette={l === level ? 'violet' : 'gray'}
            opacity={l > level ? 0.35 : 1}
            disabled={l > level}
            onClick={() => l <= level && onChange(l)}
            fontSize="11px"
            px={2}>
            {LEVEL_INFO[l].emoji} N{l}
          </Button>
          {i < 3 && (
            <Text fontSize="10px" color="gray.500" userSelect="none">›</Text>
          )}
        </Fragment>
      ))}
    </Flex>
  )
}
