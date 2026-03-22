import type { RefObject } from 'react'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  simularTrayectoria,
  encontrarAngulo,
  xAterrizaje,
  MAX_X,
  MAX_Y,
  type Escena
} from '../../data/fisicas'
import type { AngryBirdSceneProps } from './types'

// ─── Canvas coords ────────────────────────────────────────────────────────────
export const CW = 360
export const CH = 200
export const PY_SUELO = 178

export function wx(x: number) {
  return 14 + (x / MAX_X) * (CW - 28)
}
export function wy(y: number) {
  return PY_SUELO - (y / MAX_Y) * (PY_SUELO - 8)
}
export function px2wx(px: number) {
  return Math.max(0, Math.min(MAX_X, ((px - 14) / (CW - 28)) * MAX_X))
}
export function py2wy(py: number) {
  return Math.max(0, Math.min(MAX_Y, ((PY_SUELO - py) / (PY_SUELO - 8)) * MAX_Y))
}

// Canvas px → Three.js world (center = origin, Y up)
function ct(cx: number, cy: number, z = 0): [number, number, number] {
  return [cx - CW / 2, CH / 2 - cy, z]
}

const GROUND_Y = CH / 2 - PY_SUELO // = -78

// ─── Background ───────────────────────────────────────────────────────────────
function Background() {
  const meshes = useMemo(() => {
    const skyGeo = new THREE.PlaneGeometry(CW, PY_SUELO)
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color('#1e40af') },
        uBot: { value: new THREE.Color('#60a5fa') }
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 uTop; uniform vec3 uBot; void main() { gl_FragColor = vec4(mix(uBot,uTop,vUv.y),1.0); }`
    })
    const sky = new THREE.Mesh(skyGeo, skyMat)
    sky.position.set(0, CH / 2 - PY_SUELO / 2, -0.5)

    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(CW, CH - PY_SUELO),
      new THREE.MeshBasicMaterial({ color: '#713f12' })
    )
    gnd.position.set(0, GROUND_Y - (CH - PY_SUELO) / 2, -0.5)

    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(CW, 4),
      new THREE.MeshBasicMaterial({ color: '#92400e' })
    )
    line.position.set(0, GROUND_Y - 2, -0.4)

    return [sky, gnd, line]
  }, [])

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  )
}

// ─── Obstáculo ────────────────────────────────────────────────────────────────
function ObstacleMesh({
  escenaRef,
  hoverRef
}: {
  escenaRef: RefObject<Escena>
  hoverRef: RefObject<'target' | 'obstacle' | null>
}) {
  const pillarMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6b7280' }), [])
  const handleMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffffb3' }), [])
  const pillar = useMemo(
    () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pillarMat),
    [pillarMat]
  )
  const cap = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(22, 6),
        new THREE.MeshBasicMaterial({ color: '#374151' })
      ),
    []
  )
  const handle = useMemo(
    () => new THREE.Mesh(new THREE.CircleGeometry(7, 16), handleMat),
    [handleMat]
  )
  const arrowRef = useRef<THREE.Object3D>(null)

  useFrame(() => {
    if (!escenaRef.current) return
    const { xObstaculo, hObstaculo } = escenaRef.current
    const isHover = hoverRef.current === 'obstacle'
    const oxPx = wx(xObstaculo)
    const ohPy = wy(hObstaculo)
    const [ox] = ct(oxPx, 0)
    const ohY = CH / 2 - ohPy
    const pillarH = PY_SUELO - ohPy

    pillar.scale.set(18, pillarH, 1)
    pillar.position.set(ox, GROUND_Y + pillarH / 2, 0.1)
    pillarMat.color.set(isHover ? '#9ca3af' : '#6b7280')

    cap.position.set(ox, ohY - 3, 0.15)

    handle.position.set(ox, ohY + 3, 0.2)
    handleMat.color.set(isHover ? '#fbbf24' : '#ffffffb3')

    arrowRef.current?.position.set(ox, ohY + 3, 0.3)
  })

  return (
    <>
      <primitive object={pillar} />
      <primitive object={cap} />
      <primitive object={handle} />
      <Text ref={arrowRef as any} fontSize={9} color="#374151" anchorX="center" anchorY="middle">
        ↕
      </Text>
    </>
  )
}

// ─── Blanco (diana) ───────────────────────────────────────────────────────────
// const RING_BASE    = [14, 11, 9, 5, 2] as const; // default radii in px
const RING_NORMAL = ['#f97316', '#ef4444', '#ffffff', '#ef4444', '#ffffff'] as const
const RING_HIT = ['#10b981', '#34d399', '#ffffff', '#10b981', '#ffffff'] as const

function TargetMesh({
  escenaRef,
  hoverRef,
  anguloPredRef
}: {
  escenaRef: RefObject<Escena>
  hoverRef: RefObject<'target' | 'obstacle' | null>
  anguloPredRef: RefObject<number | null>
}) {
  const haloFillMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#10b981', opacity: 0.35, transparent: true }),
    []
  )
  const haloRingMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#10b981', side: THREE.DoubleSide }),
    []
  )
  const haloFill = useMemo(
    () => new THREE.Mesh(new THREE.CircleGeometry(26, 32), haloFillMat),
    [haloFillMat]
  )
  const haloRing = useMemo(
    () => new THREE.Mesh(new THREE.RingGeometry(20.5, 23.5, 32), haloRingMat),
    [haloRingMat]
  )

  const ringMats = useMemo(
    () => RING_NORMAL.map((c) => new THREE.MeshBasicMaterial({ color: c })),
    []
  )
  const rings = useMemo(
    () => ringMats.map((mat) => new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat)),
    [ringMats]
  )

  const golpeRef = useRef<THREE.Object3D>(null)
  const arrowRef = useRef<THREE.Object3D>(null)
  const warnRef = useRef<THREE.Object3D>(null)

  useFrame(() => {
    if (!escenaRef.current) return
    const { xBlanco } = escenaRef.current
    const pred = anguloPredRef.current
    const isHL = hoverRef.current === 'target'
    const golpea = pred !== null && Math.abs(xAterrizaje(pred) - xBlanco) < 0.6
    const correct = encontrarAngulo(escenaRef.current)

    const txPx = wx(xBlanco)
    const [tx] = ct(txPx, 0)
    const ty = GROUND_Y

    // Halo
    haloFill.position.set(tx, ty, 0.05)
    haloRing.position.set(tx, ty, 0.06)
    haloFill.visible = golpea
    haloRing.visible = golpea

    // Rings (outer two scale with hover)
    const colors = golpea ? RING_HIT : RING_NORMAL
    const radii = [isHL ? 18 : 14, isHL ? 14 : 11, 9, 5, 2]
    rings.forEach((ring, i) => {
      const r = radii[i]
      ring.position.set(tx, ty, 0.1 + i * 0.02)
      ring.scale.set(r, r, 1)
      ringMats[i].color.set(colors[i])
    })

    // "¡Golpe!" text
    golpeRef.current?.position.set(tx, ty + 30, 0.3)
    if (golpeRef.current) golpeRef.current.visible = golpea

    // ↔ handle
    arrowRef.current?.position.set(tx, ty - 14, 0.3)
    if (arrowRef.current) (arrowRef.current as any).color = isHL ? '#fbbf24' : '#ffffffb3'

    // ⚠ Sin solución
    if (warnRef.current) warnRef.current.visible = correct === null
  })

  return (
    <>
      <primitive object={haloFill} />
      <primitive object={haloRing} />
      {rings.map((r, i) => (
        <primitive key={i} object={r} />
      ))}
      <Text ref={golpeRef as any} fontSize={11} color="#10b981" anchorX="center" anchorY="middle">
        ¡Golpe!
      </Text>
      <Text ref={arrowRef as any} fontSize={10} color="#ffffffb3" anchorX="center" anchorY="middle">
        ↔
      </Text>
      <Text
        ref={warnRef as any}
        position={[0, CH / 2 - 60, 0.3]}
        fontSize={12}
        color="#ef4444"
        anchorX="center"
        anchorY="middle">
        ⚠ Sin solución para esta configuración
      </Text>
    </>
  )
}

// ─── Lanzador ─────────────────────────────────────────────────────────────────
function LauncherMesh() {
  const meshes = useMemo(() => {
    const lx = wx(0) - CW / 2

    // Upper half-dome at ground level
    const dome = new THREE.Mesh(
      new THREE.CircleGeometry(9, 32, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#10b981' })
    )
    dome.position.set(lx, GROUND_Y, 0.2)

    // Pole above ground
    const pole = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 14),
      new THREE.MeshBasicMaterial({ color: '#065f46' })
    )
    pole.position.set(lx, GROUND_Y + 7, 0.2)

    return [dome, pole]
  }, [])

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  )
}

// ─── Trayectorias ─────────────────────────────────────────────────────────────
const MAX_TRAJ = 200

function TrajectoryLines({
  escenaRef,
  anguloPredRef
}: {
  escenaRef: RefObject<Escena>
  anguloPredRef: RefObject<number | null>
}) {
  const { correctLine, predLine, predMat, peakMesh, peakMat } = useMemo(() => {
    const mkLine = (mat: THREE.Material) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAJ * 3), 3))
      return new THREE.Line(geo, mat)
    }
    const correctMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      opacity: 0.65,
      transparent: true,
      dashSize: 6,
      gapSize: 5
    })
    const predMat = new THREE.LineBasicMaterial({ color: '#ef4444' })
    const correctLine = mkLine(correctMat)
    const predLine = mkLine(predMat)

    const peakMat = new THREE.MeshBasicMaterial({ color: '#ef4444' })
    const peakMesh = new THREE.Mesh(new THREE.CircleGeometry(7, 16), peakMat)

    return { correctLine, predLine, predMat, peakMesh, peakMat }
  }, [])

  const setLinePoints = (line: THREE.Line, pts: { x: number; y: number }[]) => {
    const pos = line.geometry.attributes.position as THREE.BufferAttribute
    pts.forEach(({ x, y }, i) => {
      const [tx, ty] = ct(wx(x), wy(y))
      pos.setXYZ(i, tx, ty, 0.15)
    })
    pos.needsUpdate = true
    line.geometry.setDrawRange(0, pts.length)
  }

  useFrame(() => {
    if (!escenaRef.current) return
    const pred = anguloPredRef.current
    const escena = escenaRef.current
    const correct = encontrarAngulo(escena)

    // Trayectoria correcta
    if (correct !== null) {
      const pts = simularTrayectoria(correct)
      setLinePoints(correctLine, pts)
      correctLine.computeLineDistances()
      correctLine.visible = true
    } else {
      correctLine.visible = false
    }

    // Trayectoria predicha
    if (pred !== null) {
      const pts = simularTrayectoria(pred)
      setLinePoints(predLine, pts)
      const errDeg = correct !== null ? Math.abs(((pred - correct) * 180) / Math.PI) : 999
      const color = errDeg < 3 ? '#10b981' : errDeg < 10 ? '#fbbf24' : '#ef4444'
      predMat.color.set(color)
      predLine.visible = pts.length > 1

      if (pts.length > 1) {
        const pico = pts.reduce((b, p) => (p.y > b.y ? p : b), pts[0])
        const [tx, ty] = ct(wx(pico.x), wy(pico.y))
        peakMesh.position.set(tx, ty, 0.2)
        peakMat.color.set(color)
        peakMesh.visible = true
      } else {
        peakMesh.visible = false
      }
    } else {
      predLine.visible = false
      peakMesh.visible = false
    }
  })

  return (
    <>
      <primitive object={correctLine} />
      <primitive object={predLine} />
      <primitive object={peakMesh} />
    </>
  )
}

// ─── Leyenda ──────────────────────────────────────────────────────────────────
function Legend() {
  const { dashLine, solidLine } = useMemo(() => {
    const mkLine = (mat: THREE.Material, y: number) => {
      const geo = new THREE.BufferGeometry()
      const pos = new Float32Array([...ct(8, y), ...ct(30, y)])
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      return new THREE.Line(geo, mat)
    }
    const dashLine = mkLine(
      new THREE.LineDashedMaterial({
        color: 0xffffff,
        opacity: 0.65,
        transparent: true,
        dashSize: 5,
        gapSize: 4
      }),
      14
    )
    const solidLine = mkLine(new THREE.LineBasicMaterial({ color: '#ef4444' }), 30)
    dashLine.computeLineDistances()
    return { dashLine, solidLine }
  }, [])

  const [lx, ly1] = ct(34, 14)
  const [, ly2] = ct(34, 30)

  return (
    <>
      <primitive object={dashLine} />
      <primitive object={solidLine} />
      <Text
        position={[lx, ly1, 0.3]}
        fontSize={9}
        color="#ffffffd9"
        anchorX="left"
        anchorY="middle">
        trayectoria correcta
      </Text>
      <Text
        position={[lx, ly2, 0.3]}
        fontSize={9}
        color="#ffffffd9"
        anchorX="left"
        anchorY="middle">
        predicción de la red
      </Text>
    </>
  )
}

// ─── Escena principal ─────────────────────────────────────────────────────────
export function AngryBirdScene({ escenaRef, anguloPredRef, hoverRef }: AngryBirdSceneProps) {
  return (
    <>
      <Background />
      <LauncherMesh />
      <ObstacleMesh escenaRef={escenaRef} hoverRef={hoverRef} />
      <TargetMesh escenaRef={escenaRef} hoverRef={hoverRef} anguloPredRef={anguloPredRef} />
      <TrajectoryLines escenaRef={escenaRef} anguloPredRef={anguloPredRef} />
      <Legend />
    </>
  )
}
