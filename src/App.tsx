import { useEffect } from 'react'
import { useStore } from './store'
import { Scene } from './three/Scene'
import { Landing } from './ui/Landing'
import { HUD } from './ui/HUD'
import { InfoCard } from './ui/InfoCard'

export default function App() {
  const phase = useStore((s) => s.phase)

  // Simulation heartbeat.
  useEffect(() => {
    const iv = setInterval(() => useStore.getState().tick(0.5), 500)
    return () => clearInterval(iv)
  }, [])

  // Esc closes cards/overlays (it also releases pointer lock natively).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = useStore.getState()
        if (s.selectedId) s.select(null)
        if (s.overlay !== 'none') s.setOverlay('none')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (phase === 'landing') return <Landing />

  return (
    <div className="app-3d">
      <Scene />
      <HUD />
      <InfoCard />
    </div>
  )
}
