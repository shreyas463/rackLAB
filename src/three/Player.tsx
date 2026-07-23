import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { HALL, PLAYER, SECURITY_DOOR_COLLIDER, STATIC_COLLIDERS, Collider } from '../layout'

const CENTER = new THREE.Vector2(0, 0)

function collides(x: number, z: number, colliders: Collider[]): boolean {
  const r = PLAYER.radius
  if (x < HALL.minX + r + 0.2 || x > HALL.maxX - r - 0.2) return true
  if (z < HALL.minZ + r + 0.2 || z > HALL.maxZ - r - 0.2) return true
  for (const c of colliders) {
    if (Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r) return true
  }
  return false
}

export function Player() {
  const { camera, gl, scene } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const yaw = useRef(Math.PI) // start facing the hall (-z)... camera at +z looking toward -z means yaw 0? we set below
  const pitch = useRef(0)
  const pos = useRef(new THREE.Vector3(0, PLAYER.height, 6.5))
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const lastHover = useRef<string | null>(null)

  useEffect(() => {
    yaw.current = 0 // looking down -z by default
    camera.position.copy(pos.current)
    camera.rotation.set(0, 0, 0, 'YXZ')
    ;(camera as THREE.PerspectiveCamera).fov = 72
    camera.near = 0.1
    camera.far = 80
    camera.updateProjectionMatrix()
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement

    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas
      useStore.getState().setPointerLocked(locked)
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      const sens = 0.0022
      yaw.current -= e.movementX * sens
      pitch.current = Math.max(-1.35, Math.min(1.35, pitch.current - e.movementY * sens))
    }
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      const s = useStore.getState()
      if (e.code === 'KeyE' && document.pointerLockElement === canvas) {
        s.interact(s.hoveredId)
      }
      if (e.code === 'KeyT' && s.phase === 'exploring') {
        s.setView(s.view === 'thermal' ? 'normal' : 'thermal')
      }
      if (e.code === 'KeyM' && s.phase === 'exploring') s.toggleMuted()
    }
    const onKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false)
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas && e.button === 0) {
        const s = useStore.getState()
        s.interact(s.hoveredId)
      }
    }

    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
    }
  }, [gl])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = useStore.getState()

    // Debug/console teleport: window.teleport = { x, z, yaw?, pitch? }
    const w = window as unknown as { teleport?: { x: number; z: number; yaw?: number; pitch?: number } | null }
    const tp = w.teleport
    if (tp) {
      pos.current.set(tp.x, PLAYER.height, tp.z)
      if (typeof tp.yaw === 'number') yaw.current = tp.yaw
      if (typeof tp.pitch === 'number') pitch.current = tp.pitch
      w.teleport = null
    }

    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')

    if (s.pointerLocked) {
      const k = keys.current
      const forward = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0)
      const strafe = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0)
      if (forward !== 0 || strafe !== 0) {
        const speed = k['ShiftLeft'] || k['ShiftRight'] ? PLAYER.runSpeed : PLAYER.speed
        const dir = new THREE.Vector3(strafe, 0, -forward)
          .normalize()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current)
          .multiplyScalar(speed * dt)

        const colliders = s.secDoorOpen ? STATIC_COLLIDERS : [...STATIC_COLLIDERS, SECURITY_DOOR_COLLIDER]
        const nx = pos.current.x + dir.x
        const nz = pos.current.z + dir.z
        if (!collides(nx, pos.current.z, colliders)) pos.current.x = nx
        if (!collides(pos.current.x, nz, colliders)) pos.current.z = nz
      }
      // subtle head bob while moving
      const moving = forward !== 0 || strafe !== 0
      const bobT = performance.now() / 1000
      pos.current.y = PLAYER.height + (moving ? Math.sin(bobT * 9) * 0.025 : 0)
    }
    camera.position.copy(pos.current)

    // Interaction raycast from screen center.
    if (s.pointerLocked) {
      raycaster.setFromCamera(CENTER, camera)
      raycaster.far = 3.6
      const hits = raycaster.intersectObjects(scene.children, true)
      let found: string | null = null
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object
        while (obj) {
          if (obj.userData?.iid) {
            found = obj.userData.iid as string
            break
          }
          obj = obj.parent
        }
        if (found) break
        // opaque non-interactable blocks the ray (walls, desks)
        const mat = (hit.object as THREE.Mesh).material as THREE.Material | undefined
        if (mat && !mat.transparent) break
      }
      if (found !== lastHover.current) {
        lastHover.current = found
        s.setHovered(found)
      }
    } else if (lastHover.current) {
      lastHover.current = null
      s.setHovered(null)
    }
  })

  return null
}
