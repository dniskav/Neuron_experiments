// ─── MazeCanvas2D ─────────────────────────────────────────────────────────────
//
// Renderiza el laberinto en Canvas 2D (sin Three.js).
// Escala el canvas a SCALE para encajar en el layout del Arquitecto.
//

import { useRef, useEffect } from "react";
import {
  MAZE, COLS, ROWS, TILE, CW, CH,
  GOAL, GOAL_R, WAYPOINTS,
  AGENT_R, SENSOR_ANGLES, MAX_RAY,
  leerSensores,
  type Agente,
} from "../../data/laberinto";

export const SCALE   = 0.58;
export const MAZE_W  = Math.round(CW * SCALE); // ≈ 313
export const MAZE_H  = Math.round(CH * SCALE); // ≈ 244

interface Props {
  agenteRef:     React.RefObject<Agente>;
  trailRef:      React.RefObject<Array<{ x: number; y: number }>>;
  wpRef:         React.RefObject<Set<number>>;
  redrawVersion: number;
  showSensors?:  boolean;
}

export function MazeCanvas2D({ agenteRef, trailRef, wpRef, redrawVersion, showSensors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ag     = agenteRef.current;
    if (!canvas || !ag) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(SCALE, SCALE);

    // ── Fondo total (muro) ────────────────────────────────────────────────────
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CW, CH);

    // ── Celdas transitables ───────────────────────────────────────────────────
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          ctx.fillStyle = "#1e3a5f";
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
    }

    // ── Grid sutil ────────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth   = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(CW, r * TILE); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, CH); ctx.stroke();
    }

    // ── Meta ──────────────────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(249,115,22,0.12)";
    ctx.beginPath();
    ctx.arc(GOAL.x, GOAL.y, GOAL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(GOAL.x, GOAL.y, GOAL_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle   = "#f97316";
    ctx.font        = "bold 11px monospace";
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("META", GOAL.x, GOAL.y);

    // ── Inicio ────────────────────────────────────────────────────────────────
    ctx.fillStyle   = "rgba(148,163,184,0.45)";
    ctx.font        = "10px monospace";
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", TILE * 0.5, TILE * 0.5);

    // ── Waypoints ─────────────────────────────────────────────────────────────
    WAYPOINTS.forEach((wp, i) => {
      const visited = wpRef.current?.has(i) ?? false;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = visited ? "rgba(74,222,128,0.35)" : "rgba(148,163,184,0.1)";
      ctx.fill();
      ctx.strokeStyle = visited ? "#4ade80" : "rgba(148,163,184,0.25)";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.fillStyle    = visited ? "#4ade80" : "rgba(148,163,184,0.45)";
      ctx.font         = "9px monospace";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i + 1}`, wp.x, wp.y);
    });

    // ── Rastro ────────────────────────────────────────────────────────────────
    const trail = trailRef.current ?? [];
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = "rgba(99,102,241,0.45)";
      ctx.lineWidth   = 2;
      ctx.lineJoin    = "round";
      ctx.stroke();
    }

    // ── Sensores ──────────────────────────────────────────────────────────────
    if (showSensors) {
      const sensors = leerSensores(ag.x, ag.y, ag.h);
      SENSOR_ANGLES.forEach((angle, i) => {
        const dir  = ag.h + angle;
        const dist = sensors[i] * (MAX_RAY - AGENT_R) + AGENT_R;
        const ex   = ag.x + Math.cos(dir) * dist;
        const ey   = ag.y + Math.sin(dir) * dist;
        ctx.beginPath();
        ctx.moveTo(ag.x, ag.y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(250,204,21,${0.15 + (1 - sensors[i]) * 0.5})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#facc15";
        ctx.fill();
      });
    }

    // ── Agente (triángulo) ────────────────────────────────────────────────────
    const tip = { x: ag.x + Math.cos(ag.h) * (AGENT_R + 3), y: ag.y + Math.sin(ag.h) * (AGENT_R + 3) };
    const l1  = { x: ag.x + Math.cos(ag.h + 2.4) * AGENT_R,  y: ag.y + Math.sin(ag.h + 2.4) * AGENT_R };
    const l2  = { x: ag.x + Math.cos(ag.h - 2.4) * AGENT_R,  y: ag.y + Math.sin(ag.h - 2.4) * AGENT_R };
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(l1.x, l1.y);
    ctx.lineTo(l2.x, l2.y);
    ctx.closePath();
    ctx.fillStyle   = "#4ade80";
    ctx.fill();
    ctx.strokeStyle = "#86efac";
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawVersion, showSensors]);

  return (
    <canvas
      ref={canvasRef}
      width={MAZE_W}
      height={MAZE_H}
      style={{ borderRadius: 8, display: "block" }}
    />
  );
}
