import type { PartKind } from '../types/avatar'

// Every primitive is generated as a path `d` string centred on (0,0) so the
// same geometry feeds the editor canvas, expression thumbnails and export.

const f = (n: number) => Number(n.toFixed(2))

export function roundedRectPath(w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2)
  const x = -w / 2
  const y = -h / 2
  if (rr <= 0) {
    return `M ${f(x)} ${f(y)} h ${f(w)} v ${f(h)} h ${f(-w)} Z`
  }
  return [
    `M ${f(x + rr)} ${f(y)}`,
    `h ${f(w - 2 * rr)}`,
    `a ${f(rr)} ${f(rr)} 0 0 1 ${f(rr)} ${f(rr)}`,
    `v ${f(h - 2 * rr)}`,
    `a ${f(rr)} ${f(rr)} 0 0 1 ${f(-rr)} ${f(rr)}`,
    `h ${f(-(w - 2 * rr))}`,
    `a ${f(rr)} ${f(rr)} 0 0 1 ${f(-rr)} ${f(-rr)}`,
    `v ${f(-(h - 2 * rr))}`,
    `a ${f(rr)} ${f(rr)} 0 0 1 ${f(rr)} ${f(-rr)}`,
    'Z',
  ].join(' ')
}

export function ellipsePath(w: number, h: number): string {
  const rx = w / 2
  const ry = h / 2
  return `M ${f(-rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0 Z`
}

export function capsulePath(w: number, h: number): string {
  return roundedRectPath(w, h, Math.min(w, h) / 2)
}

export function trapezoidPath(w: number, h: number): string {
  const inset = w * 0.18
  return `M ${f(-w / 2 + inset)} ${f(-h / 2)} L ${f(w / 2 - inset)} ${f(-h / 2)} L ${f(w / 2)} ${f(h / 2)} L ${f(-w / 2)} ${f(h / 2)} Z`
}

export function trianglePath(w: number, h: number): string {
  return `M 0 ${f(-h / 2)} L ${f(w / 2)} ${f(h / 2)} L ${f(-w / 2)} ${f(h / 2)} Z`
}

export function starPath(w: number, h: number): string {
  const outerX = w / 2
  const outerY = h / 2
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const rx = i % 2 === 0 ? outerX : outerX * 0.45
    const ry = i % 2 === 0 ? outerY : outerY * 0.45
    points.push(`${f(Math.cos(angle) * rx)} ${f(Math.sin(angle) * ry)}`)
  }
  return `M ${points.join(' L ')} Z`
}

export function heartPath(w: number, h: number): string {
  const x = w / 2
  const y = h / 2
  return [
    `M 0 ${f(y)}`,
    `C ${f(-x * 1.1)} ${f(y * 0.1)} ${f(-x * 0.9)} ${f(-y)} 0 ${f(-y * 0.35)}`,
    `C ${f(x * 0.9)} ${f(-y)} ${f(x * 1.1)} ${f(y * 0.1)} 0 ${f(y)}`,
    'Z',
  ].join(' ')
}

// Organic blob presets built from cubic beziers around an ellipse.
const BLOB_WOBBLES: number[][] = [
  [1.0, 0.92, 1.06, 0.96, 1.04, 0.9, 1.08, 0.95],
  [0.95, 1.08, 0.9, 1.05, 1.0, 0.88, 1.06, 1.02],
  [1.06, 0.9, 1.02, 1.08, 0.92, 1.04, 0.96, 1.0],
]

export function blobPath(w: number, h: number, variant: number): string {
  const wobble = BLOB_WOBBLES[Math.abs(Math.round(variant)) % BLOB_WOBBLES.length]
  const n = wobble.length
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    pts.push({
      x: Math.cos(angle) * (w / 2) * wobble[i],
      y: Math.sin(angle) * (h / 2) * wobble[i],
    })
  }
  // Catmull-Rom → bezier for a smooth closed curve.
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`
  }
  return d + ' Z'
}

export function stripPath(w: number, h: number): string {
  return roundedRectPath(w, h, Math.min(h / 4, 4))
}

export function shapePath(kind: PartKind, w: number, h: number, cornerRadius: number, blobVariant = 0): string {
  switch (kind) {
    case 'rect':
      return roundedRectPath(w, h, cornerRadius)
    case 'circle':
    case 'ellipse':
      return ellipsePath(w, h)
    case 'capsule':
      return capsulePath(w, h)
    case 'trapezoid':
      return trapezoidPath(w, h)
    case 'blob':
      return blobPath(w, h, blobVariant)
    case 'triangle':
      return trianglePath(w, h)
    case 'star':
      return starPath(w, h)
    case 'heart':
      return heartPath(w, h)
    case 'strip':
      return stripPath(w, h)
  }
}

/** Darken a hex colour by a factor (0–1) — used for auto gradient stops. */
export function darken(hex: string, amount = 0.18): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return hex
  const r = Math.round(((num >> 16) & 255) * (1 - amount))
  const g = Math.round(((num >> 8) & 255) * (1 - amount))
  const b = Math.round((num & 255) * (1 - amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
