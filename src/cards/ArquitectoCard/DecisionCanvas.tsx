// ─── DecisionCanvas ───────────────────────────────────────────────────────────
//
// Canvas HTML 2D que muestra:
//   · Fondo coloreado con la frontera de decisión de la red (grid de predicciones)
//   · Puntos de entrenamiento encima
//   · Emojis en las esquinas como contexto narrativo
//

import { useEffect, useRef } from "react";
import type { NetworkN } from "@dniskav/neuron";
import type { Point } from "./problems";

export const CANVAS_W = 300;
export const CANVAS_H = 300;
const GRID = 44; // resolución de la cuadrícula (44×44 predicciones)

// Colores: índigo = "voy", rojo = "no voy / me matan"
const C_VOY  = [99,  102, 241] as const; // indigo
const C_NOPE = [239,  68,  68] as const; // red

interface Props {
  netRef:       React.RefObject<NetworkN>;
  points:       Point[];
  drawVersion:  number;
  cornerLabels?: [string, string, string, string]; // [bottom-left, bottom-right, top-left, top-right]
}

export function DecisionCanvas({ netRef, points, drawVersion, cornerLabels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const net = netRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Frontera de decisión ────────────────────────────────────────────────
    const cw = CANVAS_W / GRID;
    const ch = CANVAS_H / GRID;

    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const x    = gx / (GRID - 1);
        const y    = 1 - gy / (GRID - 1); // flip Y (canvas Y baja, problema Y sube)
        const pred = net.predict([x, y])[0];
        const [r, g, b] = pred > 0.5 ? C_VOY : C_NOPE;
        // Más opaco cuanto más segura es la predicción
        const alpha = 0.08 + Math.abs(pred - 0.5) * 0.72;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(gx * cw, gy * ch, cw + 1, ch + 1);
      }
    }

    // ── Líneas de cuadrante (referencia visual) ─────────────────────────────
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.moveTo(0, CANVAS_H / 2);      ctx.lineTo(CANVAS_W, CANVAS_H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Puntos de entrenamiento ─────────────────────────────────────────────
    for (const { x, y, label } of points) {
      const px = x * CANVAS_W;
      const py = (1 - y) * CANVAS_H;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle   = label === 1 ? "#6366f1" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // ── Etiquetas en esquinas (opcionales) ────────────────────────────────
    if (cornerLabels) {
      ctx.font         = "18px serif";
      ctx.textBaseline = "middle";
      ctx.textAlign    = "left";
      ctx.fillText(cornerLabels[0], 6,           CANVAS_H - 13); // bottom-left
      ctx.fillText(cornerLabels[2], 6,           13);             // top-left
      ctx.textAlign = "right";
      ctx.fillText(cornerLabels[1], CANVAS_W - 6, CANVAS_H - 13); // bottom-right
      ctx.fillText(cornerLabels[3], CANVAS_W - 6, 13);             // top-right
    }

  }, [drawVersion, netRef, points]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        display:      "block",
        borderRadius: 8,
        border:       "1px solid #e2e8f0",
      }}
    />
  );
}
