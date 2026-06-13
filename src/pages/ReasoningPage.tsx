// ─── Razonamiento y restricciones ────────────────────────────────────────────

import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { SudokuCard } from '../cards/SudokuCard'
import { TransformerSudokuCard } from '../cards/SudokuCard/TransformerSudokuCard'
import { TextGeneratorCard } from '../cards/TextGeneratorCard'

export function ReasoningPage() {
  return (
    <Box minH="100vh" bg="#0f172a">

      {/* Intro */}
      <Box py={10} px={6} textAlign="center">
        <Heading size="2xl" color="white" mb={2}>Razonamiento con restricciones</Heading>
        <Text color="gray.400" fontSize="md" maxW="560px" mx="auto">
          Problemas donde la solución es exactamente verificable.
          ¿Puede una red neuronal aprender lógica, no solo patrones?
        </Text>
      </Box>

      <Flex direction="column" gap={16} px={{ base: 4, md: 8 }} pb={16} maxW="1200px" mx="auto">

        {/* Sudoku MLP */}
        <Box>
          <Flex align="center" gap={3} mb={6}>
            <Text fontSize="28px" lineHeight={1}>🔢</Text>
            <Box>
              <Heading size="lg" color="white">Sudoku Solver — MLP</Heading>
              <Text fontSize="13px" color="gray.500">
                Red supervisada entrenada con puzzles generados · inferencia iterativa
              </Text>
            </Box>
          </Flex>
          <SudokuCard />
        </Box>

        {/* Divider */}
        <Box h="1px" bg="rgba(255,255,255,0.06)" />

        {/* Sudoku Transformer */}
        <Box>
          <Flex align="center" gap={3} mb={6}>
            <Text fontSize="28px" lineHeight={1}>🧠</Text>
            <Box>
              <Heading size="lg" color="white">Sudoku Solver — Transformer</Heading>
              <Text fontSize="13px" color="gray.500">
                Self-attention · cada celda atiende a todas las demás · cabezas aprenden filas, columnas y cajas
              </Text>
            </Box>
          </Flex>
          <TransformerSudokuCard />
        </Box>

        {/* Divider */}
        <Box h="1px" bg="rgba(255,255,255,0.06)" />

        {/* Text Generator */}
        <Box>
          <Flex align="center" gap={3} mb={6}>
            <Text fontSize="28px" lineHeight={1}>✍️</Text>
            <Box>
              <Heading size="lg" color="white">Generador de texto — Transformer</Heading>
              <Text fontSize="13px" color="gray.500">
                Modelo de lenguaje a nivel de caracteres · predice el siguiente carácter dado el contexto anterior
              </Text>
            </Box>
          </Flex>
          <TextGeneratorCard />
        </Box>

      </Flex>
    </Box>
  )
}
