// World layout constants. Units are meters. The hall spans z in [-15, 1],
// the lobby z in [1, 9]. The security door sits in the dividing wall at z = 1.

export const HALL = { minX: -13, maxX: 13, minZ: -15, maxZ: 9, height: 4 }
export const DIVIDER_Z = 1
export const DOOR_HALF_WIDTH = 1.3

export const PLAYER = { height: 1.7, radius: 0.42, speed: 3.4, runSpeed: 5.6 }

export interface Collider { x: number; z: number; hx: number; hz: number }

// Rack rows: row A fronts face -z (toward the cold aisle at z=-6),
// row B fronts face +z.
export const RACK_POSITIONS: { id: string; x: number; z: number; rotY: number; coolerId: string }[] = [
  { id: 'A1', x: -4, z: -3, rotY: Math.PI, coolerId: 'CU-1' },
  { id: 'A2', x: 0, z: -3, rotY: Math.PI, coolerId: 'CU-1' },
  { id: 'A3', x: 4, z: -3, rotY: Math.PI, coolerId: 'CU-1' },
  { id: 'B1', x: -4, z: -9, rotY: 0, coolerId: 'CU-2' },
  { id: 'B2', x: 0, z: -9, rotY: 0, coolerId: 'CU-2' },
  { id: 'B3', x: 4, z: -9, rotY: 0, coolerId: 'CU-2' },
]

export const COOLING_POSITIONS = [
  { id: 'CU-1', x: -10.5, z: -3.5, rotY: Math.PI / 2 },
  { id: 'CU-2', x: -10.5, z: -9.5, rotY: Math.PI / 2 },
]

export const NETCAB_POS = { x: 10.8, z: -12.2, rotY: -Math.PI / 2 }
export const UPS_POS = { x: -10.8, z: -13, rotY: Math.PI / 2 }
export const GEN_POS = { x: -7.6, z: -13.6, rotY: 0 }
export const NOC_POS = { x: 4.5, z: -13.4, rotY: 0 }
export const RECEPTION_POS = { x: -4, z: 5, rotY: 0 }
export const BADGE_POS = { x: 1.9, z: 3.2, rotY: 0 }

export const STATIC_COLLIDERS: Collider[] = [
  ...RACK_POSITIONS.map((r) => ({ x: r.x, z: r.z, hx: 0.75, hz: 0.85 })),
  ...COOLING_POSITIONS.map((c) => ({ x: c.x, z: c.z, hx: 0.75, hz: 1.05 })),
  { x: NETCAB_POS.x, z: NETCAB_POS.z, hx: 0.8, hz: 0.9 },
  { x: UPS_POS.x, z: UPS_POS.z, hx: 0.75, hz: 0.9 },
  { x: GEN_POS.x, z: GEN_POS.z, hx: 1.1, hz: 0.8 },
  { x: NOC_POS.x, z: NOC_POS.z, hx: 1.7, hz: 0.8 },
  { x: RECEPTION_POS.x, z: RECEPTION_POS.z, hx: 1.6, hz: 0.7 },
  { x: BADGE_POS.x, z: BADGE_POS.z, hx: 0.35, hz: 0.35 },
  // Dividing wall between lobby and hall (two segments around the door).
  { x: (HALL.minX + -DOOR_HALF_WIDTH) / 2, z: DIVIDER_Z, hx: (-DOOR_HALF_WIDTH - HALL.minX) / 2, hz: 0.25 },
  { x: (HALL.maxX + DOOR_HALF_WIDTH) / 2, z: DIVIDER_Z, hx: (HALL.maxX - DOOR_HALF_WIDTH) / 2, hz: 0.25 },
]

export const SECURITY_DOOR_COLLIDER: Collider = { x: 0, z: DIVIDER_Z, hx: DOOR_HALF_WIDTH, hz: 0.3 }

export function tempColor(t: number): string {
  // Blue/green when cool, amber, then red as things overheat.
  if (t < 35) return '#2f9e6e'
  if (t < 45) return '#7bc043'
  if (t < 55) return '#e0b322'
  if (t < 68) return '#e07b22'
  return '#e03131'
}
