import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkN } from "@dniskav/neuron";
import { type Escena } from "../../data/fisicas";
import { generarDatos, desnormAngulo, type EjemploTiro } from "../../data/datosAngryBird";

const ESTRUCTURA       = [3, 16, 8, 1];
const TASA             = 0.05;
const N_DATOS          = 400;
const EPOCAS_POR_FRAME = 3;
export const ESCENA_INICIAL: Escena = { xObstaculo: 7, hObstaculo: 6, xBlanco: 15 };

export function useAngryBirdTraining(
  anguloPredRef: React.MutableRefObject<number | null>,
  escenaRef: React.MutableRefObject<Escena>,
  setAnguloPred: (v: number | null) => void,
  setEscena: (v: Escena) => void,
) {
  const redRef       = useRef<NetworkN>(new NetworkN(ESTRUCTURA));
  const datosRef     = useRef<EjemploTiro[]>(generarDatos(N_DATOS));
  const animFrameRef = useRef<number | null>(null);

  const [epocas,     setEpocas]     = useState(0);
  const [errorDeg,   setErrorDeg]   = useState<number | null>(null);
  const [precision,  setPrecision]  = useState<number | null>(null);
  const [entrenando, setEntrenando] = useState(false);

  const getPred = useCallback((esc: Escena): number => {
    const norm = redRef.current.predict([
      esc.xBlanco    / 18,
      esc.xObstaculo / 12,
      esc.hObstaculo / 9,
    ])[0];
    return desnormAngulo(norm);
  }, []);

  const calcularStats = useCallback(() => {
    let totalError = 0, aciertos = 0;
    datosRef.current.forEach(({ entradas, angulo }) => {
      const pred   = desnormAngulo(redRef.current.predict(entradas)[0]);
      const errDeg = Math.abs(pred - angulo) * (180 / Math.PI);
      totalError  += errDeg;
      if (errDeg < 5) aciertos++;
    });
    return {
      error:     totalError / datosRef.current.length,
      precision: aciertos  / datosRef.current.length,
    };
  }, []);

  const redibujar = useCallback((esc?: Escena) => {
    const e = esc ?? escenaRef.current;
    const pred = getPred(e);
    anguloPredRef.current = pred;
    setAnguloPred(pred);
  }, [getPred, escenaRef, anguloPredRef, setAnguloPred]);

  useEffect(() => { redibujar(); }, []);  // solo al montar

  const hacerEpoca = useCallback(() => {
    const shuffled = [...datosRef.current].sort(() => Math.random() - 0.5);
    shuffled.forEach(({ entradas, salida }) => {
      redRef.current.train(entradas, [salida], TASA);
    });
  }, []);

  const bucle = useCallback(() => {
    for (let i = 0; i < EPOCAS_POR_FRAME; i++) hacerEpoca();
    const stats = calcularStats();
    setEpocas(e => e + EPOCAS_POR_FRAME);
    setErrorDeg(stats.error);
    setPrecision(stats.precision);
    redibujar();
    animFrameRef.current = requestAnimationFrame(bucle);
  }, [hacerEpoca, calcularStats, redibujar]);

  const iniciar = useCallback(() => {
    if (entrenando) return;
    setEntrenando(true);
    animFrameRef.current = requestAnimationFrame(bucle);
  }, [entrenando, bucle]);

  const pausar = useCallback(() => {
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    setEntrenando(false);
  }, []);

  useEffect(() => () => {
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const pasoUnico = useCallback(() => {
    if (entrenando) return;
    hacerEpoca();
    const stats = calcularStats();
    setEpocas(e => e + 1);
    setErrorDeg(stats.error);
    setPrecision(stats.precision);
    redibujar();
  }, [entrenando, hacerEpoca, calcularStats, redibujar]);

  const resetear = useCallback(() => {
    pausar();
    redRef.current    = new NetworkN(ESTRUCTURA);
    datosRef.current  = generarDatos(N_DATOS);
    escenaRef.current = { ...ESCENA_INICIAL };
    setEscena({ ...ESCENA_INICIAL });
    setEpocas(0); setErrorDeg(null); setPrecision(null); setAnguloPred(null);
    anguloPredRef.current = null;
    setTimeout(() => redibujar({ ...ESCENA_INICIAL }), 0);
  }, [pausar, redibujar, escenaRef, setEscena, anguloPredRef, setAnguloPred]);

  return {
    redRef,
    datosRef,
    epocas,
    errorDeg,
    precision,
    entrenando,
    getPred,
    calcularStats,
    redibujar,
    hacerEpoca,
    bucle,
    iniciar,
    pausar,
    pasoUnico,
    resetear,
  };
}
