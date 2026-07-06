import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { facilityStats, rackAvgTemp, useStore } from '../store'
import { tempColor } from '../layout'
import { drawLabel, makeLabelTexture } from './helpers'

export function CoolingUnit({ id, x, z, rotY }: { id: string; x: number; z: number; rotY: number }) {
  const unit = useStore((s) => s.cooling[id])
  const view = useStore((s) => s.view)
  const fansRef = useRef<THREE.Group>(null)
  const speed = useRef(0)

  const labelTex = useMemo(
    () => makeLabelTexture([{ text: id, color: '#bfe3ff', size: 44 }, { text: 'CRAC UNIT', color: '#5f7d99', size: 22 }]),
    [id],
  )

  useFrame((_, dt) => {
    const target = unit.status === 'running' ? 9 : 0
    speed.current += (target - speed.current) * Math.min(1, dt * 1.5)
    if (fansRef.current) {
      for (const fan of fansRef.current.children) fan.rotation.z += speed.current * dt
    }
  })

  const thermal = view === 'thermal'
  const bodyColor = thermal ? (unit.status === 'running' ? '#1d5fd0' : '#e03131') : '#d8dde3'

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.3, 0]} userData={{ iid: `cooling:${id}` }}>
        <boxGeometry args={[1.4, 2.6, 1.9]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={thermal ? bodyColor : '#000'}
          emissiveIntensity={thermal ? 0.6 : 0}
          metalness={0.3}
          roughness={0.55}
        />
      </mesh>
      {/* fan grilles */}
      <group ref={fansRef}>
        {[0.75, 1.85].map((y) => (
          <group key={y} position={[0, y, 0.96]}>
            <mesh>
              <circleGeometry args={[0.34, 24]} />
              <meshStandardMaterial color="#22262c" />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 5]} position={[0, 0, 0.01]}>
                <boxGeometry args={[0.08, 0.6, 0.015]} />
                <meshStandardMaterial color="#3d4854" metalness={0.6} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {/* status lamp */}
      <mesh position={[0.5, 2.35, 0.96]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color="#111"
          emissive={unit.status === 'running' ? '#3ddc84' : unit.status === 'failed' ? '#ff3322' : '#666'}
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0, 2.35, 0.96]} userData={{ iid: `cooling:${id}` }}>
        <planeGeometry args={[0.9, 0.42]} />
        <meshStandardMaterial map={labelTex} emissiveMap={labelTex} emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      {/* cold air glow when running (thermal view) */}
      {thermal && unit.status === 'running' && (
        <mesh position={[0, 0.4, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial color="#2b7fff" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

export function UPSBox({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  const power = useStore((s) => s.power)
  const labelTex = useMemo(
    () => makeLabelTexture([{ text: 'UPS-01', color: '#ffd18a', size: 40 }, { text: 'BATTERY BACKUP', color: '#8a6d3f', size: 20 }]),
    [],
  )
  const bars = Math.ceil(power.ups / 20)
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.1, 0]} userData={{ iid: 'ups' }}>
        <boxGeometry args={[1.4, 2.2, 1.6]} />
        <meshStandardMaterial color="#2a2f38" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.85, 0.82]} userData={{ iid: 'ups' }}>
        <planeGeometry args={[1.0, 0.45]} />
        <meshStandardMaterial map={labelTex} emissiveMap={labelTex} emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      {/* charge bars */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.4 + i * 0.2, 1.25, 0.82]}>
          <boxGeometry args={[0.14, 0.3, 0.02]} />
          <meshStandardMaterial
            color="#111"
            emissive={i < bars ? (power.ups > 30 ? '#3ddc84' : '#ff5533') : '#222'}
            emissiveIntensity={i < bars ? 1.8 : 0.1}
          />
        </mesh>
      ))}
      {/* online lamp: pulsing when discharging */}
      <PulseLamp
        position={[0, 0.7, 0.82]}
        color={power.grid ? '#3ddc84' : power.ups > 0 ? '#ffc233' : '#ff3322'}
        pulse={!power.grid && power.gen !== 'running'}
      />
    </group>
  )
}

function PulseLamp({ position, color, pulse }: { position: [number, number, number]; color: string; pulse: boolean }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.emissive.set(color)
      ref.current.emissiveIntensity = pulse ? 1.2 + Math.sin(clock.elapsedTime * 8) * 1.1 : 1.8
    }
  })
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial ref={ref} color="#111" emissive={color} />
    </mesh>
  )
}

export function GeneratorBox({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  const gen = useStore((s) => s.power.gen)
  const groupRef = useRef<THREE.Group>(null)
  const labelTex = useMemo(
    () => makeLabelTexture([{ text: 'GEN-01', color: '#ffe9a8', size: 40 }, { text: 'DIESEL BACKUP', color: '#8a7a3f', size: 20 }], { bg: '#241f10' }),
    [],
  )
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const running = gen === 'running' || gen === 'starting'
      const amp = gen === 'starting' ? 0.012 : gen === 'running' ? 0.006 : 0
      groupRef.current.position.y = running ? Math.sin(clock.elapsedTime * 40) * amp : 0
    }
  })
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <group ref={groupRef}>
        <mesh position={[0, 0.75, 0]} userData={{ iid: 'generator' }}>
          <boxGeometry args={[2.0, 1.5, 1.4]} />
          <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0.7, 1.8, 0]} userData={{ iid: 'generator' }}>
          <cylinderGeometry args={[0.1, 0.1, 1.1, 12]} />
          <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.05, 0.72]} userData={{ iid: 'generator' }}>
          <planeGeometry args={[1.1, 0.45]} />
          <meshStandardMaterial map={labelTex} emissiveMap={labelTex} emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
        <PulseLamp position={[-0.7, 1.35, 0.72]} color={gen === 'running' ? '#3ddc84' : gen === 'starting' ? '#ffc233' : '#556'} pulse={gen === 'starting'} />
      </group>
    </group>
  )
}

export function NetworkCabinet({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  const flowActive = useStore((s) => s.requestFlow.active)
  const ledsRef = useRef<THREE.Group>(null)
  const labelTex = useMemo(
    () => makeLabelTexture([{ text: 'NET-CORE', color: '#a8ffd8', size: 38 }, { text: 'FIBER UPLINK ⇅', color: '#3f8a6d', size: 22 }], { bg: '#0f1a14' }),
    [],
  )
  useFrame(({ clock }) => {
    if (!ledsRef.current) return
    ledsRef.current.children.forEach((led, i) => {
      const m = (led as THREE.Mesh).material as THREE.MeshStandardMaterial
      const t = clock.elapsedTime * (flowActive ? 18 : 6) + i * 1.7
      m.emissiveIntensity = Math.sin(t) * Math.sin(t * 1.31) > 0.1 ? 2 : 0.15
    })
  })
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.3, 0]} userData={{ iid: 'netcab' }}>
        <boxGeometry args={[1.5, 2.6, 1.4]} />
        <meshStandardMaterial color="#101820" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.35, 0.72]} userData={{ iid: 'netcab' }}>
        <planeGeometry args={[1.1, 0.45]} />
        <meshStandardMaterial map={labelTex} emissiveMap={labelTex} emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      {/* switch faceplates */}
      {[1.9, 1.55, 1.2, 0.85].map((y) => (
        <mesh key={y} position={[0, y, 0.71]} userData={{ iid: 'netcab' }}>
          <boxGeometry args={[1.3, 0.16, 0.02]} />
          <meshStandardMaterial color="#1d2733" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* port LEDs */}
      <group ref={ledsRef}>
        {Array.from({ length: 24 }).map((_, i) => (
          <mesh key={i} position={[-0.55 + (i % 8) * 0.16, 1.9 - Math.floor(i / 8) * 0.35, 0.725]}>
            <boxGeometry args={[0.04, 0.04, 0.01]} />
            <meshStandardMaterial color="#111" emissive={i % 3 === 0 ? '#39ff9c' : '#39c0ff'} emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      {/* fiber conduit up to ceiling */}
      <mesh position={[0, 3.2, 0]} userData={{ iid: 'netcab' }}>
        <cylinderGeometry args={[0.09, 0.09, 1.4, 10]} />
        <meshStandardMaterial color="#e8a33d" roughness={0.6} />
      </mesh>
    </group>
  )
}

// NOC desk with three live canvas-texture dashboards.
export function NOCDesk({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  const canvases = useMemo(
    () => [0, 1, 2].map(() => Object.assign(document.createElement('canvas'), { width: 320, height: 192 })),
    [],
  )
  const textures = useMemo(() => canvases.map((c) => {
    const t = new THREE.CanvasTexture(c)
    t.anisotropy = 4
    return t
  }), [canvases])

  useEffect(() => {
    const redraw = () => {
      const s = useStore.getState()
      const stats = facilityStats(s)
      // Screen 1: rack temperatures
      drawLabel(canvases[0], [
        { text: 'RACK TEMPERATURES', color: '#8ab8d8', size: 18 },
        ...Object.keys(s.racks).map((rid) => {
          const t = rackAvgTemp(s, rid)
          return { text: `${rid}  ${'█'.repeat(Math.max(1, Math.min(14, Math.round((t - 20) / 4))))}  ${t.toFixed(0)}°C`, color: tempColor(t), size: 19 }
        }),
      ])
      // Screen 2: alerts
      drawLabel(canvases[1], [
        { text: `ACTIVE ALERTS (${s.alerts.length})`, color: '#ffb3a0', size: 18 },
        ...s.alerts.slice(0, 6).map((a) => ({
          text: `${a.time} ${a.text.slice(0, 30)}`,
          color: a.severity === 'critical' ? '#ff6b5b' : a.severity === 'warning' ? '#ffc233' : '#7fd8a8',
          size: 15,
        })),
      ])
      // Screen 3: power
      drawLabel(canvases[2], [
        { text: 'POWER & EFFICIENCY', color: '#ffe9a8', size: 18 },
        { text: `GRID     ${s.power.grid ? 'ONLINE' : '✖ DOWN'}`, color: s.power.grid ? '#3ddc84' : '#ff5533', size: 19 },
        { text: `UPS      ${s.power.ups.toFixed(0)}%`, color: s.power.ups > 30 ? '#3ddc84' : '#ff5533', size: 19 },
        { text: `GEN      ${s.power.gen.toUpperCase()}`, color: s.power.gen === 'running' ? '#3ddc84' : '#8899aa', size: 19 },
        { text: `IT LOAD  ${stats.itPowerKw.toFixed(1)} kW`, color: '#9fd8ff', size: 19 },
        { text: `PUE      ${stats.pue ? stats.pue.toFixed(2) : '—'}`, color: '#9fd8ff', size: 19 },
        { text: `SERVERS  ${stats.online}/${stats.total} up`, color: '#9fd8ff', size: 19 },
      ])
      textures.forEach((t) => (t.needsUpdate = true))
    }
    redraw()
    const iv = setInterval(redraw, 700)
    return () => clearInterval(iv)
  }, [canvases, textures])

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* desk */}
      <mesh position={[0, 0.72, 0]} userData={{ iid: 'noc' }}>
        <boxGeometry args={[3.2, 0.08, 1.1]} />
        <meshStandardMaterial color="#3a4250" metalness={0.3} roughness={0.6} />
      </mesh>
      {[-1.4, 1.4].map((dx) => (
        <mesh key={dx} position={[dx, 0.36, 0]}>
          <boxGeometry args={[0.1, 0.72, 0.9]} />
          <meshStandardMaterial color="#262c36" />
        </mesh>
      ))}
      {/* monitors */}
      {[-1.05, 0, 1.05].map((dx, i) => (
        <group key={dx} position={[dx, 1.25, -0.25]} rotation={[0, -dx * 0.25, 0]}>
          <mesh userData={{ iid: 'noc' }}>
            <boxGeometry args={[1.0, 0.62, 0.05]} />
            <meshStandardMaterial color="#0a0d12" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.03]} userData={{ iid: 'noc' }}>
            <planeGeometry args={[0.94, 0.56]} />
            <meshBasicMaterial map={textures[i]} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.4, 0.1]}>
            <boxGeometry args={[0.12, 0.2, 0.12]} />
            <meshStandardMaterial color="#1d222b" />
          </mesh>
        </group>
      ))}
      {/* chair */}
      <group position={[0, 0, 0.9]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial color="#20252e" />
        </mesh>
        <mesh position={[0, 0.75, 0.24]}>
          <boxGeometry args={[0.5, 0.6, 0.08]} />
          <meshStandardMaterial color="#20252e" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.45, 8]} />
          <meshStandardMaterial color="#444c58" metalness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
