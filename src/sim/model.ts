// Pure, deterministic simulation model for RackLab.
//
// Nothing in this file touches React, Three.js, the Zustand store, the DOM,
// audio, or the clock. Every function is a plain input→output transform, which
// makes the interesting behaviour (thermal runaway, UPS depletion, the
// generator race, PUE) unit-testable in isolation. The store in store.ts is a
// thin orchestration layer that wires these functions to state + side effects.

export type ServerKind = 'cpu' | 'gpu'
export type ServerStatus = 'online' | 'off' | 'warning' | 'critical' | 'failed'
export type LiveStatus = Exclude<ServerStatus, 'off'>

/** Thermal model tuning. Temperatures in °C. */
export const THERMAL = {
  baseAmbient: 22,
  /** extra ambient °C when this rack's own CRAC is down */
  noLocalCoolerPenalty: 14,
  /** extra ambient °C when the other hall CRAC is also down */
  noNeighborCoolerPenalty: 5,
  /** rise above ambient a powered-but-idle server sits at */
  idleRise: 7,
  warnAt: 54,
  criticalAt: 66,
  shutdownAt: 85,
  /** how quickly temperature approaches its target, per second (0..1 scaled by dt) */
  responsiveness: 0.11,
} as const

/** Power-chain tuning. */
export const POWER = {
  upsRuntimeSeconds: 75,
  upsRechargeRatePerSec: 1.5,
  lowBatteryPct: 20,
  genStartSeconds: 8,
} as const

/**
 * Per-server electrical + thermal signature. A GPU/AI box draws far more power
 * and dumps far more heat per unit of load than a general-purpose CPU node —
 * the tension at the heart of every modern "AI data center" story.
 */
export const SERVER_SPEC: Record<ServerKind, { heatPerLoad: number; idleW: number; peakExtraW: number }> = {
  cpu: { heatPerLoad: 0.24, idleW: 180, peakExtraW: 320 },
  gpu: { heatPerLoad: 0.5, idleW: 400, peakExtraW: 1600 },
}

/** Inlet ambient a server sees, given which CRAC units are actually cooling. */
export function serverAmbient(localCoolerRunning: boolean, neighborCoolerRunning: boolean): number {
  return (
    THERMAL.baseAmbient +
    (localCoolerRunning ? 0 : THERMAL.noLocalCoolerPenalty) +
    (neighborCoolerRunning ? 0 : THERMAL.noNeighborCoolerPenalty)
  )
}

/** Steady-state temperature a server trends toward for its current conditions. */
export function thermalTarget(
  powered: boolean,
  ambient: number,
  workload: number,
  kind: ServerKind,
  currentTemp: number,
): number {
  if (!powered) return Math.min(currentTemp, ambient + 2)
  return ambient + THERMAL.idleRise + workload * SERVER_SPEC[kind].heatPerLoad
}

/** Exponential approach of temperature toward its target over dt seconds. */
export function approachTemp(temp: number, target: number, dt: number): number {
  return temp + (target - temp) * Math.min(1, dt * THERMAL.responsiveness)
}

/** Health classification purely from inlet temperature. */
export function statusFromTemp(temp: number): LiveStatus {
  if (temp >= THERMAL.shutdownAt) return 'failed'
  if (temp >= THERMAL.criticalAt) return 'critical'
  if (temp >= THERMAL.warnAt) return 'warning'
  return 'online'
}

/** Instantaneous electrical draw of one server, in watts. */
export function serverPowerDraw(status: ServerStatus, workload: number, kind: ServerKind): number {
  if (status === 'off' || status === 'failed') return 0
  const spec = SERVER_SPEC[kind]
  return spec.idleW + (Math.max(0, Math.min(100, workload)) / 100) * spec.peakExtraW
}

/** Facility-level electrical overheads. */
export const FACILITY = {
  /** electrical draw of one running CRAC unit, in kW */
  coolingKwPerUnit: 2.4,
  /** lighting, network gear, losses — everything that isn't IT or cooling */
  overheadKw: 1.1,
} as const

/**
 * Power Usage Effectiveness: total facility power / IT power. 1.0 is a perfect
 * (impossible) data center; hyperscalers run ~1.1, older facilities ~2.0.
 */
export function computePUE(itKw: number, coolingKw: number, overheadKw: number = FACILITY.overheadKw): number {
  if (itKw <= 0) return 0
  return (itKw + coolingKw + overheadKw) / itKw
}

export interface FacilityPower {
  itKw: number
  coolingKw: number
  totalKw: number
  pue: number
}

/**
 * Aggregate electrical picture of the whole facility. The single source of
 * truth for every kW figure shown in the UI and judged by missions.
 */
export function facilityPower(
  servers: Iterable<{ status: ServerStatus; workload: number; kind: ServerKind }>,
  runningCoolers: number,
): FacilityPower {
  let itKw = 0
  for (const s of servers) itKw += serverPowerDraw(s.status, s.workload, s.kind) / 1000
  const coolingKw = runningCoolers * FACILITY.coolingKwPerUnit
  return { itKw, coolingKw, totalKw: itKw + coolingKw + FACILITY.overheadKw, pue: computePUE(itKw, coolingKw) }
}

export interface PowerState {
  grid: boolean
  ups: number // % charge, 0..100
  gen: 'off' | 'starting' | 'running'
  genTimer: number // seconds remaining until the generator stabilises
}

export interface SimEvent {
  text: string
  severity: 'info' | 'warning' | 'critical'
}

export interface PowerStep {
  power: PowerState
  events: SimEvent[]
  genJustStarted: boolean
  upsJustDepleted: boolean
}

/**
 * Advance the power chain by dt seconds.
 *
 * Rules that make the outage experiment educational:
 *  - On grid loss the UPS carries the *servers* but not the cooling.
 *  - The UPS drains linearly and, if the generator never starts, hits zero.
 *  - The generator needs `genStartSeconds` to produce stable output; the UPS
 *    is what bridges that gap. Start it too late and the batteries run dry.
 *  - With the grid healthy the UPS recharges.
 */
export function stepPower(p: PowerState, dt: number): PowerStep {
  const power: PowerState = { ...p }
  const events: SimEvent[] = []
  let genJustStarted = false
  let upsJustDepleted = false

  if (!power.grid) {
    if (power.gen === 'starting') {
      power.genTimer = Math.max(0, power.genTimer - dt)
      if (power.genTimer === 0) {
        power.gen = 'running'
        genJustStarted = true
        events.push({ text: 'Generator ONLINE — facility running on backup power', severity: 'info' })
      }
    }
    if (power.gen !== 'running') {
      const before = power.ups
      power.ups = Math.max(0, power.ups - dt * (100 / POWER.upsRuntimeSeconds))
      if (before > POWER.lowBatteryPct && power.ups <= POWER.lowBatteryPct) {
        events.push({ text: 'UPS batteries below 20% — start the generator NOW', severity: 'critical' })
      }
      if (before > 0 && power.ups === 0) {
        upsJustDepleted = true
        events.push({ text: 'UPS DEPLETED — total power loss. Servers down.', severity: 'critical' })
      }
    }
  } else {
    power.ups = Math.min(100, power.ups + dt * POWER.upsRechargeRatePerSec)
  }

  return { power, events, genJustStarted, upsJustDepleted }
}

/** Are the servers receiving power at all (grid, running generator, or UPS)? */
export function serversPowered(p: PowerState): boolean {
  return p.grid || p.gen === 'running' || p.ups > 0
}

/** Is cooling powered? The UPS deliberately does NOT back the CRAC units. */
export function coolingPowered(p: PowerState): boolean {
  return p.grid || p.gen === 'running'
}
