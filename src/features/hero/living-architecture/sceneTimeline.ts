import type { ArchitectureFrame, ArchitecturePart, Transform, Vec3 } from './sceneTypes'

export const phaseStarts = [0, 0.18, 0.43, 0.63, 0.8] as const

type Layer = {
  part: ArchitecturePart
  start: Vec3
  tilt: Vec3
  assembledHeight: number
  assemblyStart: number
  assemblyEnd: number
  finalHeight: number
  finalDepth: number
}

const layers: readonly Layer[] = [
  { part: 'plinth', start: [-0.25, 0.18, 0.19], tilt: [0, -0.055, 0], assembledHeight: 0.18,
    assemblyStart: 0.18, assemblyEnd: 0.35, finalHeight: 0.18, finalDepth: -0.85 },
  { part: 'data', start: [-0.72, 0.92, -0.06], tilt: [0.045, -0.2, 0.045], assembledHeight: 0.55,
    assemblyStart: 0.19, assemblyEnd: 0.37, finalHeight: 0.49, finalDepth: -1.06 },
  { part: 'services', start: [0.66, 1.72, -0.12], tilt: [-0.05, 0.19, -0.075], assembledHeight: 1,
    assemblyStart: 0.21, assemblyEnd: 0.385, finalHeight: 0.76, finalDepth: -1.27 },
  { part: 'transport', start: [-0.49, 2.52, 0.17], tilt: [0.05, -0.22, 0.035], assembledHeight: 1.46,
    assemblyStart: 0.235, assemblyEnd: 0.41, finalHeight: 1.03, finalDepth: -1.47 },
  { part: 'frame', start: [0.4, 3.54, -0.24], tilt: [0.05, 0.23, -0.05], assembledHeight: 1.96,
    assemblyStart: 0.255, assemblyEnd: 0.43, finalHeight: 1.98, finalDepth: 1.04 },
]

type CameraPose = { at: number; eye: Vec3; target: Vec3; fov: number }

const cameraPoses: readonly CameraPose[] = [
  { at: 0, eye: [7.5, 6.1, 9.45], target: [0, 1.57, 0], fov: 0.54 },
  { at: 0.18, eye: [7.17, 5.95, 9.4], target: [0, 1.54, 0], fov: 0.54 },
  { at: 0.43, eye: [6.85, 5.4, 8.39], target: [0, 1.13, 0], fov: 0.52 },
  { at: 0.63, eye: [6.2, 5.15, 8.13], target: [0, 1.06, 0], fov: 0.51 },
  { at: 0.8, eye: [2.4, 3.53, 6.92], target: [0, 1.31, -0.08], fov: 0.51 },
  { at: 1, eye: [0.82, 2.85, 8.9], target: [0.1, 1.73, 0.5], fov: 0.57 },
]

function clampProgress(value: number) {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value))
}

function ease(at: number, start: number, end: number) {
  const t = clampProgress((at - start) / (end - start))
  return t * t * t * (10 + t * (-15 + 6 * t))
}

function mix(start: number, end: number, t: number) {
  return start + (end - start) * t
}

function transform(): Transform {
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 }
}

export function phaseAt(progress: number) {
  const at = clampProgress(progress)
  for (let phase = phaseStarts.length - 1; phase > 0; phase--) {
    if (at >= phaseStarts[phase]) return phase
  }
  return 0
}

export function createArchitectureFrame(): ArchitectureFrame {
  return {
    eye: [0, 0, 0],
    target: [0, 0, 0],
    fov: 0,
    parts: {
      datum: transform(), plinth: transform(), data: transform(), services: transform(),
      transport: transform(), frame: transform(), routes: transform(), readout: transform(),
    },
  }
}

function sampleCamera(frame: ArchitectureFrame, at: number, compact: boolean, x: number, y: number, aspect: number) {
  let next = 1
  while (next < cameraPoses.length - 1 && at > cameraPoses[next].at) next++
  const before = cameraPoses[next - 1]
  const after = cameraPoses[next]
  const t = ease(at, before.at, after.at)
  for (let axis = 0; axis < 3; axis++) {
    frame.eye[axis] = mix(before.eye[axis], after.eye[axis], t)
    frame.target[axis] = mix(before.target[axis], after.target[axis], t)
  }
  let fov = mix(before.fov, after.fov, t)
  if (compact) {
    // A flatter orbit and more room at the edges keep the layers legible in portrait.
    frame.eye[0] *= 0.71
    frame.eye[1] -= 0.26
    frame.eye[2] += 1.55
    frame.target[1] -= 0.07
    fov += 0.035
  } else {
    const influence = 1 - 0.55 * ease(at, 0.18, 0.78)
    frame.eye[0] += x * 0.34 * influence
    frame.eye[1] += y * 0.24 * influence
  }
  const usableAspect = Number.isFinite(aspect) && aspect > 0 ? Math.max(0.55, aspect) : 1.4
  const closeUp = ease(at, 0.64, 0.79) * (1 - ease(at, 0.87, 0.985))
  const minimumAspect = compact
    ? mix(1.04, 1.35, closeUp)
    : mix(mix(1.18, 1.26, ease(at, 0.9, 1)), 1.55, closeUp)
  const fit = Math.max(1, minimumAspect / usableAspect)
  frame.fov = 2 * Math.atan(Math.tan(fov / 2) * fit)
}

export function sampleArchitecture(
  frame: ArchitectureFrame,
  progress: number,
  compact: boolean,
  pointerX: number,
  pointerY: number,
  aspect = 1.4,
) {
  const at = clampProgress(progress)
  const x = 2 * clampProgress((pointerX + 1) / 2) - 1
  const y = 2 * clampProgress((pointerY + 1) / 2) - 1
  sampleCamera(frame, at, compact, x, y, aspect)

  const recede = ease(at, 0.84, 1)
  const turn = ease(at, phaseStarts[4], 0.985)
  const initialGap = compact ? 0.81 : 1
  const initialSpread = compact ? 0.69 : 1
  const drift = 1 - 0.12 * ease(at, 0, phaseStarts[1])

  for (const layer of layers) {
    const pose = frame.parts[layer.part]
    const separated = drift * (1 - ease(at, layer.assemblyStart, layer.assemblyEnd))
    const isInterface = layer.part === 'frame'
    const move = isInterface ? turn : recede
    pose.position[0] = layer.start[0] * separated * initialSpread
    pose.position[1] = mix(layer.assembledHeight, layer.finalHeight, move) +
      (layer.start[1] - layer.assembledHeight) * separated * initialGap
    pose.position[2] = layer.start[2] * separated * initialSpread + layer.finalDepth * move
    pose.rotation[0] = layer.tilt[0] * separated + (isInterface ? Math.PI / 2 * turn : 0)
    pose.rotation[1] = layer.tilt[1] * separated
    pose.rotation[2] = layer.tilt[2] * separated
  }

  const framePose = frame.parts.frame
  const readout = frame.parts.readout
  for (let axis = 0; axis < 3; axis++) {
    readout.position[axis] = framePose.position[axis]
    readout.rotation[axis] = framePose.rotation[axis]
  }
  readout.opacity = ease(at, 0.857, 0.975)

  const routes = frame.parts.routes
  const extension = mix(0.24, 1, ease(at, phaseStarts[2], 0.601))
  routes.scale[1] = extension
  routes.position[1] = 0.55 * (1 - extension)
  routes.opacity = ease(at, phaseStarts[2], 0.55) * (1 - ease(at, phaseStarts[4], 0.876))
}
