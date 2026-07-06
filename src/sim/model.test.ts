import { describe, expect, it } from 'vitest'
import {
  POWER,
  PowerState,
  SERVER_SPEC,
  THERMAL,
  approachTemp,
  computePUE,
  coolingPowered,
  serverAmbient,
  serverPowerDraw,
  serversPowered,
  statusFromTemp,
  stepPower,
  thermalTarget,
} from './model'

describe('serverAmbient', () => {
  it('is the base ambient when both CRAC units run', () => {
    expect(serverAmbient(true, true)).toBe(THERMAL.baseAmbient)
  })
  it('adds the local penalty when this rack’s cooler is down', () => {
    expect(serverAmbient(false, true)).toBe(THERMAL.baseAmbient + THERMAL.noLocalCoolerPenalty)
  })
  it('stacks both penalties in a total cooling outage', () => {
    expect(serverAmbient(false, false)).toBe(
      THERMAL.baseAmbient + THERMAL.noLocalCoolerPenalty + THERMAL.noNeighborCoolerPenalty,
    )
  })
})

describe('thermalTarget', () => {
  it('rises with workload', () => {
    const low = thermalTarget(true, 22, 10, 'cpu', 40)
    const high = thermalTarget(true, 22, 90, 'cpu', 40)
    expect(high).toBeGreaterThan(low)
  })

  it('runs a GPU box meaningfully hotter than a CPU box at the same load', () => {
    const cpu = thermalTarget(true, 22, 100, 'cpu', 40)
    const gpu = thermalTarget(true, 22, 100, 'gpu', 40)
    expect(gpu).toBeGreaterThan(cpu)
    // difference is exactly the heat-per-load gap at 100% load
    expect(gpu - cpu).toBeCloseTo(100 * (SERVER_SPEC.gpu.heatPerLoad - SERVER_SPEC.cpu.heatPerLoad), 5)
  })

  it('coasts toward ambient when unpowered and never above current temp', () => {
    expect(thermalTarget(false, 22, 0, 'cpu', 60)).toBe(24)
    expect(thermalTarget(false, 22, 0, 'cpu', 23)).toBe(23)
  })
})

describe('approachTemp', () => {
  it('moves toward the target but does not overshoot in one small step', () => {
    const next = approachTemp(40, 60, 1)
    expect(next).toBeGreaterThan(40)
    expect(next).toBeLessThan(60)
  })
  it('is a no-op when already at target', () => {
    expect(approachTemp(50, 50, 1)).toBe(50)
  })
  it('cannot overshoot even with a huge dt (clamped)', () => {
    expect(approachTemp(40, 60, 10_000)).toBe(60)
  })
})

describe('statusFromTemp', () => {
  it('classifies each thermal band at its boundary', () => {
    expect(statusFromTemp(THERMAL.warnAt - 1)).toBe('online')
    expect(statusFromTemp(THERMAL.warnAt)).toBe('warning')
    expect(statusFromTemp(THERMAL.criticalAt)).toBe('critical')
    expect(statusFromTemp(THERMAL.shutdownAt)).toBe('failed')
  })
})

describe('serverPowerDraw', () => {
  it('draws nothing when off or failed', () => {
    expect(serverPowerDraw('off', 100, 'cpu')).toBe(0)
    expect(serverPowerDraw('failed', 100, 'gpu')).toBe(0)
  })
  it('draws idle power at zero load and peak at full load', () => {
    expect(serverPowerDraw('online', 0, 'cpu')).toBe(SERVER_SPEC.cpu.idleW)
    expect(serverPowerDraw('online', 100, 'cpu')).toBe(SERVER_SPEC.cpu.idleW + SERVER_SPEC.cpu.peakExtraW)
  })
  it('has a GPU box out-draw a CPU box by several times at full load', () => {
    const cpu = serverPowerDraw('online', 100, 'cpu')
    const gpu = serverPowerDraw('online', 100, 'gpu')
    expect(gpu).toBeGreaterThan(cpu * 3)
  })
})

describe('computePUE', () => {
  it('returns 0 with no IT load (avoids divide-by-zero)', () => {
    expect(computePUE(0, 5)).toBe(0)
  })
  it('is 1.0 only with zero cooling and overhead', () => {
    expect(computePUE(10, 0, 0)).toBe(1)
  })
  it('rises as cooling overhead grows', () => {
    expect(computePUE(10, 10, 1)).toBeGreaterThan(computePUE(10, 2, 1))
  })
})

const freshPower = (over: Partial<PowerState> = {}): PowerState => ({
  grid: true,
  ups: 100,
  gen: 'off',
  genTimer: 0,
  ...over,
})

describe('stepPower — grid healthy', () => {
  it('recharges a depleted UPS over time', () => {
    const { power } = stepPower(freshPower({ ups: 50 }), 10)
    expect(power.ups).toBeGreaterThan(50)
  })
  it('never charges past 100%', () => {
    const { power } = stepPower(freshPower({ ups: 99.9 }), 100)
    expect(power.ups).toBe(100)
  })
})

describe('stepPower — outage on UPS', () => {
  it('drains the UPS while grid is down and generator is off', () => {
    const { power } = stepPower(freshPower({ grid: false, ups: 100 }), 10)
    expect(power.ups).toBeLessThan(100)
  })

  it('empties the UPS in roughly its rated runtime and emits a depletion event', () => {
    let p = freshPower({ grid: false, ups: 100 })
    let depleted = false
    // step one second at a time past the rated runtime
    for (let i = 0; i < POWER.upsRuntimeSeconds + 2; i++) {
      const step = stepPower(p, 1)
      p = step.power
      if (step.upsJustDepleted) depleted = true
    }
    expect(p.ups).toBe(0)
    expect(depleted).toBe(true)
  })

  it('warns exactly once as the battery crosses the low threshold', () => {
    let p = freshPower({ grid: false, ups: POWER.lowBatteryPct + 1 })
    const warnings: string[] = []
    for (let i = 0; i < 5; i++) {
      const step = stepPower(p, 1)
      p = step.power
      warnings.push(...step.events.filter((e) => e.text.includes('below 20%')).map((e) => e.text))
    }
    expect(warnings.length).toBe(1)
  })
})

describe('stepPower — generator race', () => {
  it('stabilises after the start delay and then stops draining the UPS', () => {
    let p = freshPower({ grid: false, ups: 80, gen: 'starting', genTimer: POWER.genStartSeconds })
    let started = false
    for (let i = 0; i < POWER.genStartSeconds; i++) {
      const step = stepPower(p, 1)
      p = step.power
      if (step.genJustStarted) started = true
    }
    expect(started).toBe(true)
    expect(p.gen).toBe('running')
    const upsAfterStart = p.ups
    // once running, the UPS no longer drains
    const settled = stepPower(p, 10).power
    expect(settled.ups).toBe(upsAfterStart)
  })
})

describe('power availability predicates', () => {
  it('UPS keeps servers up but never the cooling', () => {
    const onlyUps = freshPower({ grid: false, ups: 50, gen: 'off' })
    expect(serversPowered(onlyUps)).toBe(true)
    expect(coolingPowered(onlyUps)).toBe(false)
  })
  it('a running generator powers both servers and cooling', () => {
    const onGen = freshPower({ grid: false, ups: 0, gen: 'running' })
    expect(serversPowered(onGen)).toBe(true)
    expect(coolingPowered(onGen)).toBe(true)
  })
  it('a dead battery with no grid or generator means total loss', () => {
    const dead = freshPower({ grid: false, ups: 0, gen: 'off' })
    expect(serversPowered(dead)).toBe(false)
  })
})

describe('integration: cooling failure drives thermal runaway', () => {
  it('pushes a fully-loaded GPU server into shutdown once cooling is lost', () => {
    let temp = 40
    const ambient = serverAmbient(false, false) // total cooling outage
    let failedAt = -1
    for (let i = 0; i < 400; i++) {
      const target = thermalTarget(true, ambient, 100, 'gpu', temp)
      temp = approachTemp(temp, target, 1)
      if (statusFromTemp(temp) === 'failed') {
        failedAt = i
        break
      }
    }
    expect(failedAt).toBeGreaterThan(0)
  })

  it('keeps a well-cooled CPU server comfortably healthy', () => {
    let temp = 40
    const ambient = serverAmbient(true, true)
    for (let i = 0; i < 400; i++) {
      temp = approachTemp(temp, thermalTarget(true, ambient, 60, 'cpu', temp), 1)
    }
    expect(statusFromTemp(temp)).toBe('online')
  })
})
