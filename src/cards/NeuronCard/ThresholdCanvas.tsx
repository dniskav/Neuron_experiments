// ─── ThresholdCanvas ──────────────────────────────────────────────────────────
//
// Canvas que muestra la decisión de una neurona 1-D:
//   · Fondo coloreado por predicción (positivo/negativo)
//   · Curva sigmoide real
//   · Línea de umbral y= 0.5
//   · Puntos de entrenamiento en y = label (0 ó 1)
//

import { useEffect, useRef } from "react";
import type { Neuron } from "@dniskav/neuron";

export const CANVAS_W = 360;
export const CANVAS_H = 160;
const COLS = 80;   // resolución del fondo
const PAD  = 28;   // margen para ejes

// Colores de clase
const C_POS = [99,  102, 241] as const; // indigo
const C_NEG = [239,  68,  68] as const; // red

interface Props {
  neurona:     Neuron;
  escalar:     (age: number) => number;
  datos:       [number, number][];
  edadesRange: [number, number];
  drawVersion: number;
}

export function ThresholdCanvas({ neurona, escalar, datos, edadesRange, drawVersion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [ageMin, ageMax] = edadesRange;
    const ageSpan = ageMax - ageMin;

    // Canvas coordinates helpers
    const xFromAge  = (age: number)  => PAD + ((age - ageMin) / ageSpan) * (CANVAS_W - PAD * 2);
    const yFromProb = (prob: number) => PAD + (1 - prob) * (CANVAS_H - PAD * 2);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── 1. Fondo coloreado por predicción ─────────────────────────────────
    const colW = (CANVAS_W - PAD * 2) / COLS;
    for (let c = 0; c < COLS; c++) {
      const age  = ageMin + (c / (COLS - 1)) * ageSpan;
      const pred = neurona.predict(escalar(age));
      const [r, g, b] = pred >= 0.5 ? C_POS : C_NEG;
      const alpha = 0.06 + Math.abs(pred - 0.5) * 0.60;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(PAD + c * colW, PAD, colW + 1, CANVAS_H - PAD * 2);
    }

    // ── 2. Cuadrícula sutil ───────────────────────────────────────────────
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 4]);
    // Horizontales a 25 %, 75 %
    for (const prob of [0.25, 0.75]) {
      const y = yFromProb(prob);
      ctx.beginPath();
      ctx.moveTo(PAD, y); ctx.lineTo(CANVAS_W - PAD, y);
      ctx.stroke();
    }
    // Verticales cada 25 % del rango de edades
    for (const frac of [0.25, 0.5, 0.75]) {
      const x = PAD + frac * (CANVAS_W - PAD * 2);
      ctx.beginPath();
      ctx.moveTo(x, PAD); ctx.lineTo(x, CANVAS_H - PAD);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── 3. Borde del área de plot ─────────────────────────────────────────
    ctx.strokeStyle = "rgba(148,163,184,0.30)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(PAD, PAD, CANVAS_W - PAD * 2, CANVAS_H - PAD * 2);

    // ── 4. Línea umbral y = 0.5 (dashed) ─────────────────────────────────
    const yThresh = yFromProb(0.5);
    ctx.strokeStyle = "rgba(250,250,250,0.45)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(PAD, yThresh); ctx.lineTo(CANVAS_W - PAD, yThresh);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── 5. Curva sigmoide ─────────────────────────────────────────────────
    ctx.beginPath();
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    const steps = CANVAS_W - PAD * 2;
    for (let px = 0; px <= steps; px++) {
      const age  = ageMin + (px / steps) * ageSpan;
      const prob = neurona.predict(escalar(age));
      const cx   = PAD + px;
      const cy   = yFromProb(prob);
      px === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // ── 6. Línea de frontera (donde sigmoid cruza 0.5) ────────────────────
    // Búsqueda binaria del cruce
    let lo = ageMin, hi = ageMax;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      neurona.predict(escalar(mid)) >= 0.5 ? (hi = mid) : (lo = mid);
    }
    const boundaryAge = (lo + hi) / 2;
    const bx = xFromAge(boundaryAge);
    if (bx >= PAD && bx <= CANVAS_W - PAD) {
      ctx.strokeStyle = "rgba(250,250,250,0.65)";
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bx, PAD); ctx.lineTo(bx, CANVAS_H - PAD);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── 7. Puntos de entrenamiento ────────────────────────────────────────
    for (const [age, label] of datos) {
      const px = xFromAge(age);
      const py = yFromProb(label);
      if (px < PAD || px > CANVAS_W - PAD) continue;
      const [r, g, b] = label === 1 ? C_POS : C_NEG;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle   = `rgb(${r},${g},${b})`;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }

    // ── 8. Etiquetas de eje ───────────────────────────────────────────────
    ctx.fillStyle = "rgba(148,163,184,0.80)";
    ctx.font      = "10px system-ui, sans-serif";

    // Y: 0 y 1
    ctx.textAlign    = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("1", PAD - 4, yFromProb(1));
    ctx.fillText("0", PAD - 4, yFromProb(0));
    ctx.fillText(".5", PAD - 4, yFromProb(0.5));

    // X: ageMin, ageMax
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(ageMin), PAD, CANVAS_H - PAD + 4);
    ctx.fillText(String(ageMax), CANVAS_W - PAD, CANVAS_H - PAD + 4);
    if (bx >= PAD && bx <= CANVAS_W - PAD) {
      ctx.fillStyle = "rgba(250,250,250,0.65)";
      ctx.fillText(boundaryAge.toFixed(0), bx, CANVAS_H - PAD + 4);
    }

  }, [drawVersion, neurona, escalar, datos, edadesRange]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        display:      "block",
        borderRadius: 8,
        border:       "1px solid #e2e8f0",
        background:   "#0f172a",
      }}
    />
  );
}
