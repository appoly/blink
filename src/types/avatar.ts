// Project schema — this is what gets saved to .avatar files (JSON).

export type BodyKind = 'rect' | 'circle' | 'ellipse' | 'capsule' | 'trapezoid' | 'blob'
export type PartKind =
  | BodyKind
  | 'triangle'
  | 'star'
  | 'heart'
  | 'strip'

export interface Fill {
  type: 'solid' | 'gradient'
  color: string
  /** Auto-derived darker shade for the lower gradient stop unless overridden. */
  color2?: string
}

export interface Stroke {
  color: string
  width: number
}

export interface Body {
  kind: BodyKind
  width: number
  height: number
  cornerRadius: number
  /** Blob preset variant 0–2 (only used when kind === 'blob'). */
  blobVariant: number
  fill: Fill
  stroke: Stroke | null
}

export interface Part {
  id: string
  name: string
  kind: PartKind
  /** Centre position relative to the body centre. */
  x: number
  y: number
  width: number
  height: number
  rotation: number
  cornerRadius: number
  /** Per-corner radii [top-left, top-right, bottom-right, bottom-left]; overrides cornerRadius. */
  corners?: [number, number, number, number] | null
  fill: Fill
  stroke: Stroke | null
  opacity: number
  hidden: boolean
  locked: boolean
  /** Edits mirror to an implicit twin across the vertical axis. */
  mirror: boolean
  /** Rendered behind the body layer when true. */
  behindBody: boolean
  /** Rendered above the eyes/mouth when true (default: above body, below face). */
  aboveFace?: boolean
}

export type EyeStyle = 'round' | 'oval' | 'halfmoon' | 'bean'

export interface Eyes {
  style: EyeStyle
  /** Distance from centre line to each eye centre. */
  spacing: number
  /** Vertical offset from body centre. */
  offsetY: number
  size: number
  /** 0.5–1.5 vertical squash. */
  squash: number
  /** Pupil radius as a fraction of eye size, 0–1. */
  pupilSize: number
  highlight: boolean
  color: string
  pupilColor: string
  pupilDrift: boolean
}

export type MouthStyle = 'smile' | 'open' | 'flat' | 'o' | 'cat' | 'tongue'

export interface Mouth {
  style: MouthStyle
  offsetY: number
  width: number
  height: number
  /** -1 (full frown) to 1 (full smile). Only smile-family styles use it. */
  curvature: number
  color: string
}

export type LoopMode = 'infinite' | 'once' | number

export interface ExpressionSettings {
  speed: number // 0.25–3
  intensity: number // 0–1.5
  loop: LoopMode
  include: boolean
}

export interface AvatarProject {
  version: 1
  name: string
  body: Body
  parts: Part[]
  eyes: Eyes
  mouth: Mouth
  expressions: Record<string, ExpressionSettings>
}

export const EXPRESSION_NAMES = [
  'idle',
  'happy',
  'curious',
  'angry',
  'confused',
  'sad',
  'surprised',
  'sleepy',
  'love',
  'laughing',
  'wink',
  'dizzy',
] as const

export type ExpressionName = (typeof EXPRESSION_NAMES)[number]

export function defaultExpressionSettings(): Record<string, ExpressionSettings> {
  const out: Record<string, ExpressionSettings> = {}
  for (const name of EXPRESSION_NAMES) {
    // Wink is a one-shot gesture; everything else loops.
    out[name] = {
      speed: 1,
      intensity: 1,
      loop: name === 'wink' ? 'once' : 'infinite',
      include: name === 'idle' || name === 'happy',
    }
  }
  out.idle.include = true
  return out
}

export function defaultProject(): AvatarProject {
  return {
    version: 1,
    name: 'MyAvatar',
    // Default character (and app mascot): "Pip" — a soft white round with
    // big sparkly eyes. The two ear-nubs wear the Appoly brand colours
    // (red left, navy right) and tilt outward like the two strokes of the
    // logo's "A".
    body: {
      kind: 'circle',
      width: 176,
      height: 178,
      cornerRadius: 0,
      blobVariant: 1,
      fill: { type: 'gradient', color: '#ededed' }, // auto-darkens toward the base
      stroke: null,
    },
    parts: [
      {
        id: 'ear-left',
        name: 'Ear left',
        kind: 'capsule',
        x: -46,
        y: -92,
        width: 30,
        height: 54,
        rotation: -18,
        cornerRadius: 0,
        corners: null,
        fill: { type: 'solid', color: '#c41e3a' },
        stroke: null,
        opacity: 1,
        hidden: false,
        locked: false,
        mirror: false,
        behindBody: true,
        aboveFace: false,
      },
      {
        id: 'ear-right',
        name: 'Ear right',
        kind: 'capsule',
        x: 46,
        y: -92,
        width: 30,
        height: 54,
        rotation: 18,
        cornerRadius: 0,
        corners: null,
        fill: { type: 'solid', color: '#1f3a5f' },
        stroke: null,
        opacity: 1,
        hidden: false,
        locked: false,
        mirror: false,
        behindBody: true,
        aboveFace: false,
      },
    ],
    eyes: {
      style: 'round',
      spacing: 32,
      offsetY: -32,
      size: 21,
      squash: 1.2, // wide-awake
      pupilSize: 0.6,
      highlight: true,
      color: '#ffffff',
      pupilColor: '#243036',
      pupilDrift: true,
    },
    mouth: {
      style: 'smile',
      offsetY: 29,
      width: 53,
      height: 15,
      curvature: 0.7,
      color: '#243036',
    },
    expressions: defaultExpressionSettings(),
  }
}

let idCounter = 0
export function newId(): string {
  idCounter += 1
  return `p${Date.now().toString(36)}${idCounter.toString(36)}`
}
