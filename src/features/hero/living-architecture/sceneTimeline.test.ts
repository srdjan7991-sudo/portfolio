import { describe, expect, it } from 'vitest'
import { createArchitectureFrame, phaseAt, phaseStarts, sampleArchitecture } from './sceneTimeline'

describe('Living Architecture timeline', () => {
  it('selects the expected phase at each threshold', () => {
    expect(phaseStarts.map(phaseAt)).toEqual([0, 1, 2, 3, 4])
    expect(phaseAt(-1)).toBe(0)
    expect(phaseAt(2)).toBe(4)
    expect(phaseAt(Number.NaN)).toBe(0)
  })

  it('assembles the stack, connects it and turns the readout upright', () => {
    const frame = createArchitectureFrame()
    sampleArchitecture(frame, 0, false, 0, 0)
    expect(frame.parts.frame.position[1]).toBeGreaterThan(3)
    expect(frame.parts.routes.opacity).toBe(0)
    expect(frame.parts.readout.opacity).toBe(0)

    sampleArchitecture(frame, 0.59, false, 0, 0)
    expect(frame.parts.frame.position).toEqual([0, 1.96, 0])
    expect(frame.parts.routes.opacity).toBe(1)

    sampleArchitecture(frame, 1, false, 0, 0)
    expect(frame.parts.frame.rotation[0]).toBe(Math.PI / 2)
    expect(frame.parts.readout.rotation).toEqual(frame.parts.frame.rotation)
    expect(frame.parts.readout.position).toEqual(frame.parts.frame.position)
    expect(frame.parts.readout.opacity).toBe(1)
    expect(frame.parts.routes.opacity).toBe(0)
  })

  it('restores the same pose on reverse scroll without reallocating the frame', () => {
    const frame = createArchitectureFrame()
    const { eye, target, parts } = frame
    const { position, scale, rotation } = parts.frame
    sampleArchitecture(frame, 0.56, false, -0.3, 0.4)
    const expected = structuredClone(frame)
    sampleArchitecture(frame, 1, false, 1, 1)
    sampleArchitecture(frame, 0.56, false, -0.3, 0.4)
    expect(frame).toEqual(expected)
    expect(frame.eye).toBe(eye)
    expect(frame.target).toBe(target)
    expect(frame.parts.frame.position).toBe(position)
    expect(frame.parts.frame.scale).toBe(scale)
    expect(frame.parts.frame.rotation).toBe(rotation)
  })

  it('widens the portrait lens and keeps compact framing steady under touch input', () => {
    const frame = createArchitectureFrame()
    sampleArchitecture(frame, 0.25, true, 0, 0, 1.4)
    const wideFov = frame.fov
    sampleArchitecture(frame, 0.25, true, 0, 0, 0.9)
    expect(frame.fov).toBeGreaterThan(wideFov)
    const expected = structuredClone(frame)
    sampleArchitecture(frame, 0.25, true, 1, -1, 0.9)
    expect(frame).toEqual(expected)
  })
})
