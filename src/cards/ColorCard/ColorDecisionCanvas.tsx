// ─── ColorDecisionCanvas ──────────────────────────────────────────────────────
//
// Canvas 2D que visualiza las regiones de decisión de las 2 neuronas de color:
//   · Eje X = matiz (hue 0-360°)
//   · Eje Y = luminosidad (0 abajo → 1 arriba)
//   · Saturación fija en 0.80 — colores vivos
//   · Fondo = color real de cada celda
//   · Tinte semitransparente = clase predicha (claro / neutro / oscuro)
//   · Puntos = muestras de entrenamiento en su posición (h, l)
//

import { useEffect, useRef } from "react";
import type { NeuronN } from "@dniskav/neuron";
import { clasificar } from "../../data/datosColor";

export const CC_W = 440;
export const CC_H = 160;
const COLS = 88;   // resolución horizontal
const ROWS = 32;   // resolución vertical
const PAD  = 28;

// Tintes de clase (RGBA)
const TINT: Record<string, [number, number, number, number]> = {
  claro:  [253, 224,  71, 0.38],  // amarillo
  neutro: [ 56, 189, 248, 0.38],  // azul cielo
  oscuro: [139,  92, 246, 0.38],  // violeta
};

// ── Conversión HSL ↔ RGB ──────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Sample { r: number; g: number; b: number; label: string }

interface Props {
  n1:          NeuronN;
  n2:          NeuronN;
  muestras:    Sample[];
  drawVersion: number;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ColorDecisionCanvas({ n1, n2, muestras, drawVersion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pw = (CC_W - PAD * 2) / COLS;
    const ph = (CC_H - PAD * 2) / ROWS;

    ctx.clearRect(0, 0, CC_W, CC_H);

    // ── 1. Fondo + tinte de clase ────────────────────────────────────────────
    for (let row = 0; row < ROWS; row++) {
      const l = 1 - row / (ROWS - 1); // top = bright
      for (let col = 0; col < COLS; col++) {
        const h = col / (COLS - 1);
        const [r, g, b] = hslToRgb(h, 0.80, l);

        // Pixel base — color real
        ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
        ctx.fillRect(PAD + col * pw, PAD + row * ph, pw + 1, ph + 1);

        // Tinte de clase predicha
        const s1    = n1.predict([r, g, b]);
        const s2    = n2.predict([r, g, b]);
        const clase = clasificar(s1, s2);
        const [tr, tg, tb, ta] = TINT[clase];
        ctx.fillStyle = `rgba(${tr},${tg},${tb},${ta})`;
        ctx.fillRect(PAD + col * pw, PAD + row * ph, pw + 1, ph + 1);
      }
    }

    // ── 2. Borde del área ────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(PAD, PAD, CC_W - PAD * 2, CC_H - PAD * 2);

    // ── 3. Etiquetas de eje Y ────────────────────────────────────────────────
    ctx.fillStyle    = "rgba(200,200,200,0.80)";
    ctx.font         = "9px system-ui, sans-serif";
    ctx.textAlign    = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("blanco", PAD - 3, PAD);
    ctx.fillText("negro",  PAD - 3, CC_H - PAD);

    // ── 4. Puntos de muestras ────────────────────────────────────────────────
    for (const { r, g, b, label } of muestras) {
      const [h, s, l] = rgbToHsl(r, g, b);
      // Colores acromáticos (s ≈ 0): los repartimos en franja central
      const hNorm = s < 0.05 ? 0.5 : h;
      const px = PAD + hNorm * (CC_W - PAD * 2);
      const py = PAD + (1 - l) * (CC_H - PAD * 2);

      // Borde blanco/negro según luminosidad del fondo
      const stroke = l > 0.55 ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Nombre pequeño
      ctx.fillStyle    = stroke;
      ctx.font         = "8px system-ui, sans-serif";
      ctx.textAlign    = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, px, py - 4);
    }

    // ── 5. Leyenda ────────────────────────────────────────────────────────────
    const legend = [
      { label: "claro",  color: `rgba(${TINT.claro.slice(0,3).join(",")},0.8)` },
      { label: "neutro", color: `rgba(${TINT.neutro.slice(0,3).join(",")},0.8)` },
      { label: "oscuro", color: `rgba(${TINT.oscuro.slice(0,3).join(",")},0.8)` },
    ];
    let lx = PAD;
    ctx.textBaseline = "middle";
    for (const { label, color } of legend) {
      ctx.fillStyle = color;
      ctx.fillRect(lx, CC_H - PAD + 8, 8, 8);
      ctx.fillStyle = "rgba(200,200,200,0.85)";
      ctx.font      = "9px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 10, CC_H - PAD + 12);
      lx += 52;
    }

  }, [drawVersion, n1, n2, muestras]);

  return (
    <canvas
      ref={canvasRef}
      width={CC_W}
      height={CC_H}
      style={{
        display:      "block",
        borderRadius: 8,
        border:       "1px solid rgba(255,255,255,0.10)",
        background:   "#0f172a",
      }}
    />
  );
}
