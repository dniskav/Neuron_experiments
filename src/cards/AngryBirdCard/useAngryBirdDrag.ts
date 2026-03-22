import { useRef, useState, useCallback } from "react";
import { type Escena, MAX_Y } from "../../data/fisicas";
import { CW, CH, PY_SUELO, wx, wy, px2wx, py2wy } from "./AngryBirdScene";

export const ESCENA_INICIAL: Escena = { xObstaculo: 7, hObstaculo: 6, xBlanco: 15 };

type DragMode = "target" | "obstacle" | null;

export function useAngryBirdDrag(
  getPred: (esc: Escena) => number,
  anguloPredRef: React.MutableRefObject<number | null>,
  setAnguloPred: (v: number | null) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const escenaRef    = useRef<Escena>({ ...ESCENA_INICIAL });
  const dragRef      = useRef<DragMode>(null);
  const hoverRef     = useRef<"target" | "obstacle" | null>(null);

  const [escena,  setEscena]  = useState<Escena>({ ...ESCENA_INICIAL });
  const [cursor,  setCursor]  = useState("default");
  const [hover,   setHover]   = useState<"target" | "obstacle" | null>(null);

  const getMousePos = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      px: (e.clientX - rect.left) * (CW / rect.width),
      py: (e.clientY - rect.top)  * (CH / rect.height),
    };
  };

  const hitTest = (px: number, py: number, esc: Escena): "target" | "obstacle" | null => {
    const txPx = wx(esc.xBlanco);
    const ohPy = wy(esc.hObstaculo);
    const oxPx = wx(esc.xObstaculo);
    if (Math.abs(px - txPx) < 20 && Math.abs(py - PY_SUELO) < 22) return "target";
    if (Math.abs(px - oxPx) < 14 && Math.abs(py - ohPy)    < 14) return "obstacle";
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
      setHover(hit);
      hoverRef.current = hit;
      setCursor(hit === "target" ? "ew-resize" : hit === "obstacle" ? "ns-resize" : "default");
      return;
    }

    let nueva = { ...escenaRef.current };

    if (drag === "target") {
      const xB = px2wx(px);
      // blanco tiene que estar al menos 2m después del obstáculo y antes del borde
      nueva.xBlanco = Math.max(escenaRef.current.xObstaculo + 2, Math.min(18, xB));
    } else {
      const hO = py2wy(py);
      nueva.hObstaculo = Math.max(0.5, Math.min(MAX_Y - 1, hO));
    }

    escenaRef.current = nueva;
    setEscena(nueva);
    const pred = getPred(nueva);
    anguloPredRef.current = pred;
    setAnguloPred(pred);
  }, [getPred, anguloPredRef, setAnguloPred]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setCursor("default");
  }, []);

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
    hover,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetEscena,
  };
}
