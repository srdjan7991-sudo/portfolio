export type Vec3 = [number, number, number]

export type ArchitecturePart = 'datum' | 'plinth' | 'data' | 'services' | 'transport' | 'frame' | 'routes' | 'readout'

export type SceneMesh = {
  part: ArchitecturePart
  opaque: Float32Array
  translucent?: Float32Array
}

export const surface = {
  limestone: 0, paper: 1, graphite: 2, slate: 3, accent: 4,
  glass: 5, grid: 6, ink: 7, shadow: 8, accentSoft: 9,
} as const

export type Transform = {
  position: Vec3
  rotation: Vec3
  scale: Vec3
  opacity: number
}

export type ArchitectureFrame = {
  eye: Vec3
  target: Vec3
  fov: number
  parts: Record<ArchitecturePart, Transform>
}
