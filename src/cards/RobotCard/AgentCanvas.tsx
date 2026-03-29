// ─── AgentCanvas ──────────────────────────────────────────────────────────────
//
// Renderiza la habitación 2D y el agente.
// Lee agentRef y trailRef directamente para no generar re-renders adicionales.
//

import { useEffect, useRef } from "react";
import { WORLD_W, WORLD_H, AGENT_R, SENSOR_MAX, frontDist, leftDist, rightDist, type AgentState, type Obstacle } from "./agentWorld";
import type { Level } from "./useAgentRL";

const PAD = 12;
export const CANVAS_W = WORLD_W + PAD * 2;
export const CANVAS_H = WORLD_H + PAD * 2;

interface Props {
  agentRef:    React.RefObject<AgentState>;
  trailRef:    React.RefObject<{ x: number; y: number }[]>;
  drawVersion: number;
  level?:      Level;
  obstacles?:  Obstacle[];
}

function drawRay(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  angle: number,
  dist: number,       // normalizado 0-1
  isLeft = false,
) {
  const sensorPx = dist * SENSOR_MAX;
  const ex = ox + Math.cos(angle) * sensorPx;
  const ey = oy + Math.sin(angle) * sensorPx;
  // Punto real en la pared (AGENT_R más allá del límite de colisión)
  const wx = ex + Math.cos(angle) * AGENT_R;
  const wy = ey + Math.sin(angle) * AGENT_R;

  // Zona segura — verde (frontal) o cian (lateral)
  const safeColor = isLeft ? "100,210,255" : "80,220,120";
  const grad = ctx.createLinearGradient(ox, oy, ex, ey);
  grad.addColorStop(0, `rgba(${safeColor},0.85)`);
  grad.addColorStop(1, `rgba(${safeColor},0.15)`);

  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Zona de choque — rojo sólido hasta la pared real
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(wx, wy);
  ctx.strokeStyle = "rgba(255,60,60,0.9)";
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Punto en la pared
  ctx.beginPath();
  ctx.arc(wx, wy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,60,60,0.95)";
  ctx.fill();
}

export function AgentCanvas({ agentRef, trailRef, drawVersion, level = 1, obstacles = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const agent = agentRef.current;
    const trail = trailRef.current;

    // ── Fondo ──────────────────────────────────────────────────────────────
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Cuadrícula de puntos ───────────────────────────────────────────────
    ctx.fillStyle = "rgba(148,163,184,0.07)";
    for (let x = PAD + 18; x < PAD + WORLD_W - 4; x += 28) {
      for (let y = PAD + 18; y < PAD + WORLD_H - 4; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Paredes ────────────────────────────────────────────────────────────
    ctx.strokeStyle = "#334155";
    ctx.lineWidth   = 2;
    ctx.strokeRect(PAD, PAD, WORLD_W, WORLD_H);
    // Esquinas redondeadas con un brillo sutil
    ctx.strokeStyle = "rgba(99,102,241,0.25)";
    ctx.lineWidth   = 1;
    const c = 14;
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + c); ctx.lineTo(PAD, PAD); ctx.lineTo(PAD + c, PAD);
    ctx.moveTo(PAD + WORLD_W - c, PAD); ctx.lineTo(PAD + WORLD_W, PAD); ctx.lineTo(PAD + WORLD_W, PAD + c);
    ctx.moveTo(PAD + WORLD_W, PAD + WORLD_H - c); ctx.lineTo(PAD + WORLD_W, PAD + WORLD_H); ctx.lineTo(PAD + WORLD_W - c, PAD + WORLD_H);
    ctx.moveTo(PAD + c, PAD + WORLD_H); ctx.lineTo(PAD, PAD + WORLD_H); ctx.lineTo(PAD, PAD + WORLD_H - c);
    ctx.stroke();

    // ── Obstáculos ─────────────────────────────────────────────────────────
    for (const obs of obstacles) {
      const ox = obs.cx + PAD - obs.half;
      const oy = obs.cy + PAD - obs.half;
      const os = obs.half * 2;
      ctx.shadowColor = "rgba(251,113,133,0.4)";
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = "#1e0a0e";
      ctx.fillRect(ox, oy, os, os);
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(ox, oy, os, os);
    }

    // ── Trail (estela del agente) ──────────────────────────────────────────
    for (let i = 0; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.35;
      const r     = 1 + (i / trail.length) * 2;
      ctx.beginPath();
      ctx.arc(trail[i].x + PAD, trail[i].y + PAD, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129,140,248,${alpha})`;
      ctx.fill();
    }

    // ── Sensores ───────────────────────────────────────────────────────────
    const ax = agent.x + PAD;
    const ay = agent.y + PAD;

    if (level >= 2) {
      drawRay(ctx, ax, ay, agent.heading, frontDist(agent, obstacles));
    }
    if (level >= 3) {
      drawRay(ctx, ax, ay, agent.heading - Math.PI / 2, leftDist(agent, obstacles), true);
    }
    if (level === 4) {
      drawRay(ctx, ax, ay, agent.heading + Math.PI / 2, rightDist(agent, obstacles), true);
    }

    // Halo
    const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, AGENT_R * 2.5);
    grad.addColorStop(0, "rgba(129,140,248,0.20)");
    grad.addColorStop(1, "rgba(129,140,248,0)");
    ctx.beginPath();
    ctx.arc(ax, ay, AGENT_R * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Cuerpo (flecha/nave)
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(agent.heading);
    ctx.beginPath();
    ctx.moveTo(AGENT_R + 4, 0);   // punta
    ctx.lineTo(-AGENT_R + 2, -6); // espalda izq
    ctx.lineTo(-AGENT_R + 5, 0);  // muesca trasera
    ctx.lineTo(-AGENT_R + 2, 6);  // espalda dcha
    ctx.closePath();
    ctx.fillStyle   = "#818cf8";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawVersion]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: "block", borderRadius: 10 }}
    />
  );
}
