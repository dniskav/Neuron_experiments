import { useRef, useState, useCallback, useEffect } from "react";
import { NetworkN } from "@dniskav/neuron";
import { xAterrizaje, type Escena } from "../../data/fisicas";
import { generarDatosCañon, desnormAngulo, desnormV0, type EjemploCañon } from "../../data/datosCañon";
import { tiroCorrecto } from "./CañonScene";

const ESTRUCTURA       = [3, 24, 16, 2];
const TASA             = 0.06;
const N_DATOS          = 800;
const EPOCAS_POR_FRAME = 15;
export const ESCENA_INICIAL: Escena = { xObstaculo: 5, hObstaculo: 4, xBlanco: 11 };

export function useCañonTraining(
  predRef: React.MutableRefObject<{ angulo: number; v0: number } | null>,
  escenaRef: React.MutableRefObject<Escena>,
  setPred: (v: { angulo: number; v0: number } | null) => void,
  setEscena: (v: Escena) => void,
) {
  const redRef       = useRef<NetworkN>(new NetworkN(ESTRUCTURA));
  const datosRef     = useRef<EjemploCañon[]>(generarDatosCañon(N_DATOS));
  const animFrameRef = useRef<number | null>(null);

  const [epocas,     setEpocas]     = useState(0);
  const [errorDeg,   setErrorDeg]   = useState<number | null>(null);
  const [precision,  setPrecision]  = useState<number | null>(null);
  const [entrenando, setEntrenando] = useState(false);

  const getPred = useCallback((esc: Escena) => {
    const [aNorm, vNorm] = redRef.current.predict([
      esc.xBlanco    / 20,
      esc.xObstaculo / 12,
      esc.hObstaculo / 8,
    ]);
    return { angulo: desnormAngulo(aNorm), v0: desnormV0(vNorm) };
  }, []);

  const calcularStats = useCallback(() => {
    let totalErrDist = 0, aciertos = 0;
    datosRef.current.forEach(({ entradas, escena }) => {
      const [aN, vN] = redRef.current.predict(entradas);
      const aPred = desnormAngulo(aN);
      const vPred = desnormV0(vN);
      totalErrDist += Math.abs(xAterrizaje(aPred, vPred) - escena.xBlanco);
      if (tiroCorrecto(escena, aPred, vPred)) aciertos++;
    });
    const n = datosRef.current.length;
    return { errorDist: totalErrDist / n, precision: aciertos / n };
  }, []);

  const redibujar = useCallback((esc?: Escena): boolean => {
    const e = esc ?? escenaRef.current;
    const p = getPred(e);
    predRef.current = p;
    setPred(p);
    return tiroCorrecto(e, p.angulo, p.v0);
  }, [getPred, escenaRef, predRef, setPred]);

  useEffect(() => { redibujar(); }, []);

  const hacerEpoca = useCallback(() => {
    const shuffled = [...datosRef.current].sort(() => Math.random() - 0.5);
    shuffled.forEach(({ entradas, salidas }) => {
      redRef.current.train(entradas, salidas, TASA);
    });
  }, []);

  const bucle = useCallback(() => {
    for (let i = 0; i < EPOCAS_POR_FRAME; i++) hacerEpoca();
    const stats = calcularStats();
    setEpocas(e => e + EPOCAS_POR_FRAME);
    setErrorDeg(stats.errorDist);
    setPrecision(stats.precision);
    const golpea = redibujar();
    if (golpea) {
      animFrameRef.current = null;
      setEntrenando(false);
      return;
    }
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
    setErrorDeg(stats.errorDist);
    setPrecision(stats.precision);
    redibujar();
  }, [entrenando, hacerEpoca, calcularStats, redibujar]);

  const resetear = useCallback(() => {
    pausar();
    redRef.current = new NetworkN(ESTRUCTURA);
    escenaRef.current = { ...ESCENA_INICIAL };
    setEscena({ ...ESCENA_INICIAL });
    setEpocas(0); setErrorDeg(null); setPrecision(null); setPred(null);
    predRef.current = null;
    setTimeout(() => redibujar({ ...ESCENA_INICIAL }), 0);
  }, [pausar, redibujar, escenaRef, setEscena, predRef, setPred]);

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
