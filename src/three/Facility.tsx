import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { BADGE_POS, DIVIDER_Z, DOOR_HALF_WIDTH, HALL, RECEPTION_POS } from '../layout'
import { makeLabelTexture } from './helpers'

function Wall({ pos, size }: { pos: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#333d4b" metalness={0.1} roughness={0.85} />
    </mesh>
  )
}

export function Room() {
  const view = useStore((s) => s.view)
  const w = HALL.maxX - HALL.minX
  const d = HALL.maxZ - HALL.minZ
  const cx = (HALL.maxX + HALL.minX) / 2
  const cz = (HALL.maxZ + HALL.minZ) / 2

  const floorTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#59626e'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#414a56'
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, 252, 252)
    ctx.fillStyle = '#39424e'
    for (const [dx, dy] of [[24, 24], [232, 24], [24, 232], [232, 232]]) {
      ctx.beginPath()
      ctx.arc(dx, dy, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(w / 1.2, d / 1.2)
    tex.anisotropy = 8
    return tex
  }, [w, d])

  return (
    <group>
      {/* raised floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTex} color={view === 'thermal' ? '#6a7480' : '#e8edf4'} roughness={0.8} metalness={0.15} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[cx, HALL.height, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#222932" roughness={0.95} />
      </mesh>
      {/* perimeter walls */}
      <Wall pos={[cx, HALL.height / 2, HALL.minZ]} size={[w, HALL.height, 0.3]} />
      <Wall pos={[cx, HALL.height / 2, HALL.maxZ]} size={[w, HALL.height, 0.3]} />
      <Wall pos={[HALL.minX, HALL.height / 2, cz]} size={[0.3, HALL.height, d]} />
      <Wall pos={[HALL.maxX, HALL.height / 2, cz]} size={[0.3, HALL.height, d]} />
      {/* divider wall segments (door gap in the middle) */}
      <Wall
        pos={[(HALL.minX - DOOR_HALF_WIDTH) / 2, HALL.height / 2, DIVIDER_Z]}
        size={[-DOOR_HALF_WIDTH - HALL.minX, HALL.height, 0.35]}
      />
      <Wall
        pos={[(HALL.maxX + DOOR_HALF_WIDTH) / 2, HALL.height / 2, DIVIDER_Z]}
        size={[HALL.maxX - DOOR_HALF_WIDTH, HALL.height, 0.35]}
      />
      {/* header over the door */}
      <Wall pos={[0, HALL.height - 0.5, DIVIDER_Z]} size={[DOOR_HALF_WIDTH * 2, 1, 0.35]} />

      {/* ceiling light fixtures */}
      {[-9, -3, 3, 9].map((lx) =>
        [-11, -6, -1, 5].map((lz) => (
          <mesh key={`${lx}-${lz}`} position={[lx, HALL.height - 0.05, lz]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 0.35]} />
            <meshStandardMaterial
              color="#fff"
              emissive={view === 'thermal' ? '#101826' : '#dfe9f5'}
              emissiveIntensity={view === 'thermal' ? 0.3 : 1.4}
            />
          </mesh>
        )),
      )}

      {/* overhead cable trays above the rack rows */}
      {[-3, -9].map((tz) => (
        <group key={tz}>
          <mesh position={[0, 3.35, tz]}>
            <boxGeometry args={[16, 0.08, 0.6]} />
            <meshStandardMaterial color="#3d4854" metalness={0.6} roughness={0.5} />
          </mesh>
          {[-0.15, 0.05, 0.2].map((dy, i) => (
            <mesh key={i} position={[0, 3.45 + dy * 0.3, tz + (i - 1) * 0.15]}>
              <boxGeometry args={[15.6, 0.05, 0.05]} />
              <meshStandardMaterial color={['#2c72d8', '#d8b02c', '#d84a2c'][i]} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* hot/cold aisle floor markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -6]}>
        <planeGeometry args={[14, 2.6]} />
        <meshBasicMaterial color="#1d4ed8" transparent opacity={view === 'thermal' ? 0.3 : 0.08} depthWrite={false} />
      </mesh>
      {[-0.4, -11.6].map((mz) => (
        <mesh key={mz} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, mz]}>
          <planeGeometry args={[14, 1.6]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={view === 'thermal' ? 0.25 : 0.06} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function Lobby() {
  const badgeScanned = useStore((s) => s.badgeScanned)
  const secDoorOpen = useStore((s) => s.secDoorOpen)
  const leftRef = useRef<THREE.Mesh>(null)
  const rightRef = useRef<THREE.Mesh>(null)

  const signTex = useMemo(
    () =>
      makeLabelTexture(
        [
          { text: 'RACKLAB', color: '#7dd3fc', size: 52 },
          { text: 'DATA CENTER · VISITOR ENTRANCE', color: '#64748b', size: 20 },
        ],
        { w: 512, h: 128, bg: '#0a0f16' },
      ),
    [],
  )
  const secTex = useMemo(
    () =>
      makeLabelTexture(
        [
          { text: '⚠ RESTRICTED AREA', color: '#fbbf24', size: 34 },
          { text: 'AUTHORIZED PERSONNEL ONLY', color: '#94a3b8', size: 20 },
          { text: 'BADGE REQUIRED →', color: '#94a3b8', size: 20 },
        ],
        { w: 512, h: 160, bg: '#161006' },
      ),
    [],
  )

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3)
    if (leftRef.current) {
      const target = secDoorOpen ? -DOOR_HALF_WIDTH * 1.9 : -DOOR_HALF_WIDTH / 2
      leftRef.current.position.x += (target - leftRef.current.position.x) * k
    }
    if (rightRef.current) {
      const target = secDoorOpen ? DOOR_HALF_WIDTH * 1.9 : DOOR_HALF_WIDTH / 2
      rightRef.current.position.x += (target - rightRef.current.position.x) * k
    }
  })

  return (
    <group>
      {/* sliding glass security doors */}
      <group position={[0, 0, DIVIDER_Z]}>
        <mesh ref={leftRef} position={[-DOOR_HALF_WIDTH / 2, 1.5, 0]} userData={{ iid: 'secdoor' }}>
          <boxGeometry args={[DOOR_HALF_WIDTH, 3, 0.08]} />
          <meshStandardMaterial color="#7fb8d8" transparent opacity={0.28} metalness={0.9} roughness={0.05} />
        </mesh>
        <mesh ref={rightRef} position={[DOOR_HALF_WIDTH / 2, 1.5, 0]} userData={{ iid: 'secdoor' }}>
          <boxGeometry args={[DOOR_HALF_WIDTH, 3, 0.08]} />
          <meshStandardMaterial color="#7fb8d8" transparent opacity={0.28} metalness={0.9} roughness={0.05} />
        </mesh>
        {/* door status lamp */}
        <mesh position={[0, 2.75, 0.1]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#111" emissive={badgeScanned ? '#3ddc84' : '#ff3322'} emissiveIntensity={2.2} />
        </mesh>
      </group>

      {/* restricted sign next to the door */}
      <mesh position={[3.4, 2.1, DIVIDER_Z + 0.19]}>
        <planeGeometry args={[2.2, 0.7]} />
        <meshStandardMaterial map={secTex} emissiveMap={secTex} emissive="#fff" emissiveIntensity={0.5} />
      </mesh>

      {/* big lobby sign */}
      <mesh position={[0, 3.1, HALL.maxZ - 0.16]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5, 1.25]} />
        <meshStandardMaterial map={signTex} emissiveMap={signTex} emissive="#fff" emissiveIntensity={0.7} />
      </mesh>

      {/* reception desk */}
      <group position={[RECEPTION_POS.x, 0, RECEPTION_POS.z]}>
        <mesh position={[0, 0.55, 0]} userData={{ iid: 'reception' }}>
          <boxGeometry args={[3.0, 1.1, 1.1]} />
          <meshStandardMaterial color="#2b3442" metalness={0.2} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.13, 0]} userData={{ iid: 'reception' }}>
          <boxGeometry args={[3.2, 0.06, 1.3]} />
          <meshStandardMaterial color="#4a5568" metalness={0.4} roughness={0.4} />
        </mesh>
        {/* accent light strip */}
        <mesh position={[0, 0.35, 0.56]}>
          <boxGeometry args={[2.9, 0.05, 0.02]} />
          <meshStandardMaterial color="#111" emissive="#38bdf8" emissiveIntensity={1.6} />
        </mesh>
        {/* little monitor */}
        <mesh position={[-0.8, 1.45, -0.1]} rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.55, 0.35, 0.04]} />
          <meshStandardMaterial color="#0a0d12" emissive="#1a2c40" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* badge kiosk */}
      <group position={[BADGE_POS.x, 0, BADGE_POS.z]}>
        <mesh position={[0, 0.55, 0]} userData={{ iid: 'badge' }}>
          <boxGeometry args={[0.5, 1.1, 0.5]} />
          <meshStandardMaterial color="#233043" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.16, 0]} rotation={[-0.5, 0, 0]} userData={{ iid: 'badge' }}>
          <boxGeometry args={[0.46, 0.32, 0.06]} />
          <meshStandardMaterial
            color="#0a0d12"
            emissive={badgeScanned ? '#1a4d2e' : '#2c3e50'}
            emissiveIntensity={1}
          />
        </mesh>
        {/* floating badge card */}
        {!badgeScanned && <FloatingBadge />}
      </group>

      {/* security camera above the door */}
      <group position={[-2.6, 3.3, DIVIDER_Z + 0.3]} rotation={[0.4, 2.6, 0]}>
        <mesh>
          <boxGeometry args={[0.32, 0.16, 0.16]} />
          <meshStandardMaterial color="#d8dde3" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.1, 12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <PulseDot />
      </group>

      {/* lobby plants */}
      {[[-9, 6.5], [9, 6.5]].map(([px, pz]) => (
        <group key={px} position={[px, 0, pz]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.32, 0.4, 0.6, 12]} />
            <meshStandardMaterial color="#3a3f47" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.sin(i * 2.2) * 0.15, 0.95 + (i % 2) * 0.25, Math.cos(i * 2.2) * 0.15]} rotation={[Math.sin(i) * 0.4, i, 0]}>
              <coneGeometry args={[0.16, 0.9, 6]} />
              <meshStandardMaterial color="#2f7d4f" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function PulseDot() {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.emissiveIntensity = Math.sin(clock.elapsedTime * 3) > 0 ? 2.5 : 0.2
  })
  return (
    <mesh position={[-0.1, 0.1, 0.09]}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshStandardMaterial ref={ref} color="#111" emissive="#ff3322" />
    </mesh>
  )
}

function FloatingBadge() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 1.55 + Math.sin(clock.elapsedTime * 2) * 0.06
      ref.current.rotation.y = clock.elapsedTime * 1.2
    }
  })
  return (
    <group ref={ref} position={[0, 1.55, 0]}>
      <mesh userData={{ iid: 'badge' }}>
        <boxGeometry args={[0.26, 0.36, 0.02]} />
        <meshStandardMaterial color="#e8eef5" emissive="#38bdf8" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.05, 0.012]}>
        <planeGeometry args={[0.18, 0.12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  )
}
