import { Canvas } from '@react-three/fiber'
import { useStore } from '../store'
import {
  COOLING_POSITIONS,
  GEN_POS,
  NETCAB_POS,
  NOC_POS,
  RACK_POSITIONS,
  UPS_POS,
} from '../layout'
import { Room, Lobby } from './Facility'
import { RackMesh } from './Rack'
import { CoolingUnit, GeneratorBox, NetworkCabinet, NOCDesk, UPSBox } from './Equipment'
import { Player } from './Player'
import { RequestFlow } from './RequestFlow'

function Lights() {
  const view = useStore((s) => s.view)
  const dim = view === 'thermal' ? 0.25 : 1
  return (
    <>
      <ambientLight intensity={1.1 * dim} color="#cdd8e8" />
      <hemisphereLight intensity={0.9 * dim} color="#bcd0e8" groundColor="#3a4350" />
      <pointLight position={[0, 3.6, -6]} intensity={90 * dim} distance={20} color="#e8f0fa" />
      <pointLight position={[-8, 3.6, -10]} intensity={70 * dim} distance={18} color="#e8f0fa" />
      <pointLight position={[8, 3.6, -10]} intensity={70 * dim} distance={18} color="#e8f0fa" />
      <pointLight position={[-8, 3.6, -1]} intensity={55 * dim} distance={16} color="#e8f0fa" />
      <pointLight position={[8, 3.6, -1]} intensity={55 * dim} distance={16} color="#e8f0fa" />
      <pointLight position={[0, 3.4, 5]} intensity={80 * dim} distance={18} color="#f5ead8" />
      <pointLight position={[-7, 3.4, 6]} intensity={40 * dim} distance={14} color="#f5ead8" />
      <pointLight position={[7, 3.4, 6]} intensity={40 * dim} distance={14} color="#f5ead8" />
    </>
  )
}

export function Scene() {
  const view = useStore((s) => s.view)
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      dpr={[1, 1.75]}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(view === 'thermal' ? '#05070c' : '#0a0e14')
        ;(window as unknown as Record<string, unknown>).scene3 = scene
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[view === 'thermal' ? '#04060a' : '#0a0e14']} />
      <fog attach="fog" args={[view === 'thermal' ? '#04060a' : '#0a0e14', 20, 55]} />
      <Lights />
      <Room />
      <Lobby />
      {RACK_POSITIONS.map((r) => (
        <RackMesh key={r.id} id={r.id} x={r.x} z={r.z} rotY={r.rotY} />
      ))}
      {COOLING_POSITIONS.map((c) => (
        <CoolingUnit key={c.id} id={c.id} x={c.x} z={c.z} rotY={c.rotY} />
      ))}
      <UPSBox {...UPS_POS} />
      <GeneratorBox {...GEN_POS} />
      <NetworkCabinet {...NETCAB_POS} />
      <NOCDesk {...NOC_POS} />
      <RequestFlow />
      <Player />
    </Canvas>
  )
}
