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
  fill: Fill
  stroke: Stroke | null
  opacity: number
  hidden: boolean
  locked: boolean
  /** Edits mirror to an implicit twin across the vertical axis. */
  mirror: boolean
  /** Rendered behind the body layer when true. */
  behindBody: boolean
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
    out[name] = { speed: 1, intensity: 1, loop: 'infinite', include: name === 'idle' || name === 'happy' }
  }
  out.idle.include = true
  return out
}

export function defaultProject(): AvatarProject {
  return {
    version: 1,
    name: 'MyAvatar',
    body: {
      kind: 'rect',
      width: 180,
      height: 160,
      cornerRadius: 24,
      blobVariant: 0,
      fill: { type: 'gradient', color: '#d9a066' },
      stroke: null,
    },
    parts: [],
    eyes: {
      style: 'round',
      spacing: 38,
      offsetY: -18,
      size: 16,
      squash: 1,
      pupilSize: 0.45,
      highlight: true,
      color: '#ffffff',
      pupilColor: '#2b2b2b',
      pupilDrift: true,
    },
    mouth: {
      style: 'smile',
      offsetY: 28,
      width: 44,
      height: 18,
      curvature: 0.7,
      color: '#2b2b2b',
    },
    expressions: defaultExpressionSettings(),
  }
}

let idCounter = 0
export function newId(): string {
  idCounter += 1
  return `p${Date.now().toString(36)}${idCounter.toString(36)}`
}
