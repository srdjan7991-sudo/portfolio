function rgb(hex: string) {
  const color = Number.parseInt(hex.trim().slice(1), 16)
  return [(color >> 16 & 255) / 255, (color >> 8 & 255) / 255, (color & 255) / 255]
}

function blend(base: number[], tint: number[], amount: number) {
  return base.map((value, index) => value + (tint[index] - value) * amount)
}

export function readScenePalette(element: HTMLElement) {
  const css = getComputedStyle(element)
  const token = (name: string) => rgb(css.getPropertyValue(name))
  const raised = token('--surface-raised')
  const surface = token('--surface')
  const ink = token('--ink')
  const quiet = token('--quiet')
  const accent = token('--accent')
  const edge = token('--accent-edge')
  const paper = token('--paper')
  const soft = token('--accent-soft')
  const dark = document.documentElement.dataset.theme === 'dark'

  return new Float32Array([
    ...blend(raised, ink, dark ? 0.16 : 0.03), 1,      // Limestone
    ...blend(surface, ink, dark ? 0.28 : 0), 1,       // Paper
    ...blend(dark ? raised : ink, quiet, 0.26), 1,   // Graphite
    ...blend(raised, edge, 0.74), 1,                 // Slate
    ...blend(accent, edge, 0.18), 1,                 // Accent
    ...blend(soft, edge, 0.48), 0.46,                // Glass
    ...blend(token('--line'), paper, 0.35), 1,       // Grid
    ...(dark ? token('--surface-subtle') : ink), 1,  // Ink
    ...blend(dark ? paper : ink, [0, 0, 0], 0.18), 0.34,
    ...blend(soft, edge, dark ? 0.24 : 0.31), 1,
  ])
}
