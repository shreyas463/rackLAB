import { Suspense, lazy, useEffect } from 'react'
import { useStore } from './store'
import { Landing } from './ui/Landing'
import { HUD } from './ui/HUD'
import { InfoCard } from './ui/InfoCard'

// The 3D world (three.js + R3F, ~1 MB) is split out of the entry chunk so the
// landing page paints instantly; the import below starts the download in the
// background while the visitor reads the intro.
const Scene = lazy(() => import('./three/Scene').then((m) => ({ default: m.Scene })))
const preloadScene = () => import('./three/Scene')

export default function App() {
  const phase = useStore((s) => s.phase)

  // Warm the 3D chunk while the landing page is on screen.
  useEffect(() => {
    preloadScene()
  }, [])

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
      <Suspense fallback={<div className="scene-loading">Powering up the facility…</div>}>
        <Scene />
      </Suspense>
      <HUD />
      <InfoCard />
    </div>
  )
}
