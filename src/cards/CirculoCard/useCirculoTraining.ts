import { useRef, useState, useCallback, useEffect } from "react";
import { Network } from "@dniskav/neuron";
import { generarDatosCirculo, type PuntoCirculo } from "../../data/datosCirculo";

const N_OCULTAS = 24;
const TASA = 0.3;
const EJEMPLOS_INICIALES = 500;
const EPOCAS_POR_FRAME = 5;

export function crearRed(): Network { return new Network(2, N_OCULTAS, 1); }

export function useCirculoTraining() {
  const redRef    = useRef<Network>(crearRed());
  const puntosRef = useRef<PuntoCirculo[]>(generarDatosCirculo(EJEMPLOS_INICIALES));
  const animFrameRef = useRef<number | null>(null);

  const [epocas,     setEpocas]     = useState(0);
  const [error,      setError]      = useState<number | null>(null);
  const [correcto,   setCorrecto]   = useState<number | null>(null);
  const [entrenando, setEntrenando] = useState(false);

  const hacerEpoca = useCallback((): number => {
    const shuffled = [...puntosRef.current].sort(() => Math.random() - 0.5);
    let errorTotal = 0;
    shuffled.forEach(({ x, y, dentro }) => {
      errorTotal += redRef.current.train([x, y], dentro, TASA);
    });
    return errorTotal / puntosRef.current.length;
  }, []);

  const calcularPrecision = useCallback((): number => {
    let aciertos = 0;
    puntosRef.current.forEach(({ x, y, dentro }) => {
      if ((redRef.current.predict([x, y]) >= 0.5 ? 1 : 0) === dentro) aciertos++;
    });
    return aciertos / puntosRef.current.length;
  }, []);

  const paso = useCallback(() => {
    let err = 0;
    for (let i = 0; i < EPOCAS_POR_FRAME; i++) err = hacerEpoca();
    setEpocas(e => e + EPOCAS_POR_FRAME);
    setError(err);
    setCorrecto(calcularPrecision());
    animFrameRef.current = requestAnimationFrame(paso);
  }, [hacerEpoca, calcularPrecision]);

  const iniciarEntrenamiento = useCallback(() => {
    if (entrenando) return;
    setEntrenando(true);
    animFrameRef.current = requestAnimationFrame(paso);
  }, [entrenando, paso]);

  const pausarEntrenamiento = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setEntrenando(false);
  }, []);

  useEffect(() => {
    return () => { if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const pasoUnico = useCallback(() => {
    if (entrenando) return;
    const err = hacerEpoca();
    setEpocas(e => e + 1);
    setError(err);
    setCorrecto(calcularPrecision());
  }, [entrenando, hacerEpoca, calcularPrecision]);

  const resetear = useCallback((cx: number, cy: number, radio: number) => {
    pausarEntrenamiento();
    redRef.current = crearRed();
    puntosRef.current = generarDatosCirculo(EJEMPLOS_INICIALES, cx, cy, radio);
    setEpocas(0); setError(null); setCorrecto(null);
  }, [pausarEntrenamiento]);

  return {
    redRef,
    puntosRef,
    epocas,
    error,
    correcto,
    entrenando,
    iniciarEntrenamiento,
    pausarEntrenamiento,
    pasoUnico,
    resetear,
  };
}
