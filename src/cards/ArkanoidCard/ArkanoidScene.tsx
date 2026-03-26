// ─── ArkanoidScene ────────────────────────────────────────────────────────────
//
// Escena Three.js del Arkanoid. Lee estado desde refs (sin re-renders React).
// Sistema de coordenadas:
//   Canvas: origen top-left, Y hacia abajo, CW × CH px
//   Three.js: origen centro, Y hacia arriba
//   c2t(cx, cy) convierte canvas → Three.js
//
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  CW, CH, BALL_R, PAD_W, PAD_H, PAD_Y,
  type BallState, type PadState,
} from "./physics";

export { CW, CH };

// ─── Conversión de coordenadas ────────────────────────────────────────────────

function c2t(cx: number, cy: number, z = 0): [number, number, number] {
  return [cx - CW / 2, CH / 2 - cy, z];
}

// ─── Fondo y paredes ──────────────────────────────────────────────────────────

function Background() {
  return (
    <>
      {/* Fondo oscuro */}
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[CW, CH]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>
      {/* Techo */}
      <mesh position={[0, CH / 2 - 2, 0]}>
        <planeGeometry args={[CW, 4]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
      {/* Pared izquierda */}
      <mesh position={[-CW / 2 + 2, 0, 0]}>
        <planeGeometry args={[4, CH]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
      {/* Pared derecha */}
      <mesh position={[CW / 2 - 2, 0, 0]}>
        <planeGeometry args={[4, CH]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
    </>
  );
}

// ─── Bola ─────────────────────────────────────────────────────────────────────

function BallMesh({ ballRef }: { ballRef: React.RefObject<BallState> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const [x, y] = c2t(ballRef.current.x, ballRef.current.y);
    meshRef.current.position.set(x, y, 0.2);
  });

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[BALL_R, 20]} />
      <meshBasicMaterial color="#f59e0b" />
    </mesh>
  );
}

// ─── Rastro de la bola ────────────────────────────────────────────────────────

function BallTrail({ trailRef }: { trailRef: React.RefObject<Array<{ x: number; y: number }>> }) {
  const obj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ color: "#f59e0b", opacity: 0.25, transparent: true });
    return new THREE.Line(geo, mat);
  }, []);

  useFrame(() => {
    const pts = trailRef.current;
    if (pts.length < 2) { obj.geometry.setDrawRange(0, 0); return; }
    const buf = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      const [x, y] = c2t(p.x, p.y);
      buf[i * 3] = x; buf[i * 3 + 1] = y; buf[i * 3 + 2] = 0.1;
    });
    obj.geometry.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    obj.geometry.setDrawRange(0, pts.length);
    (obj.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return <primitive object={obj} />;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

function PaddleMesh({ padRef }: { padRef: React.RefObject<PadState> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const [x, y] = c2t(padRef.current.x, PAD_Y + PAD_H / 2);
    meshRef.current.position.set(x, y, 0.2);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[PAD_W, PAD_H]} />
      <meshBasicMaterial color="#6366f1" />
    </mesh>
  );
}

// ─── Escena principal ─────────────────────────────────────────────────────────

export interface ArkanoidSceneProps {
  ballRef:  React.RefObject<BallState>;
  padRef:   React.RefObject<PadState>;
  trailRef: React.RefObject<Array<{ x: number; y: number }>>;
}

export function ArkanoidScene({ ballRef, padRef, trailRef }: ArkanoidSceneProps) {
  return (
    <>
      <Background />
      <BallTrail  trailRef={trailRef} />
      <BallMesh   ballRef={ballRef}   />
      <PaddleMesh padRef={padRef}     />
    </>
  );
}
