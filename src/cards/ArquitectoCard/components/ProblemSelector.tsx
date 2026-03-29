import { Flex, Button, Box } from '@chakra-ui/react'
import type { Problem } from '../data/problems'

const NIVEL_COLOR: Record<number, string> = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' }

export function ProblemSelector({
  selected,
  onChange,
  problems,
  solved
}: {
  selected: Problem
  onChange: (p: Problem) => void
  problems: Problem[]
  solved: Set<string>
}) {
  return (
    <Flex gap={2} flexWrap="wrap" justify="center">
      {problems.map((p) => {
        const isSolved = solved.has(p.id)
        return (
          <Button
            key={p.id}
            size="sm"
            variant={selected.id === p.id ? 'solid' : 'subtle'}
            colorPalette={selected.id === p.id ? 'violet' : 'gray'}
            onClick={() => onChange(p)}
            borderWidth={selected.id === p.id ? 0 : '1.5px'}
            borderColor="gray.200">
            <Box
              as="span"
              display="inline-block"
              w="8px"
              h="8px"
              borderRadius="full"
              bg={NIVEL_COLOR[p.nivel]}
              mr={1}
              flexShrink={0}
            />
            {p.emoji} {p.titulo}
            {isSolved && (
              <Box as="span" ml={1} fontSize="10px" color="#4ade80" fontWeight={800}>
                ✓
              </Box>
            )}
          </Button>
        )
      })}
    </Flex>
  )
}
