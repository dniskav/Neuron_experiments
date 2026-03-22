import { useState, useCallback, useMemo } from 'react'
import { NeuronN } from '@dniskav/neuron'
import { generarDatos, type MuestraColor } from '../../data/datosColor'
import { saveWeightsN, deleteWeights } from '../../data/storage'
import { loadWeightsN } from '../../data/storage'
import { CLAVE_N1, CLAVE_N2, MUESTRAS, rgbToHex, crearNeuronaN } from './utils'
import { clasificar as clasificarUtil } from '../../data/datosColor'

export function useColorTraining() {
  const [n1, setN1] = useState(() => crearNeuronaN(CLAVE_N1))
  const [n2, setN2] = useState(() => crearNeuronaN(CLAVE_N2))
  const [datos] = useState<MuestraColor[]>(() => generarDatos(1000))
  const [epocas, setEpocas] = useState('500')
  const [totalEpocas, setTotalEpocas] = useState(() => loadWeightsN(CLAVE_N1)?.totalEpocas ?? 0)
  const [cargadoDeMemoria] = useState(() => !!loadWeightsN(CLAVE_N1))
  const [entrenando, setEntrenando] = useState(false)

  const entrenar = useCallback(() => {
    const n = Number(epocas)
    if (isNaN(n) || n <= 0) return
    setEntrenando(true)
    setTimeout(() => {
      const nueva1 = crearNeuronaN(CLAVE_N1)
      nueva1.weights = [...n1.weights]
      nueva1.bias = n1.bias
      const nueva2 = crearNeuronaN(CLAVE_N2)
      nueva2.weights = [...n2.weights]
      nueva2.bias = n2.bias

      for (let e = 0; e < n; e++) {
        for (const { r, g, b, esMuyClaro, esMuyOscuro } of datos) {
          nueva1.train([r, g, b], esMuyClaro, 0.01)
          nueva2.train([r, g, b], esMuyOscuro, 0.01)
        }
        if ([...nueva1.weights, nueva1.bias, ...nueva2.weights, nueva2.bias].some(isNaN)) {
          nueva1.weights = [0, 0, 0]
          nueva1.bias = 0
          nueva2.weights = [0, 0, 0]
          nueva2.bias = 0
          break
        }
      }
      setN1(nueva1)
      setN2(nueva2)
      setTotalEpocas((prev) => {
        const total = prev + n
        saveWeightsN(CLAVE_N1, { weights: nueva1.weights, bias: nueva1.bias, totalEpocas: total })
        saveWeightsN(CLAVE_N2, { weights: nueva2.weights, bias: nueva2.bias, totalEpocas: total })
        return total
      })
      setEntrenando(false)
    }, 10)
  }, [n1, n2, epocas, datos])

  const reiniciar = useCallback(() => {
    deleteWeights(CLAVE_N1)
    deleteWeights(CLAVE_N2)
    setN1(new NeuronN(3))
    setN2(new NeuronN(3))
    setTotalEpocas(0)
  }, [])

  const muestras = useMemo(
    () =>
      MUESTRAS.map((m) => {
        const s1 = n1.predict([m.r, m.g, m.b])
        const s2 = n2.predict([m.r, m.g, m.b])
        return { ...m, clase: clasificarUtil(s1, s2), hex: rgbToHex(m.r, m.g, m.b) }
      }),
    [n1, n2]
  )

  return {
    n1,
    n2,
    datos,
    epocas,
    setEpocas,
    totalEpocas,
    cargadoDeMemoria,
    entrenando,
    entrenar,
    reiniciar,
    muestras
  }
}
