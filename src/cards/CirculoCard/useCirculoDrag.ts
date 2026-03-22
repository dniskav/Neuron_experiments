import { useRef, useState, useCallback } from "react";
import { RADIO } from "../../data/datosCirculo";
import { W, H } from "./CirculoScene";
import type { Circulo } from "./types";

export type { Circulo };

interface DragState {
  mode: "move" | "resize";
  startMx: number; startMy: number;
  startCx: number; startCy: number; startR: number;
}

export const CIRCULO_INICIAL: Circulo = { cx: 0, cy: 0, radio: RADIO };

function toNorm(px: number, py: number) {
  return { x: (px / W) * 2 - 1, y: (py / H) * 2 - 1 };
}

function clampCirculo(cx: number, cy: number, radio: number): Circulo {
  radio = Math.max(0.1, Math.min(0.85, radio));
  cx    = Math.max(-1 + radio, Math.min(1 - radio, cx));
  cy    = Math.max(-1 + radio, Math.min(1 - radio, cy));
  return { cx, cy, radio };
}

export function useCirculoDrag(
  onDrop: (cx: number, cy: number, radio: number) => void
) {
  const circuloRef   = useRef<Circulo>({ ...CIRCULO_INICIAL });
  const dragRef      = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [circulo, setCirculo] = useState<Circulo>({ ...CIRCULO_INICIAL });
  const [cursor,  setCursor]  = useState("default");

  const getCanvasPos = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return toNorm(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    );
  };

  const hitTest = (x: number, y: number, circ: Circulo) => {
    const dx = x - circ.cx, dy = y - circ.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const edgeTol = 0.07;
    if (Math.abs(dist - circ.radio) < edgeTol) return "resize";
    if (dist < circ.radio)                      return "move";
    return "none";
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = getCanvasPos(e);
    const circ = circuloRef.current;
    const hit  = hitTest(x, y, circ);
    if (hit === "none") return;
    dragRef.current = {
      mode: hit,
      startMx: x, startMy: y,
      startCx: circ.cx, startCy: circ.cy, startR: circ.radio,
    };
    setCursor(hit === "resize" ? "ew-resize" : "grabbing");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = getCanvasPos(e);
    const drag = dragRef.current;

    if (!drag) {
      setCursor(() => {
        const hit = hitTest(x, y, circuloRef.current);
        if (hit === "resize") return "ew-resize";
        if (hit === "move")   return "grab";
        return "default";
      });
      return;
    }

    let nuevo: Circulo;
    if (drag.mode === "move") {
      nuevo = clampCirculo(
        drag.startCx + (x - drag.startMx),
        drag.startCy + (y - drag.startMy),
        drag.startR
      );
    } else {
      const newR = Math.sqrt((x - drag.startCx) ** 2 + (y - drag.startCy) ** 2);
      nuevo = clampCirculo(drag.startCx, drag.startCy, newR);
    }

    circuloRef.current = nuevo;
    setCirculo(nuevo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setCursor("default");
    const { cx, cy, radio } = circuloRef.current;
    onDrop(cx, cy, radio);
  }, [onDrop]);

  const resetCirculo = useCallback(() => {
    circuloRef.current = { ...CIRCULO_INICIAL };
    setCirculo({ ...CIRCULO_INICIAL });
  }, []);

  return {
    containerRef,
    circuloRef,
    circulo,
    cursor,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetCirculo,
  };
}
