import { describe, it, expect } from 'vitest'
import { NeuronN } from '@dniskav/neuron'

// Generador de datos de color (simplificado de datosColor.ts)
function generarDatos(n: number) {
  const datos: Array<{ r: number; g: number; b: number; esMuyClaro: number; esMuyOscuro: number }> = []
  for (let i = 0; i < n; i++) {
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    const luminancia = 0.299 * r + 0.587 * g + 0.114 * b
    datos.push({
      r, g, b,
      esMuyClaro: luminancia > 0.75 ? 1 : 0,
      esMuyOscuro: luminancia < 0.25 ? 1 : 0,
    })
  }
  return datos
}

function clasificar(s1: number, s2: number) {
  if (s1 > 0.5 && s2 <= 0.5) return 'claro'
  if (s2 > 0.5 && s1 <= 0.5) return 'oscuro'
  return 'normal'
}

describe('Integration: ColorCard NeuronN training', () => {
  it('NeuronN learns to classify light vs dark colors', () => {
    const n1 = new NeuronN(3)
    const n2 = new NeuronN(3)
    const datos = generarDatos(500)

    // Entrenar
    for (let e = 0; e < 100; e++) {
      for (const { r, g, b, esMuyClaro, esMuyOscuro } of datos) {
        n1.train([r, g, b], esMuyClaro, 0.01)
        n2.train([r, g, b], esMuyOscuro, 0.01)
      }
    }

    // Evaluar: un color muy claro (blanco) debe ser clasificado como claro
    const blanco = n1.predict([1, 1, 1])
    const negro = n2.predict([0, 0, 0])

    expect(blanco).toBeGreaterThan(0.5)
    expect(negro).toBeGreaterThan(0.5)

    // Un color intermedio (gris) debe ser clasificado como normal
    const gris1 = n1.predict([0.5, 0.5, 0.5])
    const gris2 = n2.predict([0.5, 0.5, 0.5])
    expect(clasificar(gris1, gris2)).toBe('normal')
  }, 30000)

  it('NeuronN does not produce NaN during color training', () => {
    const n1 = new NeuronN(3)
    const n2 = new NeuronN(3)
    const datos = generarDatos(100)

    for (let e = 0; e < 50; e++) {
      for (const { r, g, b, esMuyClaro, esMuyOscuro } of datos) {
        n1.train([r, g, b], esMuyClaro, 0.01)
        n2.train([r, g, b], esMuyOscuro, 0.01)
      }
    }

    expect([...n1.weights, n1.bias, ...n2.weights, n2.bias].some(isNaN)).toBe(false)
  })
})
