// ─── MazeScene ────────────────────────────────────────────────────────────────
//
// Capa visual del laberinto usando React Three Fiber.
// Recibe refs (no estado React) y actualiza la escena Three.js cada frame
// mediante useFrame — sin re-renders del árbol React en el bucle principal.
//
// Sistema de coordenadas:
//   Canvas: origen top-left, Y hacia abajo, 540 × 420 px
//   Three.js: origen centro, Y hacia arriba
//   c2t(cx, cy) convierte canvas → Three.js
//
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import {
  CW, CH, TILE, ROWS, COLS, MAZE,
  START, GOAL, GOAL_R, AGENT_R, MAX_RAY,
  SENSOR_ANGLES, WAYPOINTS, WAYPOINT_R,
  castRay,
  type Agente,
} from "../../data/laberinto";

// ─── Conversión de coordenadas ────────────────────────────────────────────────

function c2t(cx: number, cy: number, z = 0): [number, number, number] {
  return [cx - CW / 2, CH / 2 - cy, z];
}

// ─── Celdas del laberinto ─────────────────────────────────────────────────────
// Renderiza un plano por celda. Muros oscuros, pasillos claros.

function MazeTiles() {
  const tiles = useMemo(() =>
    MAZE.flatMap((row, r) =>
      row.map((cell, c) => ({
        key: `${r}-${c}`,
        pos: c2t(c * TILE + TILE / 2, r * TILE + TILE / 2) as [number, number, number],
        color: cell === 0 ? "#1e293b" : "#f1f5f9",
      }))
    ), []);

  return (
    <>
      {tiles.map(({ key, pos, color }) => (
        <mesh key={key} position={pos}>
          <planeGeometry args={[TILE, TILE]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      {/* Líneas de cuadrícula sobre pasillos */}
      {MAZE.flatMap((row, r) =>
        row.map((cell, c) => cell === 0 ? null : (
          <lineSegments key={`g-${r}-${c}`} position={c2t(c * TILE + TILE / 2, r * TILE + TILE / 2, 0.05)}>
            <edgesGeometry args={[new THREE.PlaneGeometry(TILE, TILE)]} />
            <lineBasicMaterial color="#e2e8f0" />
          </lineSegments>
        ))
      )}
    </>
  );
}

// ─── Círculo del objetivo ─────────────────────────────────────────────────────

function GoalCircle() {
  const points = useMemo(() =>
    Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return c2t(GOAL.x + Math.cos(a) * GOAL_R, GOAL.y + Math.sin(a) * GOAL_R, 0.1) as [number, number, number];
    }), []);

  return <Line points={points} color="#f59e0b" lineWidth={2} dashed dashSize={4} gapSize={3} />;
}

// ─── Waypoints ────────────────────────────────────────────────────────────────
// Crea los círculos de waypoint como objetos Three.js y actualiza su color
// cada frame según el Set de waypoints alcanzados.

function WaypointMarkers({ wpRef }: { wpRef: React.RefObject<Set<number>> }) {
  const { lines, mats } = useMemo(() => {
    const lines: THREE.Line[] = [];
    const mats: THREE.LineBasicMaterial[] = [];
    WAYPOINTS.forEach((wp) => {
      const r = WAYPOINT_R * 0.6;
      const segs = 32;
      const pts = new Float32Array((segs + 1) * 3);
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const [x, y, z] = c2t(wp.x + Math.cos(a) * r, wp.y + Math.sin(a) * r, 0.1);
        pts[j * 3] = x; pts[j * 3 + 1] = y; pts[j * 3 + 2] = z;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      const mat = new THREE.LineBasicMaterial({ color: "#94a3b8" });
      mats.push(mat);
      lines.push(new THREE.Line(geo, mat));
    });
    return { lines, mats };
  }, []);

  useFrame(() => {
    mats.forEach((mat, i) => mat.color.set(wpRef.current.has(i) ? "#22c55e" : "#94a3b8"));
  });

  return <>{lines.map((l, i) => <primitive key={i} object={l} />)}</>;
}

// ─── Agente (triángulo) ───────────────────────────────────────────────────────
// Actualiza posición y rotación cada frame leyendo agenteRef.

function AgentMesh({ agenteRef }: { agenteRef: React.RefObject<Agente> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(AGENT_R * 1.6, 0);
    s.lineTo(-AGENT_R, AGENT_R * 0.8);
    s.lineTo(-AGENT_R * 0.5, 0);
    s.lineTo(-AGENT_R, -AGENT_R * 0.8);
    s.closePath();
    return s;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const { x, y, h } = agenteRef.current;
    const [tx, ty] = c2t(x, y);
    meshRef.current.position.set(tx, ty, 0.3);
    meshRef.current.rotation.z = -h; // negativo porque el eje Y está invertido
  });

  return (
    <mesh ref={meshRef}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color="#6366f1" side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Rastro ───────────────────────────────────────────────────────────────────
// Actualiza la geometría del rastro cada frame.

function TrailLine({ trailRef }: { trailRef: React.RefObject<Array<{ x: number; y: number }>> }) {
  const obj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ color: "#6366f1", opacity: 0.3, transparent: true });
    return new THREE.Line(geo, mat);
  }, []);

  useFrame(() => {
    const pts = trailRef.current;
    if (pts.length < 2) { obj.geometry.setDrawRange(0, 0); return; }
    const buf = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      const [x, y] = c2t(p.x, p.y);
      buf[i * 3] = x; buf[i * 3 + 1] = y; buf[i * 3 + 2] = 0.15;
    });
    obj.geometry.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    obj.geometry.setDrawRange(0, pts.length);
    (obj.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return <primitive object={obj} />;
}

// ─── Sensores ─────────────────────────────────────────────────────────────────
// 5 rayos + punto en el extremo. Actualizados cada frame.

function SensorLines({ agenteRef, visible }: { agenteRef: React.RefObject<Agente>; visible: boolean }) {
  const dotGeo = useMemo(() => new THREE.CircleGeometry(2.5, 8), []);
  const dotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fbbf24" }), []);

  const { rayLines, dots } = useMemo(() => {
    const rayLines = SENSOR_ANGLES.map(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({ color: "#fbbf24", opacity: 0.4, transparent: true });
      return new THREE.Line(geo, mat);
    });
    const dots = SENSOR_ANGLES.map(() => new THREE.Mesh(dotGeo, dotMat));
    return { rayLines, dots };
  }, [dotGeo, dotMat]);

  useFrame(() => {
    const { x, y, h } = agenteRef.current;
    rayLines.forEach((line, i) => {
      line.visible = visible;
      dots[i].visible = visible;
      if (!visible) return;

      const angle = h + SENSOR_ANGLES[i];
      const dist = castRay(x, y, angle) * (MAX_RAY - AGENT_R) + AGENT_R;
      const ex = x + Math.cos(angle) * dist;
      const ey = y + Math.sin(angle) * dist;

      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      const [ox, oy] = c2t(x, y);
      const [tx, ty] = c2t(ex, ey);
      pos.setXYZ(0, ox, oy, 0.2);
      pos.setXYZ(1, tx, ty, 0.2);
      pos.needsUpdate = true;

      dots[i].position.set(tx, ty, 0.25);
    });
  });

  return (
    <>
      {rayLines.map((l, i) => <primitive key={`ray-${i}`} object={l} />)}
      {dots.map((d, i) => <primitive key={`dot-${i}`} object={d} />)}
    </>
  );
}

// ─── Escena principal ─────────────────────────────────────────────────────────

import type { MazeSceneProps } from "./types";

export function MazeScene({ agenteRef, trailRef, wpRef, showSensors }: MazeSceneProps) {
  return (
    <>
      <MazeTiles />
      <GoalCircle />
      <WaypointMarkers wpRef={wpRef} />
      <TrailLine trailRef={trailRef} />
      <SensorLines agenteRef={agenteRef} visible={showSensors} />
      <AgentMesh agenteRef={agenteRef} />

      {/* Etiquetas S y F */}
      <Text position={c2t(START.x, START.y, 0.4)} fontSize={14} color="#22c55e" anchorX="center" anchorY="middle">
        S
      </Text>
      <Text position={c2t(GOAL.x, GOAL.y, 0.4)} fontSize={14} color="#f59e0b" anchorX="center" anchorY="middle">
        F
      </Text>
    </>
  );
}

// Re-export dimensions so DetectorLaberinto doesn't need to import from laberinto for the canvas size
export { CW, CH, COLS, ROWS };
