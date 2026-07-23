import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { REQUEST_STEPS } from '../data'

// The journey of one web request, as a glowing packet flying through the hall.
const WAYPOINTS: [number, number, number][] = [
  [12.6, 3.4, -12.2], // fiber enters through the wall
  [10.8, 2.0, -11.4], // router/firewall in the network cabinet
  [10.8, 1.4, -11.4], // core switch
  [8, 1.8, -6], // out into the cold aisle
  [-4, 2.1, -4.4], // load balancer — rack A1 top
  [-2, 1.6, -5.2],
  [0, 1.4, -4.4], // web server — rack A2
  [-2, 1.2, -6.4],
  [-4, 0.9, -7.6], // storage — rack B1
  [-2, 1.3, -6.2],
  [0, 1.5, -4.4], // back to the web server
  [4, 1.8, -6], // response heads back
  [10.8, 1.4, -11.4], // switch again
  [12.6, 3.4, -12.2], // out to the internet
]

const DURATION = 32 // seconds at 1x

export function RequestFlow() {
  const flow = useStore((s) => s.requestFlow)
  const packetRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const t = useRef(0)
  const trailRefs = useRef<THREE.Mesh[]>([])

  const curve = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p)))
    c.curveType = 'catmullrom'
    c.tension = 0.15
    return c
  }, [])

  const pathLine = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(300))
    const line = new THREE.Line(
      geo,
      new THREE.LineDashedMaterial({ color: '#38bdf8', transparent: true, opacity: 0.35, dashSize: 0.3, gapSize: 0.2 }),
    )
    line.computeLineDistances()
    return line
  }, [curve])

  useEffect(() => {
    t.current = 0
  }, [flow.nonce])

  useFrame(({ clock }, dt) => {
    if (!flow.active) return
    const store = useStore.getState()
    if (flow.playing) {
      t.current = Math.min(1, t.current + (dt / DURATION) * flow.speed)
    }
    // caption step from path position
    let step = 0
    for (let i = 0; i < REQUEST_STEPS.length; i++) {
      if (t.current >= REQUEST_STEPS[i].at) step = i
    }
    store.setRequestStep(step)
    if (t.current >= 1 && flow.playing) {
      store.setRequestPlaying(false)
      store.endRequestFlow(true)
      return
    }

    const p = curve.getPointAt(t.current)
    if (packetRef.current) {
      packetRef.current.position.copy(p)
      packetRef.current.rotation.y = clock.elapsedTime * 4
      const s = 1 + Math.sin(clock.elapsedTime * 12) * 0.18
      packetRef.current.scale.setScalar(s)
    }
    if (lightRef.current) lightRef.current.position.copy(p)
    // ghost trail
    trailRefs.current.forEach((m, i) => {
      if (!m) return
      const tt = Math.max(0, t.current - (i + 1) * 0.008)
      m.position.copy(curve.getPointAt(tt))
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = 0.5 * (1 - i / trailRefs.current.length)
    })
  })

  if (!flow.active) return null

  return (
    <group>
      {/* the full path, faintly visible */}
      <primitive object={pathLine} />
      {/* the packet */}
      <group ref={packetRef}>
        <mesh>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
      <pointLight ref={lightRef} color="#38bdf8" intensity={6} distance={5} />
      {/* trail ghosts */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} ref={(el) => el && (trailRefs.current[i] = el)}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
