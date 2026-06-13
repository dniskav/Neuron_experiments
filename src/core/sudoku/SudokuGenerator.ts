// ─── SudokuGenerator ──────────────────────────────────────────────────────────
//
// Generador puro de puzzles Sudoku. Sin dependencias externas.
//
// Board: number[] de 81 elementos, row-major.
//   0       = celda vacía
//   1 - 9   = dígito colocado
//
// Algoritmo:
//   1. Generar tablero completo válido (backtracking + shuffle)
//   2. Quitar celdas de una en una verificando solución única
//   3. Parar al llegar al número de celdas vacías según dificultad
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface SudokuPuzzle {
  puzzle:     number[]    // 81 valores, 0 = vacío
  solution:   number[]    // 81 valores, resuelto
  difficulty: Difficulty
  clues:      number      // celdas dadas (81 - vacíos)
}

// ── Constantes ────────────────────────────────────────────────────────────────

const CELLS_TO_REMOVE: Record<Difficulty, number> = {
  easy:   30,
  medium: 40,
  hard:   50,
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValidPlacement(board: number[], index: number, num: number): boolean {
  const row = Math.floor(index / 9)
  const col = index % 9

  for (let c = 0; c < 9; c++)
    if (board[row * 9 + c] === num) return false

  for (let r = 0; r < 9; r++)
    if (board[r * 9 + col] === num) return false

  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r * 9 + c] === num) return false

  return true
}

/** Rellena el tablero con backtracking + shuffle para aleatorizar. */
function fillBoard(board: number[]): boolean {
  const empty = board.indexOf(0)
  if (empty === -1) return true

  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValidPlacement(board, empty, num)) {
      board[empty] = num
      if (fillBoard(board)) return true
      board[empty] = 0
    }
  }
  return false
}

/**
 * Cuenta soluciones hasta `limit` (para verificar unicidad).
 * Si retorna > 1 el puzzle tiene múltiples soluciones.
 */
function countSolutions(board: number[], limit = 2): number {
  const empty = board.indexOf(0)
  if (empty === -1) return 1

  let count = 0
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, empty, num)) {
      board[empty] = num
      count += countSolutions(board, limit)
      board[empty] = 0
      if (count >= limit) return count
    }
  }
  return count
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Genera un puzzle con solución única garantizada. */
export function generatePuzzle(difficulty: Difficulty = 'medium'): SudokuPuzzle {
  const solution = new Array(81).fill(0)
  fillBoard(solution)

  const puzzle  = [...solution]
  const indices = shuffle(Array.from({ length: 81 }, (_, i) => i))
  let   removed = 0

  for (const idx of indices) {
    if (removed >= CELLS_TO_REMOVE[difficulty]) break
    const backup  = puzzle[idx]
    puzzle[idx]   = 0
    const test    = [...puzzle]
    if (countSolutions(test) === 1) {
      removed++
    } else {
      puzzle[idx] = backup   // restaurar si rompe unicidad
    }
  }

  return { puzzle, solution, difficulty, clues: 81 - removed }
}

/** Resuelve un tablero en su sitio. Retorna true si encontró solución. */
export function solvePuzzle(board: number[]): boolean {
  const empty = board.indexOf(0)
  if (empty === -1) return true

  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, empty, num)) {
      board[empty] = num
      if (solvePuzzle(board)) return true
      board[empty] = 0
    }
  }
  return false
}

/** Verifica si el tablero es una solución correcta del puzzle dado. */
export function isSolved(board: number[], solution: number[]): boolean {
  return board.every((v, i) => v === solution[i])
}

/** Verifica si una colocación es válida sin modificar el tablero. */
export function isValidMove(board: number[], index: number, num: number): boolean {
  if (board[index] !== 0) return false
  return isValidPlacement(board, index, num)
}

/**
 * Retorna los candidatos válidos para una celda vacía.
 * Útil para el solver iterativo y para mostrar "pencil marks" en la UI.
 */
export function getCandidates(board: number[], index: number): number[] {
  if (board[index] !== 0) return []
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => isValidPlacement(board, index, n))
}

/**
 * Codifica el tablero como vector one-hot para la red neuronal.
 * Salida: Float32Array de 729 valores (81 celdas × 9 dígitos).
 *   celda vacía  → todos 0
 *   celda con n  → posición n-1 = 1
 */
export function encodeBoard(board: number[]): Float32Array {
  const out = new Float32Array(729)
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) out[i * 9 + (board[i] - 1)] = 1
  }
  return out
}

/**
 * Decodifica la salida de la red (729 logits) a un tablero de 81 dígitos.
 * Por cada celda toma el argmax de los 9 logits.
 */
export function decodeOutput(logits: number[], puzzle: number[]): number[] {
  return Array.from({ length: 81 }, (_, i) => {
    if (puzzle[i] !== 0) return puzzle[i]   // respetar celdas dadas
    let best = 0
    for (let d = 1; d < 9; d++) {
      if (logits[i * 9 + d] > logits[i * 9 + best]) best = d
    }
    return best + 1
  })
}

/**
 * Codifica la solución completa como vector one-hot (target para el entrenamiento).
 */
export function encodeSolution(solution: number[]): Float32Array {
  return encodeBoard(solution)
}
