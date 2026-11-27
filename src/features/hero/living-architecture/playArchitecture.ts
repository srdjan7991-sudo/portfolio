import { createArchitectureRenderer } from './createArchitectureRenderer'
import { readScenePalette } from './scenePalette'
import { createArchitectureFrame, phaseAt, sampleArchitecture } from './sceneTimeline'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function playArchitecture(
  track: HTMLElement, stage: HTMLElement, canvas: HTMLCanvasElement, onFailure: () => void,
) {
  const created = createArchitectureRenderer(canvas)
  if (!created) return
  const renderer = created

  const graphic = createArchitectureFrame()
  const fineMotion = window.matchMedia('(hover: hover) and (pointer: fine)')
  let frame = 0
  let lastTime = 0
  let needsSize = true
  let needsPalette = true
  let palette = new Float32Array(40)
  let compact = false
  let aspect = 1
  let pinTop = 0
  let pointerX = 0
  let pointerY = 0
  let aimX = 0
  let aimY = 0
  let paintedProgress = -1
  let paintedPhase = 0
  let pinnedScroll = -1
  let stopped = false

  function schedule() {
    if (!stopped && !frame) frame = requestAnimationFrame(paint)
  }

  function measure() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return false
    compact = stage.clientWidth < 820
    aspect = width / height
    pinTop = Number.parseFloat(getComputedStyle(stage).insetBlockStart) || 0
    const budget = compact ? 460_000 : 1_250_000
    const ratio = Math.min(devicePixelRatio || 1, compact ? 1.25 : 1.65, Math.sqrt(budget / (width * height)))
    return renderer.resize(width, height, ratio, compact)
  }

  function paint(time: number) {
    frame = 0
    const view = stage.getBoundingClientRect()
    if (document.hidden || view.bottom <= 0 || view.top >= window.innerHeight) {
      lastTime = 0
      pinnedScroll = -1
      return
    }

    if (needsSize) {
      needsSize = false
      if (!measure()) {
        onFailure()
        return
      }
    }
    if (needsPalette) {
      needsPalette = false
      palette = readScenePalette(stage)
    }

    const bounds = track.getBoundingClientRect()
    const pinnedRun = bounds.height - view.height
    const progress = pinnedRun > 1
      ? clamp((pinTop - bounds.top) / pinnedRun)
      : clamp((window.innerHeight * 0.62 - bounds.top) / Math.max(1, view.height * 0.8))
    pinnedScroll = pinnedRun > 1 && progress > 0 && Math.abs(view.top - pinTop) < 2 ? scrollY : -1

    const delta = lastTime ? Math.min(time - lastTime, 42) : 16
    lastTime = time
    const blend = 1 - Math.exp(-delta / 110)
    pointerX += (aimX - pointerX) * blend
    pointerY += (aimY - pointerY) * blend
    if (Math.abs(aimX - pointerX) < 0.003) pointerX = aimX
    if (Math.abs(aimY - pointerY) < 0.003) pointerY = aimY

    sampleArchitecture(graphic, progress, compact, pointerX, pointerY, aspect)
    if (!renderer.render(graphic, palette)) {
      onFailure()
      return
    }
    if (!track.hasAttribute('data-frame-ready')) track.setAttribute('data-frame-ready', '')
    if (paintedProgress !== progress) {
      paintedProgress = progress
      const phase = phaseAt(progress)
      if (phase !== paintedPhase) {
        track.dataset.phase = String(phase)
        paintedPhase = phase
      }
      track.style.setProperty('--scene-progress', String(progress))
    }
    if (pointerX !== aimX || pointerY !== aimY) schedule()
  }

  function resize() {
    needsSize = true
    schedule()
  }

  function readTheme() {
    needsPalette = true
    schedule()
  }

  function resetPointer() {
    aimX = 0
    aimY = 0
    schedule()
  }

  function onPointerMove(event: PointerEvent) {
    if (!fineMotion.matches || event.pointerType !== 'mouse') return
    const bounds = canvas.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    if (x < 0 || y < 0 || x > 1 || y > 1) {
      resetPointer()
      return
    }
    aimX = x * 2 - 1
    aimY = y * 2 - 1
    schedule()
  }

  track.dataset.renderer = 'webgl'
  const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined
  sizeObserver?.observe(stage)
  const themeObserver = new MutationObserver(readTheme)
  themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme'] })
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', schedule)
  fineMotion.addEventListener('change', resetPointer)
  stage.addEventListener('pointermove', onPointerMove, { passive: true })
  stage.addEventListener('pointerleave', resetPointer)
  canvas.addEventListener('webglcontextlost', onFailure)
  schedule()

  return (keepSceneInView = false) => {
    const viewAnchor = keepSceneInView && pinnedScroll >= 0 && Math.abs(scrollY - pinnedScroll) < 2
      ? track.getBoundingClientRect().top + scrollY - pinTop
      : undefined
    stopped = true
    cancelAnimationFrame(frame)
    sizeObserver?.disconnect()
    themeObserver.disconnect()
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', schedule)
    fineMotion.removeEventListener('change', resetPointer)
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerleave', resetPointer)
    canvas.removeEventListener('webglcontextlost', onFailure)
    renderer.dispose()
    track.dataset.renderer = 'static'
    track.dataset.phase = '0'
    track.removeAttribute('data-frame-ready')
    track.style.removeProperty('--scene-progress')
    if (viewAnchor !== undefined) window.scrollTo({ top: viewAnchor, behavior: 'instant' })
  }
}
