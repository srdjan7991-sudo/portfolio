import { surface } from './sceneTypes'
import type { ArchitecturePart, SceneMesh } from './sceneTypes'

type Point = readonly [number, number, number]
type PlanPoint = readonly [number, number]

const up: Point = [0, 1, 0]

function triangle(out: number[], a: Point, b: Point, c: Point, material: number, normal: Point) {
  out.push(...a, ...normal, material, ...b, ...normal, material, ...c, ...normal, material)
}

function face(out: number[], a: Point, b: Point, c: Point, d: Point, material: number) {
  const x = b[0] - a[0], y = b[1] - a[1], z = b[2] - a[2]
  const u = c[0] - a[0], v = c[1] - a[1], w = c[2] - a[2]
  const nx = y * w - z * v, ny = z * u - x * w, nz = x * v - y * u
  const length = Math.hypot(nx, ny, nz)
  if (!length) return
  const normal: Point = [nx / length, ny / length, nz / length]
  triangle(out, a, b, c, material, normal)
  triangle(out, a, c, d, material, normal)
}

function flat(out: number[], x1: number, z1: number, x2: number, z2: number, y: number, material: number) {
  face(out, [x1, y, z1], [x1, y, z2], [x2, y, z2], [x2, y, z1], material)
}

function octagon(x: number, z: number, halfWidth: number, halfDepth: number, corner: number, y: number): Point[] {
  const left = x - halfWidth, right = x + halfWidth
  const back = z - halfDepth, front = z + halfDepth
  return [
    [left + corner, y, back], [left, y, back + corner], [left, y, front - corner], [left + corner, y, front],
    [right - corner, y, front], [right, y, front - corner], [right, y, back + corner], [right - corner, y, back],
  ]
}

function band(out: number[], lower: Point[], upper: Point[], material: number) {
  for (let i = 0; i < lower.length; i++) {
    const next = (i + 1) % lower.length
    face(out, lower[i], lower[next], upper[next], upper[i], material)
  }
}

function fill(out: number[], ring: Point[], material: number) {
  for (let i = 1; i < ring.length - 1; i++) triangle(out, ring[0], ring[i], ring[i + 1], material, up)
}

function slab(out: number[], x: number, z: number, width: number, depth: number, low: number, high: number,
  side: number, top: number, cut = 0.10) {
  const w = width / 2, d = depth / 2
  const bevel = Math.min(0.035, (high - low) / 2, cut * 0.35)
  const bottom = octagon(x, z, w, d, cut, low)
  const shoulder = octagon(x, z, w, d, cut, high - bevel)
  const cap = octagon(x, z, w - bevel, d - bevel, cut - bevel / 2, high)
  band(out, bottom, shoulder, side)
  band(out, shoulder, cap, top)
  fill(out, cap, top)
  const down: Point = [0, -1, 0]
  for (let i = 1; i < bottom.length - 1; i++) triangle(out, bottom[0], bottom[i + 1], bottom[i], side, down)
}

function trace(out: number[], points: readonly PlanPoint[], y: number, width: number, material: number) {
  for (let i = 1; i < points.length; i++) {
    const [x, z] = points[i - 1], [u, v] = points[i]
    const size = Math.hypot(u - x, v - z)
    if (!size) continue
    const dx = (v - z) * width / (2 * size), dz = (x - u) * width / (2 * size)
    face(out, [x + dx, y, z + dz], [x - dx, y, z - dz], [u - dx, y, v - dz], [u + dx, y, v + dz], material)
  }
}

function lens(out: number[], x: number, z: number, y: number, rx: number, rz: number, segments: number, material: number) {
  const center: Point = [x, y, z]
  for (let i = 0; i < segments; i++) {
    const first = -2 * Math.PI * i / segments, second = -2 * Math.PI * (i + 1) / segments
    triangle(out, center, [x + Math.cos(first) * rx, y, z + Math.sin(first) * rz],
      [x + Math.cos(second) * rx, y, z + Math.sin(second) * rz], material, up)
  }
}

function datum(out: number[], translucent: number[], compact: boolean) {
  lens(translucent, 0, 0, 0.012, 3.6, 2.15, compact ? 22 : 44, surface.shadow)
  const spacing = compact ? 0.54 : 0.36
  for (let i = -9; i <= 9; i++) {
    const value = i * spacing
    const tick = i % 3 === 0 ? 0.008 : 0.004
    if (Math.abs(value) <= 3.65) flat(out, value - tick, -2.62, value + tick, 2.62, 0.002, surface.grid)
    if (Math.abs(value) <= 2.60) flat(out, -3.73, value - tick, 3.73, value + tick, 0.003, surface.grid)
  }
  for (const side of [-1, 1]) {
    for (const edge of [-1, 1]) {
      trace(out, [[side * 3.60, edge * 2.37], [side * 3.60, edge * 2.57], [side * 3.28, edge * 2.57]],
        0.009, 0.016, surface.slate)
    }
  }
  trace(out, [[-2.76, 2.39], [2.76, 2.39]], 0.009, 0.011, surface.slate)
  const count = compact ? 9 : 15
  for (let i = 0; i < count; i++) {
    const x = -2.76 + i * 5.52 / (count - 1)
    trace(out, [[x, 2.39], [x, i % 2 ? 2.44 : 2.51]], 0.010, 0.011, surface.slate)
  }
}

function plinth(out: number[]) {
  slab(out, 0, 0, 4.94, 2.88, -0.145, -0.068, surface.ink, surface.graphite, 0.16)
  slab(out, 0, 0, 5.44, 3.22, -0.064, 0.133, surface.limestone, surface.paper, 0.24)
  slab(out, 0, 0, 5.12, 2.91, 0.134, 0.160, surface.slate, surface.limestone, 0.16)
  const seam = 1.61
  face(out, [-2.25, 0.022, seam + 0.002], [2.25, 0.022, seam + 0.002],
    [2.25, 0.038, seam + 0.002], [-2.25, 0.038, seam + 0.002], surface.slate)
  for (const x of [-2.19, 2.19]) {
    slab(out, x, 1.53, 0.17, 0.10, 0.133, 0.151, surface.slate, surface.accent, 0.018)
  }
}

function storage(out: number[], compact: boolean) {
  slab(out, 0, 0, 5.06, 2.98, -0.057, 0.035, surface.graphite, surface.slate, 0.17)
  for (const x of [-1.58, 0, 1.58]) {
    slab(out, x, 0, 1.38, 2.32, 0.036, 0.145, surface.ink, surface.graphite, 0.17)
    slab(out, x, -0.28, 1.13, 1.29, 0.146, 0.166, surface.slate, surface.limestone, 0.15)
    flat(out, x - 0.53, 0.73, x + 0.53, 0.98, 0.148, surface.ink)
    const vents = compact ? 4 : 7
    for (let vent = 0; vent < vents; vent++) {
      const position = x - 0.38 + vent * 0.76 / (vents - 1)
      flat(out, position - 0.018, 0.79, position + 0.018, 0.92, 0.151, surface.accentSoft)
    }
  }
  for (const x of [-2.33, 2.33]) {
    slab(out, x, 0.94, 0.20, 0.20, 0.036, 0.106, surface.graphite, surface.accent, 0.040)
  }
}

function services(out: number[], compact: boolean) {
  slab(out, 0, 0, 5.19, 3.04, -0.065, 0.041, surface.limestone, surface.paper, 0.18)
  for (const x of [-1.59, 0.08, 1.54]) {
    slab(out, x, -0.07, 1.30, 1.60, 0.042, 0.113, surface.slate, surface.graphite, 0.12)
    slab(out, x, -0.20, 0.92, 0.88, 0.114, x === 0.08 ? 0.213 : 0.184,
      surface.graphite, x === 0.08 ? surface.accent : surface.limestone, 0.14)
    for (let i = 0; i < (compact ? 3 : 5); i++) {
      const z = -0.56 + i * (compact ? 0.27 : 0.17)
      flat(out, x - 0.58, z, x - 0.44, z + 0.056, 0.115, surface.accentSoft)
      flat(out, x + 0.44, z, x + 0.58, z + 0.056, 0.115, surface.accentSoft)
    }
  }
  trace(out, [[-1.91, 1.10], [1.93, 1.10]], 0.045, 0.017, surface.accent)
  for (const x of [-2.33, -1.53, 0.08, 1.54, 2.33]) {
    flat(out, x - 0.07, 0.88, x + 0.07, 1.16, 0.049, surface.accent)
  }
}

function transport(out: number[], compact: boolean) {
  slab(out, 0, 0, 5.28, 3.06, -0.054, 0.064, surface.slate, surface.limestone, 0.18)
  const lanes = compact ? 3 : 6
  for (let i = 0; i < lanes; i++) {
    const x = -1.70 + i * 3.40 / (lanes - 1)
    const z = (i % 2 === 0) ? -0.27 : -0.05
    trace(out, [[x, -1.18], [x, z - 0.19], [x + 0.20, z], [x + 0.20, 1.06]],
      0.069, 0.034, i % 2 === 0 ? surface.accent : surface.slate)
    slab(out, x + 0.20, 1.06, 0.16, 0.14, 0.064, 0.117, surface.graphite, surface.accent, 0.035)
  }
  trace(out, [[-2.33, 0.90], [-2.01, 0.90], [-1.74, 0.64], [1.73, 0.64], [2.01, 0.90], [2.33, 0.90]],
    0.071, 0.038, surface.accent)
  for (const x of [-2.33, 2.33]) {
    slab(out, x, 0.94, 0.21, 0.25, 0.065, 0.124, surface.slate, surface.accent, 0.036)
  }
}

function windowFrame(out: number[], translucent: number[]) {
  const outsideBottom = octagon(0, 0, 2.68, 1.55, 0.20, -0.008)
  const outsideTop = octagon(0, 0, 2.68, 1.55, 0.20, 0.092)
  const insideBottom = octagon(0, 0, 2.49, 1.36, 0.11, -0.008)
  const insideTop = octagon(0, 0, 2.49, 1.36, 0.11, 0.092)
  band(out, outsideBottom, outsideTop, surface.graphite)
  band(out, insideTop, insideBottom, surface.slate)
  band(out, outsideTop, insideTop, surface.paper)
  band(out, insideBottom, outsideBottom, surface.limestone)
  fill(translucent, octagon(0, 0, 2.50, 1.37, 0.12, 0.038), surface.glass)
  for (const x of [-2.33, 2.33]) {
    slab(out, x, 0.94, 0.16, 0.28, 0.037, 0.105, surface.slate, surface.accent, 0.035)
  }
  flat(out, -0.27, -1.488, 0.27, -1.450, 0.094, surface.accent)
}

function routes(out: number[]) {
  for (const x of [-2.33, 2.33]) {
    slab(out, x, 0.94, 0.027, 0.027, 0.62, 2.056, surface.accent, surface.accent, 0.005)
    for (const layer of [0.65, 1.06, 1.57, 2.047]) {
      slab(out, x, 0.94, 0.112, 0.112, layer - 0.012, layer + 0.012, surface.accent, surface.accentSoft, 0.026)
    }
  }
}

function readout(out: number[], compact: boolean) {
  slab(out, 0, 0, 4.95, 2.67, 0.067, 0.090, surface.slate, surface.paper, 0.09)
  flat(out, -2.25, -1.13, -0.49, -1.015, 0.097, surface.graphite)
  flat(out, 1.20, -1.11, 2.24, -1.012, 0.097, surface.accentSoft)
  flat(out, -2.26, -0.74, 0.89, 1.13, 0.098, surface.limestone)
  for (let i = 0; i < 5; i++) {
    const z = -0.48 + i * 0.335
    flat(out, -2.10, z, 0.72, z + 0.009, 0.103, surface.grid)
  }
  const points = [[-2.08, 0.82], [-1.67, 0.53], [-1.17, 0.63], [-0.74, 0.21],
    [-0.24, 0.34], [0.19, -0.07], [0.69, -0.35]] as const
  for (let i = 1; i < points.length; i++) {
    const [x, z] = points[i - 1], [u, v] = points[i]
    face(out, [x, 0.104, z], [x, 0.104, 0.94], [u, 0.104, 0.94], [u, 0.104, v], surface.accentSoft)
  }
  trace(out, points, 0.107, 0.043, surface.accent)
  lens(out, 0.69, -0.35, 0.109, 0.065, 0.065, 12, surface.accent)
  const cards = compact ? 2 : 3
  for (let card = 0; card < cards; card++) {
    const z = -0.74 + card * (compact ? 0.98 : 0.66)
    const depth = compact ? 0.85 : 0.55
    flat(out, 1.07, z, 2.27, z + depth, 0.098, surface.accentSoft)
    flat(out, 1.17, z + 0.11, 1.94 - card * 0.09, z + 0.19, 0.103, surface.accent)
    flat(out, 1.17, z + 0.30, 2.10, z + 0.338, 0.103, surface.slate)
  }
}

export function createArchitectureGeometry(compact: boolean): SceneMesh[] {
  const parts: SceneMesh[] = []
  function add(part: ArchitecturePart, draw: (opaque: number[], translucent: number[]) => void) {
    const opaque: number[] = [], translucent: number[] = []
    draw(opaque, translucent)
    parts.push({ part, opaque: new Float32Array(opaque), translucent: translucent.length ? new Float32Array(translucent) : undefined })
  }
  add('datum', (opaque, translucent) => datum(opaque, translucent, compact))
  add('plinth', plinth)
  add('data', opaque => storage(opaque, compact))
  add('services', opaque => services(opaque, compact))
  add('transport', opaque => transport(opaque, compact))
  add('frame', windowFrame)
  add('routes', routes)
  add('readout', opaque => readout(opaque, compact))
  return parts
}
