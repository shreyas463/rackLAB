import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { tempColor } from '../layout'
import { makeLabelTexture } from './helpers'

const FRAME_W = 1.1
const FRAME_H = 2.3
const FRAME_D = 1.3

function statusColor(status: string): string {
  switch (status) {
    case 'online':
      return '#3ddc84'
    case 'warning':
      return '#ffc233'
    case 'critical':
      return '#ff5533'
    case 'failed':
      return '#ff2222'
    default:
      return '#556'
  }
}

function ServerUnit({ serverId, y }: { serverId: string; y: number }) {
  const srv = useStore((s) => s.servers[serverId])
  const view = useStore((s) => s.view)
  const ledRef = useRef<THREE.MeshStandardMaterial>(null)
  const actRef = useRef<THREE.MeshStandardMaterial>(null)
  const phase = useMemo(() => Math.random() * 10, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (ledRef.current) {
      // status LED: solid green, blinking red when critical/failed
      const bad = srv.status === 'critical' || srv.status === 'failed'
      ledRef.current.emissiveIntensity = bad ? (Math.sin(t * 10) > 0 ? 2.5 : 0.15) : srv.status === 'off' ? 0.05 : 1.6
    }
    if (actRef.current) {
      // activity LED flickers with workload
      const active = srv.status !== 'off' && srv.status !== 'failed'
      const flicker = Math.sin(t * 7.3) * Math.sin(t * 13.7) > (1 - srv.workload / 60) ? 1 : 0
      actRef.current.emissiveIntensity = active ? 0.3 + flicker * 1.8 : 0
    }
  })

  const thermal = view === 'thermal'
  const isGpu = srv.kind === 'gpu'
  const bodyColor = thermal ? tempColor(srv.temp) : isGpu ? '#2a2030' : '#20242c'
  const faceColor = thermal ? bodyColor : isGpu ? '#3a2c44' : '#2b3038'

  return (
    <group position={[0, y, 0]} userData={{ iid: `server:${serverId}` }}>
      <mesh userData={{ iid: `server:${serverId}` }}>
        <boxGeometry args={[0.95, 0.22, 1.05]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={thermal ? tempColor(srv.temp) : '#000000'}
          emissiveIntensity={thermal ? 0.85 : 0}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      {/* faceplate */}
      <mesh position={[0, 0, 0.53]} userData={{ iid: `server:${serverId}` }}>
        <boxGeometry args={[0.95, 0.2, 0.02]} />
        <meshStandardMaterial color={faceColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* GPU accent stripe */}
      {isGpu && !thermal && (
        <mesh position={[0.34, 0, 0.55]}>
          <boxGeometry args={[0.16, 0.14, 0.01]} />
          <meshStandardMaterial color="#111" emissive="#c04bff" emissiveIntensity={1.4} />
        </mesh>
      )}
      {/* status LED */}
      <mesh position={[-0.38, 0, 0.55]}>
        <boxGeometry args={[0.05, 0.05, 0.01]} />
        <meshStandardMaterial ref={ledRef} color="#111" emissive={statusColor(srv.status)} emissiveIntensity={1.5} />
      </mesh>
      {/* activity LED */}
      <mesh position={[-0.28, 0, 0.55]}>
        <boxGeometry args={[0.05, 0.05, 0.01]} />
        <meshStandardMaterial ref={actRef} color="#111" emissive="#39c0ff" emissiveIntensity={0.5} />
      </mesh>
      {/* drive bays hint */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.15 + i * 0.18, 0, 0.55]}>
          <boxGeometry args={[0.14, 0.1, 0.005]} />
          <meshStandardMaterial color="#171a20" metalness={0.2} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export function RackMesh({ id, x, z, rotY }: { id: string; x: number; z: number; rotY: number }) {
  const rack = useStore((s) => s.racks[id])
  const view = useStore((s) => s.view)
  const doorRef = useRef<THREE.Group>(null)
  const avgTempRef = useRef(36)
  const overlayRef = useRef<THREE.MeshStandardMaterial>(null)
  const servers = useStore((s) => s.servers)

  const labelTex = useMemo(
    () =>
      makeLabelTexture([
        { text: `RACK ${id}`, color: '#cfe8ff', size: 40 },
        { text: 'ROW ' + id[0] + ' · POS ' + id[1], color: '#5f7d99', size: 22 },
      ]),
    [id],
  )

  const temps = rack.serverIds.map((sid) => servers[sid].temp)
  const avg = temps.reduce((a, b) => a + b, 0) / temps.length
  avgTempRef.current = avg

  useFrame((_, dt) => {
    if (doorRef.current) {
      const target = rack.doorOpen ? -1.9 : 0
      doorRef.current.rotation.y += (target - doorRef.current.rotation.y) * Math.min(1, dt * 6)
    }
    if (overlayRef.current) {
      overlayRef.current.opacity = view === 'thermal' ? 0.35 : 0
      overlayRef.current.color.set(tempColor(avgTempRef.current))
      overlayRef.current.emissive.set(tempColor(avgTempRef.current))
    }
  })

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* frame: open-front shell so the servers inside are visible */}
      {/* side walls */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (FRAME_W / 2 - 0.03), FRAME_H / 2, 0]} userData={{ iid: `rack:${id}` }}>
          <boxGeometry args={[0.06, FRAME_H, FRAME_D]} />
          <meshStandardMaterial color="#161a21" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* top */}
      <mesh position={[0, FRAME_H - 0.03, 0]} userData={{ iid: `rack:${id}` }}>
        <boxGeometry args={[FRAME_W, 0.06, FRAME_D]} />
        <meshStandardMaterial color="#161a21" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* plinth */}
      <mesh position={[0, 0.1, 0]} userData={{ iid: `rack:${id}` }}>
        <boxGeometry args={[FRAME_W, 0.2, FRAME_D]} />
        <meshStandardMaterial color="#0d1015" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* back panel */}
      <mesh position={[0, FRAME_H / 2, -FRAME_D / 2 + 0.03]} userData={{ iid: `rack:${id}` }}>
        <boxGeometry args={[FRAME_W, FRAME_H, 0.06]} />
        <meshStandardMaterial color="#0b0e13" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* dark interior backdrop behind the servers */}
      <mesh position={[0, FRAME_H / 2, -0.35]}>
        <boxGeometry args={[FRAME_W - 0.1, FRAME_H - 0.1, 0.4]} />
        <meshStandardMaterial color="#07090c" metalness={0.2} roughness={0.9} />
      </mesh>
      {/* servers */}
      {rack.serverIds.map((sid, i) => (
        <ServerUnit key={sid} serverId={sid} y={0.42 + i * 0.31} />
      ))}
      {/* thermal overlay shell */}
      <mesh position={[0, FRAME_H / 2, 0]}>
        <boxGeometry args={[FRAME_W + 0.06, FRAME_H + 0.06, FRAME_D + 0.06]} />
        <meshStandardMaterial ref={overlayRef} transparent opacity={0} emissiveIntensity={0.9} depthWrite={false} />
      </mesh>
      {/* label plate */}
      <mesh position={[0, FRAME_H + 0.001, 0.4]} rotation={[-Math.PI / 2.6, 0, 0]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshStandardMaterial map={labelTex} emissiveMap={labelTex} emissive="#ffffff" emissiveIntensity={0.55} />
      </mesh>
      {/* mesh door on hinge */}
      <group position={[-FRAME_W / 2, 0, FRAME_D / 2 + 0.02]} ref={doorRef}>
        <mesh position={[FRAME_W / 2, FRAME_H / 2, 0]} userData={{ iid: `rackdoor:${id}` }}>
          <boxGeometry args={[FRAME_W, FRAME_H, 0.03]} />
          <meshStandardMaterial color="#3a4a5c" metalness={0.7} roughness={0.35} transparent opacity={0.22} />
        </mesh>
        <mesh position={[FRAME_W - 0.08, FRAME_H / 2, 0.04]}>
          <boxGeometry args={[0.04, 0.28, 0.03]} />
          <meshStandardMaterial color="#8fa3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}
