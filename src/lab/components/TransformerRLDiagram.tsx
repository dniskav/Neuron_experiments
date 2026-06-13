// ─── TransformerRLDiagram ──────────────────────────────────────────────────────
//
// Visualización SVG para NetworkTransformerRL.
// Muestra una fila de tokens (pasos pasados) con arcos de atención causal
// sobre ellos, un bloque resumen del transformer, y los Q-values de salida.
//
// Animación en tiempo real via RAF (sin re-renders):
//   - attentionRef: pesos de atención seqLen×seqLen del último bloque
//   - qValuesRef:   Q-values crudos de salida
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";

// ── Layout ────────────────────────────────────────────────────────────────────

const TOKEN_W   = 20;
const TOKEN_H   = 13;
const TOKEN_GAP = 8;
const ARC_ROWS  = 42;   // espacio sobre los tokens para arcos
const TOKEN_Y   = ARC_ROWS;
const MID_GAP   = 14;
const BOX_H     = 22;
const BOX_Y     = TOKEN_Y + TOKEN_H + MID_GAP;
const QVAL_GAP  = 14;
const QVAL_Y    = BOX_Y + BOX_H + QVAL_GAP;
const QVAL_R    = 4.5;
const LABEL_H   = 24;
const SVG_H     = QVAL_Y + QVAL_R + LABEL_H;
const PAD_X     = 14;

// ── Colores ───────────────────────────────────────────────────────────────────

const ATTN_COLOR = "#818cf8"; // indigo-400
const QVAL_COLOR = "#34d399"; // emerald-400

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TransformerRLDiagramProps {
  seqLen:   number;
  inputDim: number;
  nBlocks:  number;
  nHeads:   number;
  nActions: number;
  /** Pesos de atención del último bloque (seqLen × seqLen), actualizado por RAF */
  attentionRef?: React.RefObject<number[][] | null>;
  /** Q-values crudos de salida (nActions), actualizado por RAF */
  qValuesRef?: React.RefObject<number[] | null>;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TransformerRLDiagram({
  seqLen, inputDim, nBlocks, nHeads, nActions,
  attentionRef, qValuesRef,
}: TransformerRLDiagramProps) {

  // ── Layout x de cada token ─────────────────────────────────────────────────
  const tokenAreaW = seqLen * (TOKEN_W + TOKEN_GAP) - TOKEN_GAP;
  const svgW       = PAD_X * 2 + tokenAreaW;

  const tokenCX = Array.from({ length: seqLen }, (_, i) =>
    PAD_X + i * (TOKEN_W + TOKEN_GAP) + TOKEN_W / 2
  );

  // ── Layout x de cada Q-value ───────────────────────────────────────────────
  const maxQSpan  = Math.min(tokenAreaW * 0.7, (nActions - 1) * 28);
  const qStep     = nActions > 1 ? maxQSpan / (nActions - 1) : 0;
  const qStartX   = PAD_X + (tokenAreaW - maxQSpan) / 2;
  const qCX       = Array.from({ length: nActions }, (_, i) => qStartX + i * qStep);

  // ── Refs para animación RAF ────────────────────────────────────────────────
  const arcRefs  = useRef<(SVGPathElement | null)[][]>([]);
  const qvalRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    if (!attentionRef && !qValuesRef) return;
    let rafId: number;

    function tick() {
      // Arcos de atención causal: fila i → columna j (j < i)
      if (attentionRef?.current) {
        const attn = attentionRef.current;
        for (let i = 1; i < seqLen; i++) {
          const row = attn[i];
          if (!row) continue;
          for (let j = 0; j < i; j++) {
            const el = arcRefs.current[i]?.[j];
            if (!el) continue;
            const w = Math.max(0, Math.min(1, row[j] ?? 0));
            el.setAttribute("stroke-opacity", String(0.05 + w * 0.88));
            el.setAttribute("stroke-width",   String(0.6 + w * 2.2));
          }
        }
      }

      // Glow de Q-values
      if (qValuesRef?.current) {
        const qvals  = qValuesRef.current;
        const minQ   = Math.min(...qvals);
        const maxQ   = Math.max(...qvals);
        const range  = maxQ - minQ;
        qvalRefs.current.forEach((el, i) => {
          if (!el) return;
          const intensity = range > 1e-4 ? (qvals[i] - minQ) / range : 0.5;
          el.setAttribute("fill-opacity", String(0.15 + intensity * 0.78));
          if (intensity > 0.45) {
            const blur = (intensity - 0.45) * 10;
            el.style.filter = `drop-shadow(0 0 ${blur.toFixed(1)}px ${QVAL_COLOR})`;
          } else {
            el.style.filter = "";
          }
        });
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [attentionRef, qValuesRef, seqLen]);

  // ── Curva de arco entre dos tokens ────────────────────────────────────────
  // La altura del arco crece con la distancia entre tokens.
  function arcPath(from: number, to: number): string {
    const x1   = tokenCX[from];
    const x2   = tokenCX[to];
    const yBase = TOKEN_Y;
    const span  = Math.abs(x2 - x1);
    const cy    = yBase - 5 - span * 0.22;
    const mx    = (x1 + x2) / 2;
    return `M ${x1} ${yBase} Q ${mx} ${cy} ${x2} ${yBase}`;
  }

  const hasAnimation = !!(attentionRef || qValuesRef);

  return (
    <Box>
      <svg
        width={svgW}
        height={SVG_H}
        viewBox={`0 0 ${svgW} ${SVG_H}`}
        style={{ overflow: "visible" }}
      >
        {/* ── Arcos de atención causal ────────────────────────────────────── */}
        {Array.from({ length: seqLen }, (_, i) =>
          Array.from({ length: i }, (_, j) => {
            if (!arcRefs.current[i]) arcRefs.current[i] = [];
            return (
              <path
                key={`arc-${i}-${j}`}
                d={arcPath(i, j)}
                fill="none"
                stroke={ATTN_COLOR}
                strokeWidth={0.6}
                strokeOpacity={hasAnimation ? 0.05 : 0.18}
                ref={el => { arcRefs.current[i][j] = el; }}
              />
            );
          })
        )}

        {/* ── Tokens ─────────────────────────────────────────────────────── */}
        {tokenCX.map((cx, i) => {
          const isNow = i === seqLen - 1;
          const label = isNow ? "t" : `t-${seqLen - 1 - i}`;
          return (
            <g key={`tok-${i}`}>
              <rect
                x={cx - TOKEN_W / 2} y={TOKEN_Y}
                width={TOKEN_W} height={TOKEN_H}
                rx={3}
                fill={ATTN_COLOR}
                fillOpacity={isNow ? 0.32 : 0.1}
                stroke={ATTN_COLOR}
                strokeOpacity={isNow ? 0.75 : 0.28}
                strokeWidth={0.8}
              />
              <text
                x={cx} y={TOKEN_Y + TOKEN_H - 3}
                textAnchor="middle"
                fontSize={6.5}
                fill={isNow ? "#818cf8" : "#94a3b8"}
                fontWeight={isNow ? "700" : "400"}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Línea: tokens → bloque ─────────────────────────────────────── */}
        <line
          x1={svgW / 2} y1={TOKEN_Y + TOKEN_H}
          x2={svgW / 2} y2={BOX_Y}
          stroke="#e2e8f0" strokeWidth={0.8}
        />

        {/* ── Caja resumen de bloques transformer ────────────────────────── */}
        <rect
          x={svgW / 2 - 50} y={BOX_Y}
          width={100} height={BOX_H}
          rx={4}
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth={0.8}
        />
        <text
          x={svgW / 2} y={BOX_Y + BOX_H / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8.5}
          fontWeight="600"
          fill="#475569"
        >
          {nBlocks} blocks · {nHeads} heads
        </text>

        {/* ── Líneas: bloque → Q-values ──────────────────────────────────── */}
        {qCX.map((qx, i) => (
          <line
            key={`cq-${i}`}
            x1={svgW / 2} y1={BOX_Y + BOX_H}
            x2={qx} y2={QVAL_Y}
            stroke="#e2e8f0" strokeWidth={0.65}
          />
        ))}

        {/* ── Q-values ───────────────────────────────────────────────────── */}
        {qCX.map((qx, i) => (
          <g key={`qv-${i}`}>
            <circle
              cx={qx} cy={QVAL_Y} r={QVAL_R}
              fill={QVAL_COLOR}
              fillOpacity={hasAnimation ? 0.15 : 0.75}
              ref={el => { qvalRefs.current[i] = el; }}
            />
            <text
              x={qx} y={QVAL_Y + QVAL_R + 10}
              textAnchor="middle"
              fontSize={8}
              fill={QVAL_COLOR}
              fontWeight="500"
            >
              Q{i}
            </text>
          </g>
        ))}

        {/* ── Info de dimensiones (arriba izquierda) ─────────────────────── */}
        <text x={PAD_X} y={TOKEN_Y - 7} fontSize={7.5} fill="#94a3b8">
          seq={seqLen} · in={inputDim}
        </text>
      </svg>

      <Text fontSize="10px" color="gray.400" mt="2px">
        opt:{" "}
        <Text as="span" fontWeight={700} color="gray.600">Adam</Text>
      </Text>
    </Box>
  );
}
