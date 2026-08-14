// Project schema — this is what gets saved to .avatar files (JSON).

export type BodyKind =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'capsule'
  | 'trapezoid'
  | 'tapered'
  | 'blob'
  | 'polygon'
  | 'burst'
  | 'squircle'
export type PartKind =
  | BodyKind
  | 'lobe'
  | 'arc'
  | 'triangle'
  | 'star'
  | 'heart'
  | 'strip'
  | 'crescent'
  | 'teardrop'

export interface Fill {
  type: 'solid' | 'gradient'
  color: string
  /** Auto-derived darker shade for the lower gradient stop unless overridden. */
  color2?: string
  /** Default 'linear'. */
  gradientType?: 'linear' | 'radial'
  /** Linear only. Degrees clockwise from +x; default 90 = top→bottom. */
  gradientAngle?: number
}

export interface Stroke {
  color: string
  width: number
  /** Default 'solid'. */
  style?: 'solid' | 'dashed' | 'sketchy'
}

export interface Body {
  kind: BodyKind
  width: number
  height: number
  cornerRadius: number
  /** Blob preset: 0 pebble, 1 splodge (pear), 2 puddle. */
  blobVariant: number
  /** Polygon only: number of sides, 3–12. Default 6. */
  sides?: number
  /** Burst only: spike count 5–24 (default 10) and depth 0.1–0.9 (default 0.45). */
  spikes?: number
  spikeDepth?: number
  /** Squircle only: superellipse exponent 2.5–8. Default 4. */
  exponent?: number
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
  /**
   * 0–1. Cinches the local +Y end of a lobe or capsule into a waist
   * (the join of an ear, horn or tail). 0 = even, 1 = very pinched.
   * Teardrop: point sharpness (default 0.3).
   */
  pinch?: number
  /** Blob preset 0–2; parts only. */
  blobVariant?: number
  /** Arc: curve depth as a fraction of the chord, -1.5..1.5. Crescent: concavity 0.1–0.9. */
  bend?: number
  /** Polygon only: number of sides, 3–12. Default 6. */
  sides?: number
  /** Burst only: spike count 5–24 (default 10) and depth 0.1–0.9 (default 0.45). */
  spikes?: number
  spikeDepth?: number
  /** Squircle only: superellipse exponent 2.5–8. Default 4. */
  exponent?: number
  /** Clip this part to the body silhouette — bands/stripes end exactly at the edge. */
  clipToBody?: boolean
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
  /** 1: presets only. 2: adds customExpressions. */
  version: 1 | 2
  name: string
  body: Body
  parts: Part[]
  eyes: Eyes
  mouth: Mouth
  expressions: Record<string, ExpressionSettings>
  /** User-authored expression animations (Animate tab). Same shape as presets. */
  customExpressions: import('../lib/expressions').ExpressionDef[]
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
      include: ['idle', 'happy', 'curious', 'angry', 'confused', 'sad', 'wink'].includes(name),
    }
  }
  out.idle.include = true
  return out
}

export function defaultProject(): AvatarProject {
  const bodyFill = '#dfe6f1'
  const navy = '#12224a'
  const magenta = '#e4286e'
  const expressions = defaultExpressionSettings()
  return {
    version: 2,
    name: 'MyAvatar',
    // Default character (and app mascot): "Pip" — a pale squishy blob with
    // rounded ears (blue-grey left, magenta right) and navy/magenta stripes
    // that sweep round the right hip, clipped to the body silhouette.
    body: {
      kind: 'blob',
      width: 188,
      height: 196,
      cornerRadius: 0,
      blobVariant: 1,
      fill: { type: 'gradient', color: bodyFill, color2: '#c5d0e0' },
      stroke: null,
    },
    parts: [
      {
        id: 'ear-left',
        name: 'Ear left',
        kind: 'ellipse',
        x: -40,
        y: -94,
        width: 34,
        height: 42,
        rotation: -20,
        cornerRadius: 0,
        corners: null,
        pinch: 0,
        blobVariant: 0,
        fill: { type: 'solid', color: '#c3cede' },
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
        kind: 'ellipse',
        x: 44,
        y: -92,
        width: 34,
        height: 42,
        rotation: 22,
        cornerRadius: 0,
        corners: null,
        pinch: 0,
        blobVariant: 0,
        fill: { type: 'solid', color: magenta },
        stroke: null,
        opacity: 1,
        hidden: false,
        locked: false,
        mirror: false,
        behindBody: true,
        aboveFace: false,
      },
      {
        id: 'stripe-navy',
        name: 'Stripe navy',
        kind: 'arc',
        x: 50.5,
        y: 35.3,
        width: 166.3,
        height: 34,
        rotation: -50,
        cornerRadius: 0,
        corners: null,
        pinch: 0,
        blobVariant: 0,
        bend: 0.5,
        clipToBody: true,
        fill: { type: 'solid', color: navy },
        stroke: null,
        opacity: 1,
        hidden: false,
        locked: false,
        mirror: false,
        behindBody: false,
        aboveFace: false,
      },
      {
        id: 'stripe-pink',
        name: 'Stripe pink',
        kind: 'arc',
        x: 65.2,
        y: 52.3,
        width: 150,
        height: 28,
        rotation: -46.5,
        cornerRadius: 0,
        corners: null,
        pinch: 0,
        blobVariant: 0,
        bend: 0.5,
        clipToBody: true,
        fill: { type: 'solid', color: magenta },
        stroke: null,
        opacity: 1,
        hidden: false,
        locked: false,
        mirror: false,
        behindBody: false,
        aboveFace: false,
      },
    ],
    eyes: {
      style: 'round',
      spacing: 30.7,
      offsetY: -28,
      size: 23,
      squash: 1.05,
      pupilSize: 0.58,
      highlight: true,
      color: '#ffffff',
      pupilColor: navy,
      pupilDrift: true,
    },
    mouth: {
      style: 'smile',
      offsetY: 16,
      width: 32,
      height: 11,
      curvature: 0.75,
      color: navy,
    },
    expressions,
    customExpressions: [],
  }
}

let idCounter = 0
export function newId(): string {
  idCounter += 1
  return `p${Date.now().toString(36)}${idCounter.toString(36)}`
}
