import { create } from 'zustand'
import { RACK_POSITIONS } from './layout'
import { sfx } from './audio'
import {
  ServerKind,
  ServerStatus,
  THERMAL,
  approachTemp,
  computePUE,
  coolingPowered,
  serverAmbient,
  serverPowerDraw,
  serversPowered as serversHavePower,
  statusFromTemp,
  stepPower,
  thermalTarget,
} from './sim/model'

export type { ServerStatus, ServerKind } from './sim/model'

export interface Server {
  id: string
  rackId: string
  unit: number
  name: string
  ip: string
  kind: ServerKind
  status: ServerStatus
  workload: number // 0..100
  temp: number // °C
}

export interface Rack {
  id: string
  name: string
  doorOpen: boolean
  serverIds: string[]
  coolerId: string
}

export interface Cooling {
  id: string
  name: string
  status: 'running' | 'off' | 'failed'
  fanSpeed: number // rpm-ish, for display
}

export interface Alert {
  id: number
  text: string
  severity: 'info' | 'warning' | 'critical'
  time: string
}

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'achievement' | 'deny'
}

export interface MissionStep {
  text: string
  done: boolean
}

export const ACHIEVEMENTS: Record<string, { title: string; desc: string; icon: string }> = {
  'access-granted': { title: 'Access Granted', desc: 'Scanned a visitor badge and entered the server hall.', icon: '🪪' },
  'first-boot': { title: 'First Server Boot', desc: 'Powered a server on or off with your own hands.', icon: '🖥️' },
  'cooling-tech': { title: 'Cooling Technician', desc: 'Rescued an overheating rack by fixing the cooling.', icon: '❄️' },
  'power-restorer': { title: 'Power Restorer', desc: 'Brought the backup generator online during an outage.', icon: '⚡' },
  'request-follower': { title: 'Packet Chaser', desc: 'Followed a web request through the whole facility.', icon: '📦' },
  'energy-saver': { title: 'Energy Saver', desc: 'Right-sized the facility and slashed its power bill.', icon: '🌱' },
  explorer: { title: 'Data Center Explorer', desc: 'Inspected 7 different kinds of equipment.', icon: '🧭' },
}

/** Energy-efficiency mission targets. */
export const ENERGY_TARGET_KW = 16
export const ENERGY_MIN_ONLINE = 18
export const ENERGY_CONSOLIDATE_TO = 24

let alertSeq = 1
let toastSeq = 1

function now(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function buildInitialWorld() {
  const servers: Record<string, Server> = {}
  const racks: Record<string, Rack> = {}
  let ipCounter = 10
  for (const r of RACK_POSITIONS) {
    const serverIds: string[] = []
    // Rack B3 is a dense GPU/AI rack — hotter, thirstier, and the star of the
    // energy-efficiency mission.
    const isGpuRack = r.id === 'B3'
    for (let u = 1; u <= 6; u++) {
      const id = `${r.id}-${u}`
      serverIds.push(id)
      servers[id] = {
        id,
        rackId: r.id,
        unit: u,
        name: `${isGpuRack ? 'gpu' : 'srv'}-${r.id.toLowerCase()}-${u}`,
        ip: `10.40.${r.id.charCodeAt(1) - 48 + (r.id[0] === 'B' ? 3 : 0)}.${ipCounter++}`,
        kind: isGpuRack ? 'gpu' : 'cpu',
        status: 'online',
        workload: 15 + Math.round(Math.random() * 45),
        temp: 34 + Math.random() * 6,
      }
    }
    racks[r.id] = {
      id: r.id,
      name: isGpuRack ? `Rack ${r.id} · GPU` : `Rack ${r.id}`,
      doorOpen: false,
      serverIds,
      coolerId: r.coolerId,
    }
  }
  // A couple of pre-baked stories to discover.
  servers['A3-4'].status = 'failed'
  servers['A3-4'].workload = 0
  servers['B1-2'].status = 'off'
  servers['B1-2'].workload = 0
  return { servers, racks }
}

export interface State {
  phase: 'landing' | 'exploring'
  mode: 'beginner' | 'engineer'
  view: 'normal' | 'thermal'
  muted: boolean
  pointerLocked: boolean
  overlay: 'none' | 'help' | 'progress'

  hoveredId: string | null
  selectedId: string | null
  discovered: string[]

  servers: Record<string, Server>
  racks: Record<string, Rack>
  cooling: Record<string, Cooling>
  power: {
    grid: boolean
    ups: number // % charge
    gen: 'off' | 'starting' | 'running'
    genTimer: number
  }
  badgeScanned: boolean
  secDoorOpen: boolean

  alerts: Alert[]
  toasts: Toast[]
  achievements: string[]

  mission: { id: string; title: string; steps: MissionStep[]; complete: boolean } | null

  requestFlow: { active: boolean; playing: boolean; speed: number; step: number; nonce: number }

  // --- actions ---
  enter: () => void
  setMode: (m: State['mode']) => void
  setView: (v: State['view']) => void
  toggleMuted: () => void
  setPointerLocked: (l: boolean) => void
  setOverlay: (o: State['overlay']) => void
  setHovered: (id: string | null) => void
  select: (id: string | null) => void
  interact: (id: string | null) => void

  toggleRackDoor: (rackId: string) => void
  toggleServerPower: (id: string) => void
  restartServer: (id: string) => void
  setServerWorkload: (id: string, w: number) => void
  setCoolingStatus: (id: string, status: Cooling['status']) => void
  cutGrid: () => void
  restoreGrid: () => void
  startGenerator: () => void
  stopGenerator: () => void
  scanBadge: () => void
  ackAlerts: () => void
  startMission: () => void
  startEnergyMission: () => void
  abandonMission: () => void

  startRequestFlow: () => void
  setRequestPlaying: (p: boolean) => void
  setRequestSpeed: (s: number) => void
  setRequestStep: (s: number) => void
  endRequestFlow: (completed: boolean) => void

  pushToast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  unlock: (id: string) => void
  tick: (dt: number) => void
}

function pushAlertList(alerts: Alert[], text: string, severity: Alert['severity']): Alert[] {
  const next = [{ id: alertSeq++, text, severity, time: now() }, ...alerts]
  return next.slice(0, 8)
}

export const useStore = create<State>((set, get) => ({
  phase: 'landing',
  mode: 'beginner',
  view: 'normal',
  muted: false,
  pointerLocked: false,
  overlay: 'none',

  hoveredId: null,
  selectedId: null,
  discovered: [],

  ...buildInitialWorld(),
  cooling: {
    'CU-1': { id: 'CU-1', name: 'Cooling Unit CU-1', status: 'running', fanSpeed: 1450 },
    'CU-2': { id: 'CU-2', name: 'Cooling Unit CU-2', status: 'running', fanSpeed: 1450 },
  },
  power: { grid: true, ups: 100, gen: 'off', genTimer: 0 },
  badgeScanned: false,
  secDoorOpen: false,

  alerts: [
    { id: alertSeq++, text: 'Server A3-4 hardware failure — awaiting replacement', severity: 'warning', time: now() },
    { id: alertSeq++, text: 'Facility systems nominal. Welcome to RackLab.', severity: 'info', time: now() },
  ],
  toasts: [],
  achievements: [],
  mission: null,
  requestFlow: { active: false, playing: false, speed: 1, step: -1, nonce: 0 },

  enter: () => {
    sfx.start()
    set({ phase: 'exploring' })
  },
  setMode: (mode) => {
    sfx.blip(mode === 'engineer' ? 990 : 660, 0.08, 'sine', 0.05)
    set({ mode })
  },
  setView: (view) => {
    sfx.blip(view === 'thermal' ? 440 : 550, 0.1, 'sine', 0.05)
    set({ view })
  },
  toggleMuted: () => {
    const muted = !get().muted
    sfx.setMuted(muted)
    set({ muted })
  },
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setOverlay: (overlay) => set({ overlay, selectedId: overlay === 'none' ? get().selectedId : null }),
  setHovered: (hoveredId) => {
    if (get().hoveredId !== hoveredId) set({ hoveredId })
  },

  select: (selectedId) => set({ selectedId }),

  interact: (id) => {
    if (!id) return
    const s = get()
    const [kind, rest] = id.includes(':') ? id.split(':') : [id, '']
    if (kind === 'rackdoor') {
      s.toggleRackDoor(rest)
      return
    }
    if (kind === 'secdoor') {
      if (!s.badgeScanned) {
        sfx.deny()
        s.pushToast('⛔ Access denied. Scan a visitor badge at the kiosk first.', 'deny')
      }
      return
    }
    sfx.select()
    // Track equipment discovery for the Explorer badge.
    const typeKey = kind
    let discovered = s.discovered
    if (!discovered.includes(typeKey)) {
      discovered = [...discovered, typeKey]
      set({ discovered })
      if (discovered.length >= 7) s.unlock('explorer')
    }
    set({ selectedId: id })
    document.exitPointerLock?.()
  },

  toggleRackDoor: (rackId) => {
    const rack = get().racks[rackId]
    if (!rack) return
    sfx.door()
    set({ racks: { ...get().racks, [rackId]: { ...rack, doorOpen: !rack.doorOpen } } })
  },

  toggleServerPower: (id) => {
    const s = get()
    const srv = s.servers[id]
    if (!srv || srv.status === 'failed') return
    const off = srv.status !== 'off'
    if (off) sfx.powerDown()
    else sfx.blip(1200, 0.15, 'sine', 0.07)
    set({
      servers: {
        ...s.servers,
        [id]: { ...srv, status: off ? 'off' : 'online', workload: off ? 0 : 20 },
      },
    })
    s.unlock('first-boot')
  },

  restartServer: (id) => {
    const s = get()
    const srv = s.servers[id]
    if (!srv) return
    sfx.blip(1200, 0.15, 'sine', 0.07)
    set({
      servers: { ...s.servers, [id]: { ...srv, status: 'online', workload: 20 } },
      alerts: pushAlertList(s.alerts, `Server ${id} restarted by operator`, 'info'),
    })
  },

  setServerWorkload: (id, w) => {
    const s = get()
    const srv = s.servers[id]
    if (!srv) return
    set({ servers: { ...s.servers, [id]: { ...srv, workload: w } } })
  },

  setCoolingStatus: (id, status) => {
    const s = get()
    const unit = s.cooling[id]
    if (!unit) return
    if (status === 'running') sfx.blip(300, 0.5, 'sine', 0.06)
    else sfx.powerDown()
    const alerts =
      status === 'failed'
        ? pushAlertList(s.alerts, `${unit.name} FAILURE — cooling capacity reduced`, 'critical')
        : status === 'running' && unit.status !== 'running'
          ? pushAlertList(s.alerts, `${unit.name} back online`, 'info')
          : s.alerts
    set({
      cooling: { ...s.cooling, [id]: { ...unit, status, fanSpeed: status === 'running' ? 1450 : 0 } },
      alerts,
    })
  },

  cutGrid: () => {
    const s = get()
    if (!s.power.grid) return
    sfx.powerDown()
    set({
      power: { ...s.power, grid: false },
      alerts: pushAlertList(s.alerts, 'UTILITY POWER LOST — UPS carrying server load. Cooling is DOWN.', 'critical'),
    })
    s.pushToast('💡 Grid power cut! The UPS batteries are holding the servers up — but cooling is offline. Start the generator!')
  },

  restoreGrid: () => {
    const s = get()
    if (s.power.grid) return
    sfx.success()
    set({
      power: { ...s.power, grid: true, gen: 'off', genTimer: 0 },
      alerts: pushAlertList(s.alerts, 'Utility power restored. Systems returning to normal.', 'info'),
    })
  },

  startGenerator: () => {
    const s = get()
    if (s.power.gen !== 'off') return
    sfx.blip(90, 1.2, 'sawtooth', 0.09)
    set({
      power: { ...s.power, gen: 'starting', genTimer: 8 },
      alerts: pushAlertList(s.alerts, 'Backup generator cranking… ~8s to stable output', 'info'),
    })
  },

  stopGenerator: () => {
    const s = get()
    sfx.powerDown()
    set({ power: { ...s.power, gen: 'off', genTimer: 0 } })
  },

  scanBadge: () => {
    const s = get()
    if (s.badgeScanned) return
    sfx.success()
    set({
      badgeScanned: true,
      secDoorOpen: true,
      alerts: pushAlertList(s.alerts, 'Visitor badge issued — hall access granted', 'info'),
    })
    s.unlock('access-granted')
    s.pushToast('🪪 Badge accepted. The security door to the server hall is now open!')
  },

  ackAlerts: () => {
    sfx.blip(700, 0.08, 'sine', 0.05)
    set({ alerts: [] })
  },

  startMission: () => {
    const s = get()
    if (s.mission && !s.mission.complete) return
    // Break CU-2 and slam rack B2 with load.
    const servers = { ...s.servers }
    for (const sid of s.racks['B2'].serverIds) {
      if (servers[sid].status === 'online' || servers[sid].status === 'warning') {
        servers[sid] = { ...servers[sid], workload: 92 + Math.random() * 8 }
      }
    }
    sfx.setAlarm(true)
    set({
      servers,
      cooling: { ...s.cooling, 'CU-2': { ...s.cooling['CU-2'], status: 'failed', fanSpeed: 0 } },
      alerts: pushAlertList(s.alerts, 'MISSION: Rack B2 overheating — cooling failure suspected', 'critical'),
      mission: {
        id: 'overheat',
        title: 'Mission: The Overheating Rack',
        steps: [
          { text: 'Switch to Thermal view (press T) to spot the hot zone', done: false },
          { text: 'Find the overheating rack and inspect one of its servers', done: false },
          { text: 'Find the failed cooling unit and restart it', done: false },
          { text: 'Wait for rack B2 to cool below 50°C', done: false },
        ],
        complete: false,
      },
    })
    s.pushToast('🚨 Mission started: something in the hall is overheating. Find it and fix it!')
  },

  startEnergyMission: () => {
    const s = get()
    if (s.mission && !s.mission.complete) return
    // Simulate a busy, over-provisioned facility: everything running hot on load,
    // the GPU/AI rack pinned near max. The power bill is enormous.
    const servers = { ...s.servers }
    for (const id of Object.keys(servers)) {
      const srv = servers[id]
      if (srv.status === 'off' || srv.status === 'failed') continue
      const busy = srv.kind === 'gpu' ? 90 + Math.random() * 10 : 55 + Math.random() * 35
      servers[id] = { ...srv, workload: busy }
    }
    set({
      servers,
      alerts: pushAlertList(
        s.alerts,
        `MISSION: facility drawing too much power — target under ${ENERGY_TARGET_KW} kW`,
        'warning',
      ),
      mission: {
        id: 'energy',
        title: 'Mission: Right-Size the Facility',
        steps: [
          { text: 'Switch to Engineer mode to read live power (kW) and PUE', done: false },
          { text: `Consolidate: power down underused servers (get to ${ENERGY_CONSOLIDATE_TO} or fewer online)`, done: false },
          { text: `Cut total facility power below ${ENERGY_TARGET_KW} kW (hint: the GPU/AI rack dominates the bill)`, done: false },
          { text: `Hold the line: keep at least ${ENERGY_MIN_ONLINE} servers online with nothing overheating`, done: false },
        ],
        complete: false,
      },
    })
    s.pushToast('🌱 Mission started: the power bill is out of control. Consolidate workloads and shut down what you don’t need.')
  },

  abandonMission: () => {
    const s = get()
    if (!s.mission) return
    if (s.mission.id === 'overheat' && s.cooling['CU-2'].status === 'failed') s.setCoolingStatus('CU-2', 'running')
    set({ mission: null })
  },

  startRequestFlow: () => {
    const s = get()
    sfx.blip(880, 0.1, 'sine', 0.06)
    set({
      requestFlow: { active: true, playing: true, speed: 1, step: 0, nonce: s.requestFlow.nonce + 1 },
      selectedId: null,
    })
  },
  setRequestPlaying: (playing) => set({ requestFlow: { ...get().requestFlow, playing } }),
  setRequestSpeed: (speed) => set({ requestFlow: { ...get().requestFlow, speed } }),
  setRequestStep: (step) => {
    if (get().requestFlow.step !== step) {
      sfx.blip(700 + step * 60, 0.06, 'sine', 0.035)
      set({ requestFlow: { ...get().requestFlow, step } })
    }
  },
  endRequestFlow: (completed) => {
    const s = get()
    set({ requestFlow: { ...s.requestFlow, active: false, playing: false, step: -1 } })
    if (completed) s.unlock('request-follower')
  },

  pushToast: (text, kind = 'info') => {
    const id = toastSeq++
    set({ toasts: [...get().toasts, { id, text, kind }] })
    setTimeout(() => get().dismissToast(id), kind === 'achievement' ? 7000 : 6000)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  unlock: (id) => {
    const s = get()
    if (s.achievements.includes(id) || !ACHIEVEMENTS[id]) return
    sfx.success()
    set({ achievements: [...s.achievements, id] })
    s.pushToast(`${ACHIEVEMENTS[id].icon} Achievement unlocked: ${ACHIEVEMENTS[id].title}`, 'achievement')
  },

  tick: (dt) => {
    const s = get()
    if (s.phase !== 'exploring') return

    let alerts = s.alerts

    // --- Power chain (pure model) ---
    const powerStep = stepPower(s.power, dt)
    const power = powerStep.power
    for (const ev of powerStep.events) alerts = pushAlertList(alerts, ev.text, ev.severity)
    if (powerStep.genJustStarted) {
      get().unlock('power-restorer')
      sfx.success()
    }
    if (powerStep.upsJustDepleted) sfx.powerDown()

    const haveServerPower = serversHavePower(power)
    const haveCoolingPower = coolingPowered(power)
    const coolerRunning = (cid: string) => haveCoolingPower && s.cooling[cid]?.status === 'running'

    // --- Servers: workload drift + thermal model (pure model) ---
    const servers: Record<string, Server> = {}
    let anyCritical = false
    for (const id of Object.keys(s.servers)) {
      const srv = { ...s.servers[id] }
      const rack = s.racks[srv.rackId]
      const ambient = serverAmbient(
        coolerRunning(rack.coolerId),
        coolerRunning(rack.coolerId === 'CU-1' ? 'CU-2' : 'CU-1'),
      )

      const powered = haveServerPower && srv.status !== 'off' && srv.status !== 'failed'
      if (powered) {
        // gentle workload random walk (missions may pin it high)
        srv.workload = Math.min(100, Math.max(4, srv.workload + (Math.random() - 0.5) * 6 * dt))
      } else {
        srv.workload = 0
      }

      srv.temp = approachTemp(srv.temp, thermalTarget(powered, ambient, srv.workload, srv.kind, srv.temp), dt)

      if (powered) {
        const prev = srv.status
        srv.status = statusFromTemp(srv.temp)
        if (srv.status === 'failed') {
          srv.workload = 0
          alerts = pushAlertList(alerts, `Server ${id} THERMAL SHUTDOWN at ${srv.temp.toFixed(0)}°C`, 'critical')
        } else if (srv.status === 'critical' && prev !== 'critical') {
          alerts = pushAlertList(alerts, `Server ${id} critical temperature ${srv.temp.toFixed(0)}°C`, 'critical')
        }
      } else if (!haveServerPower && srv.status !== 'off' && srv.status !== 'failed') {
        srv.status = 'off'
      }
      if (srv.status === 'critical') anyCritical = true
      servers[id] = srv
    }

    // --- Mission progression ---
    let mission = s.mission
    if (mission && mission.id === 'overheat' && !mission.complete) {
      const steps = mission.steps.map((st) => ({ ...st }))
      if (!steps[0].done && s.view === 'thermal') steps[0].done = true
      if (!steps[1].done && s.selectedId?.startsWith('server:B2')) steps[1].done = true
      if (!steps[2].done && s.cooling['CU-2'].status === 'running') {
        steps[2].done = true
        // The load balancer drains traffic off the stressed rack so it can recover.
        for (const sid of s.racks['B2'].serverIds) {
          if (servers[sid].workload > 45) servers[sid] = { ...servers[sid], workload: 40 }
        }
        alerts = pushAlertList(alerts, 'Traffic shifted away from rack B2 while it cools down', 'info')
      }
      const b2Max = Math.max(...s.racks['B2'].serverIds.map((sid) => servers[sid].temp))
      if (steps[2].done && !steps[3].done && b2Max < 50) steps[3].done = true
      const complete = steps.every((st) => st.done)
      const wasComplete = mission.complete
      mission = { ...mission, steps, complete }
      if (complete && !wasComplete) {
        get().unlock('cooling-tech')
        get().pushToast('✅ Mission complete! Rack B2 is back to a healthy temperature.')
        // Ease the pinned workloads back down.
        for (const sid of s.racks['B2'].serverIds) {
          if (servers[sid].workload > 60) servers[sid] = { ...servers[sid], workload: 35 }
        }
      }
    } else if (mission && mission.id === 'energy' && !mission.complete) {
      // Evaluate against the freshly-simulated server set.
      const live = Object.values(servers)
      const onlineCount = live.filter((x) => x.status === 'online' || x.status === 'warning' || x.status === 'critical').length
      const itKw = live.reduce((a, b) => a + serverPowerDraw(b.status, b.workload, b.kind) / 1000, 0)
      const coolingKw = Object.values(s.cooling).filter((c) => c.status === 'running').length * 2.4
      const totalKw = itKw + coolingKw + 1.1
      // "Overheating" means genuinely hot — a cold, pre-failed hardware unit
      // (e.g. A3-4) must not block completion.
      const anyOverheating = live.some((x) => x.status !== 'off' && x.temp >= THERMAL.warnAt)

      const steps = mission.steps.map((st) => ({ ...st }))
      if (!steps[0].done && s.mode === 'engineer') steps[0].done = true
      if (!steps[1].done && onlineCount <= ENERGY_CONSOLIDATE_TO) steps[1].done = true
      if (!steps[2].done && totalKw < ENERGY_TARGET_KW) steps[2].done = true
      steps[3].done = steps[2].done && onlineCount >= ENERGY_MIN_ONLINE && !anyOverheating
      const complete = steps.every((st) => st.done)
      const wasComplete = mission.complete
      mission = { ...mission, steps, complete }
      if (complete && !wasComplete) {
        get().unlock('energy-saver')
        get().pushToast(`✅ Mission complete! Facility down to ${totalKw.toFixed(1)} kW with ${onlineCount} servers still serving.`)
      }
    }

    // --- Alarm sound ---
    const alarm =
      anyCritical || Object.values(s.cooling).some((c) => c.status === 'failed') || (!power.grid && power.gen !== 'running')
    sfx.setAlarm(alarm && !s.muted)

    set({ servers, power, alerts, mission })
  },
}))

// Console access for tinkering: window.racklab.getState().cutGrid(), etc.
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).racklab = useStore
}

// Convenience derived helpers used by UI + 3D.
export function rackAvgTemp(s: State, rackId: string): number {
  const r = s.racks[rackId]
  const temps = r.serverIds.map((id) => s.servers[id].temp)
  return temps.reduce((a, b) => a + b, 0) / temps.length
}

export function facilityStats(s: State) {
  const all = Object.values(s.servers)
  const online = all.filter((x) => x.status === 'online' || x.status === 'warning' || x.status === 'critical')
  const avgTemp = all.reduce((a, b) => a + b.temp, 0) / all.length
  const itPowerKw = all.reduce((a, b) => a + serverPowerDraw(b.status, b.workload, b.kind) / 1000, 0)
  const coolingKw = Object.values(s.cooling).filter((c) => c.status === 'running').length * 2.4
  const pue = computePUE(itPowerKw, coolingKw)
  return { online: online.length, total: all.length, avgTemp, itPowerKw, coolingKw, pue }
}
