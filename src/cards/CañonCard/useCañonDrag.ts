import { useRef, useState, useCallback } from "react";
import { type Escena, MAX_X, MAX_Y } from "../../data/fisicas";
import { CW, CH, PY_SUELO, wx, wy, px2wx, py2wy } from "./CañonScene";

export const ESCENA_INICIAL: Escena = { xObstaculo: 5, hObstaculo: 4, xBlanco: 11 };

type DragMode = "target" | "obstacle" | null;

export function useCañonDrag(
  getPred: (esc: Escena) => { angulo: number; v0: number },
  predRef: React.MutableRefObject<{ angulo: number; v0: number } | null>,
  setPred: (v: { angulo: number; v0: number } | null) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const escenaRef    = useRef<Escena>({ ...ESCENA_INICIAL });
  const dragRef      = useRef<DragMode>(null);
  const hoverRef     = useRef<"target" | "obstacle" | null>(null);

  const [escena,  setEscena]  = useState<Escena>({ ...ESCENA_INICIAL });
  const [cursor,  setCursor]  = useState("default");

  const getMousePos = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      px: (e.clientX - rect.left) * (CW / rect.width),
      py: (e.clientY - rect.top)  * (CH / rect.height),
    };
  };

  const hitTest = (px: number, py: number, esc: Escena): DragMode => {
    if (Math.abs(px - wx(esc.xBlanco))    < 20 && Math.abs(py - PY_SUELO)           < 22) return "target";
    if (Math.abs(px - wx(esc.xObstaculo)) < 14 && Math.abs(py - wy(esc.hObstaculo)) < 14) return "obstacle";
    return null;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { px, py } = getMousePos(e);
    const hit = hitTest(px, py, escenaRef.current);
    if (!hit) return;
    dragRef.current = hit;
    setCursor(hit === "target" ? "ew-resize" : "ns-resize");
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { px, py } = getMousePos(e);
    const drag = dragRef.current;
    if (!drag) {
      const hit = hitTest(px, py, escenaRef.current);
      hoverRef.current = hit;
      setCursor(hit === "target" ? "ew-resize" : hit === "obstacle" ? "ns-resize" : "default");
      return;
    }
    const nueva = { ...escenaRef.current };
    if (drag === "target")   nueva.xBlanco    = Math.max(escenaRef.current.xObstaculo + 2, Math.min(MAX_X - 0.5, px2wx(px)));
    else                     nueva.hObstaculo = Math.max(0.5, Math.min(MAX_Y - 1, py2wy(py)));
    escenaRef.current = nueva;
    setEscena(nueva);
    const p = getPred(nueva);
    predRef.current = p;
    setPred(p);
  }, [getPred, predRef, setPred]);

  const handleMouseUp = useCallback(() => { dragRef.current = null; setCursor("default"); }, []);

  const resetEscena = useCallback(() => {
    escenaRef.current = { ...ESCENA_INICIAL };
    setEscena({ ...ESCENA_INICIAL });
  }, []);

  return {
    containerRef,
    escenaRef,
    escena,
    cursor,
    hoverRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetEscena,
  };
}
