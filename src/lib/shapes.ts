import type { PartKind } from '../types/avatar'

// Every primitive is generated as a path `d` string centred on (0,0) so the
// same geometry feeds the editor canvas, expression thumbnails and export.

const f = (n: number) => Number(n.toFixed(2))

export type CornerRadii = [number, number, number, number] // tl, tr, br, bl

export function roundedRectPath(w: number, h: number, r: number | CornerRadii): string {
  const clamp = (v: number) => Math.max(0, Math.min(v, w / 2, h / 2))
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map(clamp)
  const x = -w / 2
  const y = -h / 2
  if (tl + tr + br + bl <= 0) {
    return `M ${f(x)} ${f(y)} h ${f(w)} v ${f(h)} h ${f(-w)} Z`
  }
  const arc = (radius: number, dx: number, dy: number) =>
    radius > 0 ? `a ${f(radius)} ${f(radius)} 0 0 1 ${f(dx * radius)} ${f(dy * radius)}` : ''
  return [
    `M ${f(x + tl)} ${f(y)}`,
    `h ${f(w - tl - tr)}`,
    arc(tr, 1, 1),
    `v ${f(h - tr - br)}`,
    arc(br, -1, 1),
    `h ${f(-(w - br - bl))}`,
    arc(bl, -1, -1),
    `v ${f(-(h - bl - tl))}`,
    arc(tl, 1, -1),
    'Z',
  ]
    .filter(Boolean)
    .join(' ')
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

/** Wide at the top and narrow at the bottom — cups, pots and tapered containers. */
export function taperedPath(w: number, h: number): string {
  const inset = w * 0.18
  return `M ${f(-w / 2)} ${f(-h / 2)} L ${f(w / 2)} ${f(-h / 2)} L ${f(w / 2 - inset)} ${f(h / 2)} L ${f(-w / 2 + inset)} ${f(h / 2)} Z`
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

/**
 * Extra outline deform used by blob expression morphs. CSS squash already
 * scales the whole character; these push the silhouette like dough — hips
 * slosh, the outline ripples — without a second uniform scale.
 */
export interface BlobDeform {
  /** 1 = rest, <1 squat (wider hips), >1 stretch (narrower base). */
  squash?: number
  /** Mass shift, positive = slosh right. The base stays planted. */
  slosh?: number
  /** 0–1 phase of the outline ripple. */
  wobble?: number
  /** Ripple amplitude as a fraction of radius. */
  wobbleAmp?: number
}

type BlobPreset = {
  topNarrow: number
  botWide: number
  rightBulge: number
  leftTuck: number
  flatten: number
}

// Pebble = rounder dough, Splodge = pear with a right-side squish,
// Puddle = melted and wide. One closed silhouette — no extra limbs.
const BLOB_PRESETS: BlobPreset[] = [
  { topNarrow: 0.97, botWide: 1.06, rightBulge: 0.06, leftTuck: 0.02, flatten: 0.06 },
  { topNarrow: 0.92, botWide: 1.14, rightBulge: 0.16, leftTuck: 0.04, flatten: 0.1 },
  { topNarrow: 0.94, botWide: 1.26, rightBulge: 0.09, leftTuck: 0.03, flatten: 0.2 },
]

const BLOB_SAMPLES = 32

function closedCatmullRom(pts: { x: number; y: number }[]): string {
  const n = pts.length
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += ` C ${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`
  }
  return d + ' Z'
}

export function blobPath(w: number, h: number, variant: number, deform: BlobDeform = {}): string {
  const preset = BLOB_PRESETS[Math.abs(Math.round(variant)) % BLOB_PRESETS.length]
  const squash = deform.squash ?? 1
  const slosh = deform.slosh ?? 0
  const wobble = deform.wobble ?? 0
  const wobbleAmp = deform.wobbleAmp ?? 0
  const squat = Math.max(0, 1 - squash)
  const stretch = Math.max(0, squash - 1)
  const flatten = preset.flatten + squat * 0.14
  const botWide = preset.botWide + squat * 0.12 - stretch * 0.1
  const hw = w / 2
  const hh = h / 2

  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < BLOB_SAMPLES; i++) {
    const angle = (i / BLOB_SAMPLES) * Math.PI * 2 - Math.PI / 2
    let x = Math.cos(angle) * hw
    let y = Math.sin(angle) * hh

    // Pear: narrower at the top, wider through the hips — not a radial scale,
    // which would just make the bottom taller.
    const t = (y / hh + 1) / 2
    const pear = preset.topNarrow + (botWide - preset.topNarrow) * t * t
    x *= pear

    if (x > 0) x *= 1 + preset.rightBulge * (x / (hw * pear || hw))
    else x *= 1 + preset.leftTuck * (x / (hw * pear || hw))

    if (y > 0) y *= 1 - flatten * (y / hh) * (y / hh)

    const ripple = 1 + wobbleAmp * Math.sin(angle * 3 + wobble * Math.PI * 2)
    x *= ripple
    y *= ripple

    // Grounded slosh: the base stays put, the top leans like jelly.
    const grounded = (hh - y) / h
    x += slosh * grounded * hw

    pts.push({ x, y })
  }

  return closedCatmullRom(pts)
}

/**
 * Tapered bulb: round tip at local −Y, cinched waist toward +Y. Pinch 0 is a
 * capsule; higher pinch makes the ear/horn/tail join. Rotate to point it.
 */
export function lobePath(w: number, h: number, pinch = 0.55): string {
  const p = Math.max(0, Math.min(0.92, pinch))
  const rTop = Math.min(w / 2, h * 0.46)
  const rBot = Math.max(1.2, rTop * (1 - p * 0.82))
  const topCy = -h / 2 + rTop
  const botCy = h / 2 - rBot
  const side = Math.max(0, botCy - topCy)
  const cinch = p * rTop * 0.42
  const pts: { x: number; y: number }[] = []

  const cap = 8
  for (let i = 0; i <= cap; i++) {
    const a = Math.PI - (i / cap) * Math.PI
    pts.push({ x: Math.cos(a) * rTop, y: topCy - Math.sin(a) * rTop })
  }
  const sides = 6
  for (let i = 1; i < sides; i++) {
    const t = i / sides
    pts.push({
      x: rTop + (rBot - rTop) * t - cinch * Math.sin(t * Math.PI),
      y: topCy + side * t,
    })
  }
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * Math.PI
    pts.push({ x: Math.cos(a) * rBot, y: botCy + Math.sin(a) * rBot })
  }
  for (let i = 1; i < sides; i++) {
    const t = i / sides
    pts.push({
      x: -(rBot + (rTop - rBot) * t) + cinch * Math.sin(t * Math.PI),
      y: botCy - side * t,
    })
  }

  return closedCatmullRom(pts)
}

/**
 * Curved band ("arc"): a stroke-like ribbon bent into a curve. `w` is the
 * chord length, `h` the thickness, `bend` (-1.5..1.5) the curve depth as a
 * fraction of the chord — 0 degenerates to a straight capsule. Round caps.
 */
export function arcBandPath(w: number, h: number, bend = 0.6): string {
  const t = Math.max(1, h)
  const c = bend * w * 0.5 // quadratic control-point depth
  const half = w / 2
  const unit = (x: number, y: number) => {
    const len = Math.hypot(x, y) || 1
    return { x: x / len, y: y / len }
  }
  // Normals (tangent rotated 90°) at the two endpoints and the middle.
  const n0 = unit(-c, half)
  const n2 = unit(c, half)
  const r = t / 2
  const a = { x: -half + n0.x * r, y: n0.y * r } // outer start
  const a2 = { x: -half - n0.x * r, y: -n0.y * r } // inner start
  const b = { x: half + n2.x * r, y: n2.y * r } // outer end
  const b2 = { x: half - n2.x * r, y: -n2.y * r } // inner end
  return [
    `M ${f(a.x)} ${f(a.y)}`,
    `Q 0 ${f(c + r)} ${f(b.x)} ${f(b.y)}`,
    `A ${f(r)} ${f(r)} 0 0 0 ${f(b2.x)} ${f(b2.y)}`,
    `Q 0 ${f(c - r)} ${f(a2.x)} ${f(a2.y)}`,
    `A ${f(r)} ${f(r)} 0 0 0 ${f(a.x)} ${f(a.y)}`,
    'Z',
  ].join(' ')
}

/** Regular polygon on the w×h ellipse, flat-ish top vertex up, optional rounded corners. */
export function polygonPath(w: number, h: number, sides = 6, cornerRadius = 0): string {
  const n = Math.max(3, Math.min(12, Math.round(sides)))
  const verts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    verts.push({ x: Math.cos(a) * (w / 2), y: Math.sin(a) * (h / 2) })
  }
  if (cornerRadius <= 0) {
    return `M ${verts.map((v) => `${f(v.x)} ${f(v.y)}`).join(' L ')} Z`
  }
  // Rounded vertices: pull each corner's entry/exit points back along the
  // edges and bridge with a quadratic through the vertex.
  const pts = verts.map((v, i) => {
    const prev = verts[(i - 1 + n) % n]
    const next = verts[(i + 1) % n]
    const along = (a: { x: number; y: number }, b: { x: number; y: number }, dist: number) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const t = Math.min(0.5, dist / len)
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    return { entry: along(v, prev, cornerRadius), exit: along(v, next, cornerRadius), v }
  })
  const segs = [`M ${f(pts[0].exit.x)} ${f(pts[0].exit.y)}`]
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n]
    segs.push(`L ${f(p.entry.x)} ${f(p.entry.y)}`, `Q ${f(p.v.x)} ${f(p.v.y)} ${f(p.exit.x)} ${f(p.exit.y)}`)
  }
  return segs.join(' ') + ' Z'
}

/** Spiky burst — a generalised star with adjustable point count and depth. */
export function burstPath(w: number, h: number, spikes = 10, spikeDepth = 0.45): string {
  const n = Math.max(5, Math.min(24, Math.round(spikes)))
  const inner = 1 - Math.max(0.1, Math.min(0.9, spikeDepth))
  const points: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / n
    const scale = i % 2 === 0 ? 1 : inner
    points.push(`${f(Math.cos(angle) * (w / 2) * scale)} ${f(Math.sin(angle) * (h / 2) * scale)}`)
  }
  return `M ${points.join(' L ')} Z`
}

/** Superellipse — between an ellipse (exponent 2) and a rounded box (8+). */
export function squirclePath(w: number, h: number, exponent = 4): string {
  const n = Math.max(2.5, Math.min(8, exponent))
  const pts: { x: number; y: number }[] = []
  const samples = 40
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push({
      x: (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n),
      y: (h / 2) * Math.sign(s) * Math.abs(s) ** (2 / n),
    })
  }
  return closedCatmullRom(pts)
}

/**
 * Crescent with tips at (0, ±h/2), bulging right, concave left. `bend` is the
 * fullness: 0.1 a thin sliver, 0.5 a half moon, 0.9 nearly gibbous.
 */
export function crescentPath(w: number, h: number, bend = 0.5): string {
  const b = Math.max(0.1, Math.min(0.9, bend))
  const rx = w / 2
  const ry = h / 2
  const innerRx = rx * Math.abs(1 - 2 * b)
  const outer = `M 0 ${f(-ry)} A ${f(rx)} ${f(ry)} 0 0 1 0 ${f(ry)}`
  if (innerRx < 0.5) return `${outer} L 0 ${f(-ry)} Z` // half moon
  // Thin crescent (b < 0.5): inner edge bows right, same side as the outer.
  const sweep = b < 0.5 ? 0 : 1
  return `${outer} A ${f(innerRx)} ${f(ry)} 0 0 ${sweep} 0 ${f(-ry)} Z`
}

/**
 * Teardrop: a circle sitting at the bottom of the box with a point at the
 * top. `pinch` sharpens the sides — 0 bows them out (onion), 1 is a straight
 * cone.
 */
export function teardropPath(w: number, h: number, pinch = 0.3): string {
  const p = Math.max(0, Math.min(1, pinch))
  // The tangent construction needs the apex outside the circle.
  const r = Math.min(w / 2, h * 0.42)
  const cy = h / 2 - r
  const apex = { x: 0, y: -h / 2 }
  const d = cy - apex.y // apex → centre distance, > r by the clamp above
  const theta = Math.acos(r / d)
  const tx = r * Math.sin(theta)
  const ty = cy - r * Math.cos(theta)
  // Sides: straight tangents when fully pinched, bowed outward when soft.
  const bow = (1 - p) * r * 0.35
  const mid = (x: number) => ({
    x: (apex.x + x) / 2 + Math.sign(x) * bow,
    y: (apex.y + ty) / 2,
  })
  const cr = mid(tx)
  const cl = mid(-tx)
  return [
    `M 0 ${f(apex.y)}`,
    `Q ${f(cr.x)} ${f(cr.y)} ${f(tx)} ${f(ty)}`,
    `A ${f(r)} ${f(r)} 0 1 1 ${f(-tx)} ${f(ty)}`,
    `Q ${f(cl.x)} ${f(cl.y)} 0 ${f(apex.y)}`,
    'Z',
  ].join(' ')
}

export interface ShapeOptions {
  cornerRadius?: number
  blobVariant?: number
  corners?: CornerRadii | null
  pinch?: number
  bend?: number
  sides?: number
  spikes?: number
  spikeDepth?: number
  exponent?: number
}

export function shapePath(kind: PartKind, w: number, h: number, opts: ShapeOptions = {}): string {
  const {
    cornerRadius = 0,
    blobVariant = 0,
    corners = null,
    pinch = 0,
    bend = 0.6,
    sides = 6,
    spikes = 10,
    spikeDepth = 0.45,
    exponent = 4,
  } = opts
  switch (kind) {
    case 'rect':
    case 'strip':
      return roundedRectPath(w, h, corners ?? cornerRadius)
    case 'circle':
    case 'ellipse':
      return ellipsePath(w, h)
    case 'capsule':
      return pinch > 0 ? lobePath(w, h, pinch) : capsulePath(w, h)
    case 'lobe':
      return lobePath(w, h, pinch)
    case 'arc':
      return arcBandPath(w, h, bend)
    case 'trapezoid':
      return trapezoidPath(w, h)
    case 'tapered':
      return taperedPath(w, h)
    case 'blob':
      return blobPath(w, h, blobVariant)
    case 'triangle':
      return trianglePath(w, h)
    case 'star':
      return starPath(w, h)
    case 'heart':
      return heartPath(w, h)
    case 'polygon':
      return polygonPath(w, h, sides, cornerRadius)
    case 'burst':
      return burstPath(w, h, spikes, spikeDepth)
    case 'squircle':
      return squirclePath(w, h, exponent)
    case 'crescent':
      // Crescent's natural default is a half moon, not the arc's 0.6 bend.
      return crescentPath(w, h, opts.bend ?? 0.5)
    case 'teardrop':
      return teardropPath(w, h, pinch)
  }
}

/** Mix two hex colours: t = 0 → a, t = 1 → b. Used for the expression flush. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const m = hex.replace('#', '')
    const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
    const num = parseInt(full, 16)
    return Number.isNaN(num) ? null : [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  }
  const ca = parse(a)
  const cb = parse(b)
  if (!ca || !cb) return a
  const mixed = ca.map((v, i) => Math.round(v + (cb[i] - v) * t))
  return `#${((mixed[0] << 16) | (mixed[1] << 8) | mixed[2]).toString(16).padStart(6, '0')}`
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
