import * as THREE from 'three'

// Draw text lines onto a canvas texture — dependency-free labels & screens.
export function makeLabelTexture(
  lines: { text: string; color?: string; size?: number }[],
  opts: { w?: number; h?: number; bg?: string; pad?: number } = {},
): THREE.CanvasTexture {
  const w = opts.w ?? 256
  const h = opts.h ?? 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  drawLabel(canvas, lines, opts)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  return tex
}

export function drawLabel(
  canvas: HTMLCanvasElement,
  lines: { text: string; color?: string; size?: number }[],
  opts: { bg?: string; pad?: number } = {},
) {
  const ctx = canvas.getContext('2d')!
  const { width: w, height: h } = canvas
  ctx.fillStyle = opts.bg ?? '#0b0f14'
  ctx.fillRect(0, 0, w, h)
  const pad = opts.pad ?? 12
  let y = pad
  for (const line of lines) {
    const size = line.size ?? 22
    ctx.font = `600 ${size}px ui-monospace, Menlo, monospace`
    ctx.fillStyle = line.color ?? '#9fd8ff'
    ctx.textBaseline = 'top'
    ctx.fillText(line.text, pad, y, w - pad * 2)
    y += size * 1.35
  }
}
