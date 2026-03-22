import { useState, useCallback } from "react";
import { Neuron } from "@dniskav/neuron";
import { saveWeightsSimple, loadWeightsSimple, deleteWeights } from "../../data/storage";

import type { NeuronTrainingProps } from "./types";

export function useNeuronTraining({ titulo, umbral, datos }: NeuronTrainingProps) {
  const clave = `neurona_${titulo}`;

  const [neurona, setNeuron] = useState<Neuron>(() => {
    const n = new Neuron();
    const guardado = loadWeightsSimple(clave);
    if (guardado) { n.weight = guardado.weight; n.bias = guardado.bias; }
    return n;
  });
  const [epocas, setEpocas] = useState<string>("500");
  const [totalEpocas, setTotalEpocas] = useState(() => loadWeightsSimple(clave)?.totalEpocas ?? 0);
  const [cargadoDeMemoria] = useState(() => !!loadWeightsSimple(clave));
  const [entrenando, setEntrenando] = useState(false);
  const [normalizar, setNormalizar] = useState(false);

  // Z-score helpers
  const edades = datos.map(([e]) => e);
  const media = edades.reduce((a, b) => a + b, 0) / edades.length;
  const std = Math.sqrt(edades.reduce((a, b) => a + (b - media) ** 2, 0) / edades.length);
  const escalar = (e: number) => normalizar ? (e - media) / std : e;
  const umbralNorm = ((umbral - media) / std).toFixed(3);

  const train = useCallback(() => {
    const n = Number(epocas);
    if (isNaN(n) || n <= 0) return;
    setEntrenando(true);
    // Capturamos media/std aquí para evitar closures desactualizados
    const _edades = datos.map(([e]) => e);
    const _media = _edades.reduce((a, b) => a + b, 0) / _edades.length;
    const _std = Math.sqrt(_edades.reduce((a, b) => a + (b - _media) ** 2, 0) / _edades.length);
    const escalarLocal = (e: number) => normalizar ? (e - _media) / _std : e;
    setTimeout(() => {
      const nueva = new Neuron();
      nueva.weight = neurona.weight;
      nueva.bias = neurona.bias;
      for (let e = 0; e < n; e++) {
        for (const [edad, correcto] of datos) {
          nueva.train(escalarLocal(edad), correcto, 0.01);
        }
        // Si los pesos se vuelven NaN (divergencia numérica), abortamos
        if (isNaN(nueva.weight) || isNaN(nueva.bias)) {
          nueva.weight = 0;
          nueva.bias = 0;
          break;
        }
      }
      setNeuron(nueva);
      setTotalEpocas((prev) => {
        const total = prev + n;
        saveWeightsSimple(clave, { weight: nueva.weight, bias: nueva.bias, totalEpocas: total });
        return total;
      });
      setEntrenando(false);
    }, 10);
  }, [neurona, epocas, datos, normalizar, umbral, clave]);

  const reiniciar = useCallback(() => {
    deleteWeights(clave);
    setNeuron(new Neuron());
    setTotalEpocas(0);
  }, [clave]);

  const toggleNormalizar = useCallback(() => {
    // Cambiar la escala con la neurona entrenada no tiene sentido, reiniciamos
    setNormalizar((prev) => !prev);
    reiniciar();
  }, [reiniciar]);

  return {
    neurona,
    epocas,
    setEpocas,
    totalEpocas,
    cargadoDeMemoria,
    entrenando,
    normalizar,
    train,
    reiniciar,
    toggleNormalizar,
    // Z-score helpers
    media,
    std,
    escalar,
    umbralNorm,
  };
}
