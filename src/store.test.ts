// Store-level tests: gameplay orchestration on top of the pure sim model.
// These run in Node — the store guards its browser-only touchpoints (audio,
// pointer lock, localStorage), so we can drive missions end-to-end here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENERGY_CONSOLIDATE_TO, ENERGY_TARGET_KW, useStore } from './store'

function state() {
  return useStore.getState()
}

beforeEach(() => {
  vi.useFakeTimers()
  state().resetWorld()
  useStore.setState({ phase: 'exploring', mode: 'beginner', view: 'normal' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('initial world', () => {
  it('builds 6 racks of 6 servers with the pre-baked stories', () => {
    expect(Object.keys(state().racks)).toHaveLength(6)
    expect(Object.keys(state().servers)).toHaveLength(36)
    expect(state().servers['A3-4'].status).toBe('failed')
    expect(state().servers['B1-2'].status).toBe('off')
  })

  it('marks B3 as the GPU rack', () => {
    expect(state().servers['B3-1'].kind).toBe('gpu')
    expect(state().servers['A1-1'].kind).toBe('cpu')
  })
})

describe('badge & access', () => {
  it('scanning the badge opens the door and unlocks the achievement', () => {
    expect(state().secDoorOpen).toBe(false)
    state().scanBadge()
    expect(state().badgeScanned).toBe(true)
    expect(state().secDoorOpen).toBe(true)
    expect(state().achievements).toContain('access-granted')
  })

  it('interacting with the security door without a badge denies entry', () => {
    state().interact('secdoor')
    expect(state().secDoorOpen).toBe(false)
    expect(state().toasts.some((t) => t.kind === 'deny')).toBe(true)
  })
})

describe('server power', () => {
  it('toggling power flips status and unlocks first-boot', () => {
    state().toggleServerPower('A1-1')
    expect(state().servers['A1-1'].status).toBe('off')
    expect(state().achievements).toContain('first-boot')
    state().toggleServerPower('A1-1')
    expect(state().servers['A1-1'].status).toBe('online')
  })

  it('failed hardware cannot be power-toggled, only repaired', () => {
    state().toggleServerPower('A3-4')
    expect(state().servers['A3-4'].status).toBe('failed')
    state().restartServer('A3-4')
    expect(state().servers['A3-4'].status).toBe('online')
  })
})

describe('equipment discovery', () => {
  it('unlocks the explorer badge after 7 distinct equipment types', () => {
    for (const id of ['server:A1-1', 'rack:A1', 'cooling:CU-1', 'ups', 'generator', 'netcab', 'noc']) {
      state().interact(id)
    }
    expect(state().discovered.length).toBe(7)
    expect(state().achievements).toContain('explorer')
  })
})

describe('mission: the overheating rack', () => {
  it('progresses through all steps and unlocks cooling-tech', () => {
    state().startMission()
    expect(state().cooling['CU-2'].status).toBe('failed')
    expect(state().mission?.id).toBe('overheat')

    // Step 1: thermal view. Step 2: inspect a B2 server.
    state().setView('thermal')
    useStore.setState({ selectedId: 'server:B2-1' })
    state().tick(0.5)
    expect(state().mission?.steps[0].done).toBe(true)
    expect(state().mission?.steps[1].done).toBe(true)

    // Step 3: fix the cooling unit — the load balancer drains B2's traffic.
    state().setCoolingStatus('CU-2', 'running')
    state().tick(0.5)
    expect(state().mission?.steps[2].done).toBe(true)
    for (const sid of state().racks['B2'].serverIds) {
      expect(state().servers[sid].workload).toBeLessThanOrEqual(45)
    }

    // Step 4: B2 cools below 50°C.
    const cooled = { ...state().servers }
    for (const sid of state().racks['B2'].serverIds) cooled[sid] = { ...cooled[sid], temp: 40 }
    useStore.setState({ servers: cooled })
    state().tick(0.5)
    expect(state().mission?.complete).toBe(true)
    expect(state().achievements).toContain('cooling-tech')
  })
})

describe('mission: right-size the facility', () => {
  it('completes when consolidated below the power target with enough servers up', () => {
    state().startEnergyMission()
    expect(state().mission?.id).toBe('energy')

    state().setMode('engineer')

    // Consolidate: GPU rack off, a few CPU nodes off, the rest idling cool.
    const servers = { ...state().servers }
    let online = 0
    for (const id of Object.keys(servers)) {
      const srv = servers[id]
      if (srv.status === 'failed') continue
      const shouldRun = srv.kind === 'cpu' && online < ENERGY_CONSOLIDATE_TO
      servers[id] = shouldRun
        ? { ...srv, status: 'online', workload: 20, temp: 35 }
        : { ...srv, status: 'off', workload: 0, temp: 30 }
      if (shouldRun) online++
    }
    useStore.setState({ servers })

    state().tick(0.5)
    const m = state().mission
    expect(m?.steps.map((s) => s.done)).toEqual([true, true, true, true])
    expect(m?.complete).toBe(true)
    expect(state().achievements).toContain('energy-saver')
  })

  it('does not complete while the facility is over the power target', () => {
    state().startEnergyMission()
    state().setMode('engineer')
    state().tick(0.5) // GPU rack pinned near max: way over ENERGY_TARGET_KW
    expect(ENERGY_TARGET_KW).toBeLessThan(20)
    expect(state().mission?.steps[2].done).toBe(false)
    expect(state().mission?.complete).toBe(false)
  })
})

describe('power outage flow', () => {
  it('drains the UPS on grid loss and recovers via the generator', () => {
    state().cutGrid()
    expect(state().power.grid).toBe(false)
    state().tick(10)
    expect(state().power.ups).toBeLessThan(100)

    state().startGenerator()
    expect(state().power.gen).toBe('starting')
    state().tick(8) // generator start time
    expect(state().power.gen).toBe('running')
    expect(state().achievements).toContain('power-restorer')
  })
})
