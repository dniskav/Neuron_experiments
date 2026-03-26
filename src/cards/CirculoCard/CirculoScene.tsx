import type { RefObject } from "react";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { NetworkN } from "@dniskav/neuron";
import type { PuntoCirculo } from "../../data/datosCirculo";
import type { CirculoSceneProps, Circulo } from "./types";

// ─── Dimensions ───────────────────────────────────────────────────────────────
export const W = 320;
export const H = 320;

// ─── Re-exports ───────────────────────────────────────────────────────────────
export type { Circulo, CirculoSceneProps } from "./types";

// ─── Coordinate helpers ───────────────────────────────────────────────────────
export function toNorm(px: number, py: number) {
  return { x: (px / W) * 2 - 1, y: (py / H) * 2 - 1 };
}
export function toPixel(nx: number, ny: number) {
  return { px: ((nx + 1) / 2) * W, py: ((ny + 1) / 2) * H };
}

// norm [-1,1] → Three.js world (center = origin, Y up)
function n2t(nx: number, ny: number): [number, number, number] {
  return [nx * (W / 2), -ny * (H / 2), 0];
}

// ─── Heatmap via DataTexture ──────────────────────────────────────────────────
const PASO = 4;
const GRID = W / PASO; // 80

function HeatmapMesh({ redRef }: { redRef: RefObject<NetworkN> }) {
  const data    = useMemo(() => new Uint8Array(GRID * GRID * 4), []);
  const texture = useMemo(() => {
    const t = new THREE.DataTexture(data, GRID, GRID, THREE.RGBAFormat);
    t.flipY = true;
    return t;
  }, [data]);

  useFrame(() => {
    if (!redRef.current) return;
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const { x, y } = toNorm(col * PASO, row * PASO);
        const prob = redRef.current.predict([x, y])[0];
        const i = (row * GRID + col) * 4;
        data[i]     = Math.round(255 * (1 - prob));
        data[i + 1] = Math.round(200 * prob);
        data[i + 2] = Math.round(80 * (1 - Math.abs(prob - 0.5) * 2));
        data[i + 3] = 255;
      }
    }
    texture.needsUpdate = true;
  });

  return (
    <mesh>
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ─── Círculo de referencia (punteado) ─────────────────────────────────────────
const SEGS = 128;

function CircleOutline({ circuloRef }: { circuloRef: RefObject<Circulo> }) {
  const { line } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      opacity: 0.9,
      transparent: true,
      dashSize: 8,
      gapSize: 5,
    });
    return { line: new THREE.Line(geo, mat) };
  }, []);

  useFrame(() => {
    if (!circuloRef.current) return;
    const { cx, cy, radio } = circuloRef.current;
    const [tx, ty] = n2t(cx, cy);
    const r = radio * (W / 2);
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= SEGS; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      pos.setXYZ(i, tx + Math.cos(a) * r, ty + Math.sin(a) * r, 0.1);
    }
    pos.needsUpdate = true;
    line.computeLineDistances();
  });

  return <primitive object={line} />;
}

// ─── Handle de redimensión ────────────────────────────────────────────────────
function ResizeHandle({ circuloRef }: { circuloRef: RefObject<Circulo> }) {
  const outer = useMemo(() => new THREE.Mesh(
    new THREE.CircleGeometry(7, 16),
    new THREE.MeshBasicMaterial({ color: "#6366f1" }),
  ), []);
  const inner = useMemo(() => new THREE.Mesh(
    new THREE.CircleGeometry(5, 16),
    new THREE.MeshBasicMaterial({ color: "white" }),
  ), []);

  useFrame(() => {
    if (!circuloRef.current) return;
    const { cx, cy, radio } = circuloRef.current;
    const [tx, ty] = n2t(cx, cy);
    const r = radio * (W / 2);
    outer.position.set(tx + r, ty, 0.2);
    inner.position.set(tx + r, ty, 0.25);
  });

  return (
    <>
      <primitive object={outer} />
      <primitive object={inner} />
    </>
  );
}

// ─── Puntos de entrenamiento ──────────────────────────────────────────────────
const MAX_PTS = 600;
const _dummy  = new THREE.Object3D();

function TrainingPoints({ puntosRef }: { puntosRef: RefObject<PuntoCirculo[]> }) {
  const geo3 = useMemo(() => new THREE.CircleGeometry(3, 8), []);
  const geo2 = useMemo(() => new THREE.CircleGeometry(2, 8), []);

  const { borderIn, borderOut, fillIn, fillOut } = useMemo(() => {
    const make = (g: THREE.BufferGeometry, color: string) => {
      const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color }), MAX_PTS);
      m.count = 0;
      return m;
    };
    return {
      borderIn:  make(geo3, "#10b981"),
      borderOut: make(geo3, "#ef4444"),
      fillIn:    make(geo2, "#ffffff"),
      fillOut:   make(geo2, "#1e1e2e"),
    };
  }, [geo3, geo2]);

  useFrame(() => {
    if (!puntosRef.current) return;
    const inside  = puntosRef.current.filter(p => p.dentro);
    const outside = puntosRef.current.filter(p => !p.dentro);

    const update = (mesh: THREE.InstancedMesh, pts: PuntoCirculo[], z: number) => {
      pts.forEach((p, i) => {
        const [x, y] = n2t(p.x, p.y);
        _dummy.position.set(x, y, z);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      });
      mesh.count = pts.length;
      mesh.instanceMatrix.needsUpdate = true;
    };

    update(borderIn,  inside,  0.15);
    update(fillIn,    inside,  0.2);
    update(borderOut, outside, 0.15);
    update(fillOut,   outside, 0.2);
  });

  return (
    <>
      <primitive object={borderIn} />
      <primitive object={borderOut} />
      <primitive object={fillIn} />
      <primitive object={fillOut} />
    </>
  );
}

// ─── Escena ───────────────────────────────────────────────────────────────────
export function CirculoScene({ redRef, puntosRef, circuloRef }: CirculoSceneProps) {
  return (
    <>
      <HeatmapMesh    redRef={redRef} />
      <CircleOutline  circuloRef={circuloRef} />
      <ResizeHandle   circuloRef={circuloRef} />
      <TrainingPoints puntosRef={puntosRef} />
    </>
  );
}
