// ─── NetworkDiagram ───────────────────────────────────────────────────────────
//
// Diagrama SVG de arquitectura de red neuronal.
// Con `activationsRef` los nodos se "encienden" en tiempo real según sus
// activaciones — actualizado por RAF sin re-renders de React.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";

// ── Constantes de layout ──────────────────────────────────────────────────────

const MAX_SHOWN = 6;   // máximo de items visibles por capa (dots + indicador)
const MAX_CONN  = 4;   // neuronas usadas para trazar líneas de conexión
const DOT_R     = 4.5; // radio base del círculo de neurona
const DOTS_H    = 78;  // alto del área de puntos (px)
const LABEL_H   = 38;  // alto del área de etiquetas debajo (px)
const SVG_H     = DOTS_H + LABEL_H;
const COL_W     = 50;  // ancho de cada columna de capa
const CONN_W    = 30;  // ancho del "pasillo" de conexión entre capas
const PAD_X     = 14;  // padding horizontal del SVG

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ActivationType = "relu" | "sigmoid" | "tanh" | "lstm" | "linear" | "leakyRelu" | "elu";

export interface LayerDef {
  size:        number;
  activation?: ActivationType; // undefined = capa de entrada
}

export interface NetworkDiagramProps {
  layers:         LayerDef[];
  optimizer:      string;
  /** Ref con activaciones por capa: activationsRef.current[i][j] = valor neurona j en capa i */
  activationsRef?: React.RefObject<number[][]>;
}

// ── Colores por tipo de activación ────────────────────────────────────────────

const ACT_COLOR: Record<string, string> = {
  relu:       "#6366f1", // indigo
  sigmoid:    "#10b981", // emerald
  tanh:       "#f59e0b", // amber
  lstm:       "#f59e0b", // amber
  linear:     "#94a3b8", // slate
  leakyRelu:  "#8b5cf6", // violet  (relu que "gotea" → tono más suave)
  elu:        "#06b6d4", // cyan    (curva suave → color frío distinto)
};
const INPUT_COLOR = "#94a3b8";

function dotColor(activation?: ActivationType): string {
  return activation ? (ACT_COLOR[activation] ?? INPUT_COLOR) : INPUT_COLOR;
}

// ── Layout de puntos ──────────────────────────────────────────────────────────
//
// Distribuye los puntos a lo largo de toda la altura disponible, independientemente
// de cuántos sean (2 neuronas → centradas, 6+ → rellena todo el alto).
// Reserva el último slot para "+N" si hay overflow.

interface DotLayout { ys: number[]; overflow: number; overflowY: number | null; }

function dotLayout(size: number): DotLayout {
  const shown    = Math.min(size, MAX_SHOWN);
  const hasMore  = size > MAX_SHOWN;
  const realN    = hasMore ? shown - 1 : shown; // último slot para "+N"
  const step     = DOTS_H / (shown + 1);        // espaciado según total de slots
  const ys       = Array.from({ length: realN }, (_, i) => step * (i + 1));
  return {
    ys,
    overflow:  hasMore ? size - realN : 0,
    overflowY: hasMore ? step * shown : null,
  };
}

/** Posiciones Y distribuidas para trazar líneas de conexión. */
function connYs(size: number): number[] {
  const n    = Math.min(size, MAX_CONN);
  const step = DOTS_H / (n + 1);
  return Array.from({ length: n }, (_, i) => step * (i + 1));
}

// ── Componente principal ───────────────────────────────────────────────────────

export function NetworkDiagram({ layers, optimizer, activationsRef }: NetworkDiagramProps) {
  const nCols = layers.length;
  const svgW  = nCols * COL_W + (nCols - 1) * CONN_W + PAD_X * 2;

  // Centro X de cada columna
  const colX = layers.map((_, i) => PAD_X + COL_W / 2 + i * (COL_W + CONN_W));

  // Refs imperativos para los nodos SVG (sin re-renders)
  const nodeRefs  = useRef<(SVGElement | null)[][]>([]);
  const colorsRef = useRef<string[]>([]);

  // Sincronizar colores en cada render
  layers.forEach((layer, i) => { colorsRef.current[i] = dotColor(layer.activation); });

  // ── RAF loop: opacidad + glow ────────────────────────────────────────────────
  useEffect(() => {
    if (!activationsRef) return;

    let rafId: number;

    function tick() {
      const acts = activationsRef!.current;

      nodeRefs.current.forEach((layerNodes, li) => {
        const layerActs = acts?.[li];
        if (!layerActs || layerActs.length === 0) return;
        const color = colorsRef.current[li] ?? INPUT_COLOR;

        // Normalización por capa: el más activo = 1.0, el menos = 0.0
        // Así el contraste es siempre visible independientemente del rango absoluto.
        const visible = layerActs.slice(0, layerNodes.length);
        const min     = Math.min(...visible);
        const max     = Math.max(...visible);
        const range   = max - min;

        layerNodes.forEach((el, ni) => {
          if (!el) return;
          const raw = layerActs[ni] ?? 0;
          // Si todos los valores son iguales (ej. red sin entrenar), mostrar al 50%
          const intensity = range > 1e-4 ? (raw - min) / range : 0.5;

          el.setAttribute("fill-opacity", String(0.1 + intensity * 0.9));

          if (intensity > 0.4) {
            const blur = (intensity - 0.4) * 9;
            el.style.filter = `drop-shadow(0 0 ${blur.toFixed(1)}px ${color})`;
          } else {
            el.style.filter = "";
          }
        });
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activationsRef]);

  function nodeRef(li: number, ni: number) {
    return (el: SVGElement | null) => {
      if (!nodeRefs.current[li]) nodeRefs.current[li] = [];
      nodeRefs.current[li][ni] = el;
    };
  }

  const baseOpacity = activationsRef ? 0.08 : 0.85;

  return (
    <Box>
      <svg
        width={svgW}
        height={SVG_H}
        viewBox={`0 0 ${svgW} ${SVG_H}`}
        style={{ overflow: "visible" }}
      >
        {/* ── Líneas de conexión ─────────────────────────────────────────── */}
        {layers.slice(0, -1).map((fromL, i) => {
          const srcYs = connYs(fromL.size);
          const dstYs = connYs(layers[i + 1].size);
          return srcYs.flatMap((sy, si) =>
            dstYs.map((dy, di) => (
              <line
                key={`conn-${i}-${si}-${di}`}
                x1={colX[i]} y1={sy} x2={colX[i + 1]} y2={dy}
                stroke="#e2e8f0" strokeWidth={0.65}
              />
            ))
          );
        })}

        {/* ── Capas ─────────────────────────────────────────────────────── */}
        {layers.map((layer, i) => {
          const { ys, overflow, overflowY } = dotLayout(layer.size);
          const cx      = colX[i];
          const color   = dotColor(layer.activation);
          const isLSTM  = layer.activation === "lstm";
          const actLabel = layer.activation ?? "entrada";

          return (
            <g key={i}>
              {ys.map((y, j) =>
                isLSTM ? (
                  <rect
                    key={j}
                    x={cx - DOT_R} y={y - DOT_R}
                    width={DOT_R * 2} height={DOT_R * 2}
                    rx={2} fill={color} fillOpacity={baseOpacity}
                    ref={nodeRef(i, j) as React.RefCallback<SVGRectElement>}
                  />
                ) : (
                  <circle
                    key={j}
                    cx={cx} cy={y} r={DOT_R}
                    fill={color} fillOpacity={baseOpacity}
                    ref={nodeRef(i, j) as React.RefCallback<SVGCircleElement>}
                  />
                )
              )}

              {overflow > 0 && overflowY !== null && (
                <text
                  x={cx} y={overflowY + 4}
                  textAnchor="middle" fontSize={9}
                  fill="#94a3b8" fontWeight="600"
                >
                  +{overflow}
                </text>
              )}

              {/* Número de neuronas */}
              <text
                x={cx} y={DOTS_H + 14}
                textAnchor="middle" fontSize={12} fontWeight="700" fill="#1e293b"
              >
                {layer.size}
              </text>

              {/* Tipo de activación */}
              <text
                x={cx} y={DOTS_H + 27}
                textAnchor="middle" fontSize={9} fill={color} fontWeight="500"
              >
                {actLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <Text fontSize="10px" color="gray.400" mt="2px">
        opt:{" "}
        <Text as="span" fontWeight={700} color="gray.600">{optimizer}</Text>
      </Text>
    </Box>
  );
}
