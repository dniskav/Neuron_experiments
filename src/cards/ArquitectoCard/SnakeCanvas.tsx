// ─── SnakeCanvas ──────────────────────────────────────────────────────────────
//
// Renderiza el estado del juego Snake en un canvas HTML.
// Redibuja cuando cambia redrawVersion (prop externa).
//

import { useRef, useEffect } from "react";
import { GRID, CELL, CANVAS_SIZE } from "./SnakeEnv";
import type { SnakeState } from "./SnakeEnv";

interface Props {
  stateRef:      React.RefObject<SnakeState>;
  redrawVersion: number;
}

export function SnakeCanvas({ stateRef, redrawVersion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const state  = stateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fondo
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid sutil
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth   = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(CANVAS_SIZE, i * CELL);
      ctx.stroke();
    }

    // Cuerpo (con gradiente de opacidad — más opaco cerca de la cabeza)
    const bodyLen = state.body.length;
    for (let i = bodyLen - 1; i >= 1; i--) {
      const p    = state.body[i];
      const frac = 1 - i / bodyLen;           // 0 en cola, 1 en cabeza
      const alpha = 0.25 + frac * 0.55;
      ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
      const pad = 2;
      ctx.beginPath();
      ctx.roundRect(p.x * CELL + pad, p.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 3);
      ctx.fill();
    }

    // Cabeza
    if (!state.alive) {
      ctx.fillStyle = "#ef4444";
    } else {
      ctx.fillStyle = "#a7f3d0";
    }
    const hx = state.head.x * CELL + 2;
    const hy = state.head.y * CELL + 2;
    ctx.beginPath();
    ctx.roundRect(hx, hy, CELL - 4, CELL - 4, 4);
    ctx.fill();

    // Ojos (solo si viva)
    if (state.alive) {
      // Posición de ojos según dirección
      const eyeOffsets: [number, number][] = [
        // dir 0=arriba: ojos en lados superior
        [CELL * 0.28, CELL * 0.22],
        [CELL * 0.72, CELL * 0.22],
        // dir 1=derecha
        [CELL * 0.72, CELL * 0.28],
        [CELL * 0.72, CELL * 0.72],
        // dir 2=abajo
        [CELL * 0.28, CELL * 0.78],
        [CELL * 0.72, CELL * 0.78],
        // dir 3=izquierda
        [CELL * 0.28, CELL * 0.28],
        [CELL * 0.28, CELL * 0.72],
      ];
      const dir = state.dir;
      const e1 = eyeOffsets[dir * 2];
      const e2 = eyeOffsets[dir * 2 + 1];
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(hx + e1[0], hy + e1[1], 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + e2[0], hy + e2[1], 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Comida
    const fx = state.food.x * CELL + CELL / 2;
    const fy = state.food.y * CELL + CELL / 2;
    ctx.fillStyle = "#f87171";
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    // Brillo
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Score overlay
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font      = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`🍎 ${state.score}`, CANVAS_SIZE - 6, 14);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawVersion]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{ borderRadius: 8, display: "block" }}
    />
  );
}
