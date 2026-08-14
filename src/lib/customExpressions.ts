import type { AvatarProject } from '../types/avatar'
import { EXPRESSION_NAMES } from '../types/avatar'
import {
  DECEL,
  EXPRESSIONS,
  FALL,
  GROUND,
  SMOOTH,
  SNAP_IN,
  SPRING,
  type ExpressionDef,
  type Track,
  type TrackTarget,
  type TransformKeyframe,
} from './expressions'

/**
 * Custom expressions are user-authored ExpressionDefs stored in the project
 * file. `def.name` is a CSS-safe slug (it lands in keyframe names, selectors
 * and the exported `expression` prop); `def.label` is the display name.
 * Everything here resolves presets and customs through one lookup so the
 * preview, thumbnails, GIF and export pipelines treat them identically.
 */

export function getExpressionDef(project: AvatarProject, name: string): ExpressionDef | undefined {
  return EXPRESSIONS[name as keyof typeof EXPRESSIONS] ?? project.customExpressions.find((d) => d.name === name)
}

export function isCustomExpression(name: string): boolean {
  return !(name in EXPRESSIONS)
}

/** All expression names: the 12 presets, then customs in project order. */
export function allExpressionNames(project: AvatarProject): string[] {
  return [...Object.keys(EXPRESSIONS), ...project.customExpressions.map((d) => d.name)]
}

export function expressionLabel(def: ExpressionDef): string {
  return def.label ?? def.name
}

// ---- naming ---------------------------------------------------------------

export function slugify(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return /^[a-z]/.test(slug) ? slug : `x${slug || 'anim'}`
}

/**
 * Validates a display name for a custom expression: non-empty, not a preset
 * name, unique among customs (ignoring `ignoreSlug`, the one being renamed).
 */
export function nameError(project: AvatarProject, label: string, ignoreSlug?: string): string | null {
  const trimmed = label.trim()
  if (!trimmed) return 'Name cannot be empty'
  if ((EXPRESSION_NAMES as readonly string[]).includes(trimmed.toLowerCase())) {
    return `"${trimmed}" is a preset name`
  }
  const slug = slugify(trimmed)
  if (slug in EXPRESSIONS) return `"${trimmed}" clashes with a preset name`
  const clash = project.customExpressions.some(
    (d) => d.name !== ignoreSlug && (d.name === slug || expressionLabel(d).toLowerCase() === trimmed.toLowerCase()),
  )
  return clash ? `"${trimmed}" is already taken` : null
}

function uniqueLabel(project: AvatarProject, base: string): string {
  if (!nameError(project, base)) return base
  for (let i = 2; ; i++) {
    const candidate = `${base} ${i}`
    if (!nameError(project, candidate)) return candidate
  }
}

// ---- creation -------------------------------------------------------------

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

function identityKeyframe(o: number): TransformKeyframe {
  return { o, tx: 0, ty: 0, r: 0, sx: 1, sy: 1 }
}

/**
 * Starting points offered when creating a new animation. Each is a small,
 * seamless loop built from the same easing vocabulary as the presets, meant
 * to be pulled apart on the timeline rather than shipped as-is.
 */
export interface StarterTemplate {
  key: string
  /** Shown in the template picker. */
  label: string
  description: string
  /** Base for the new expression's name (defaults to `label`). */
  nameBase?: string
  build: () => Pick<ExpressionDef, 'duration' | 'thumbOffset' | 'tracks' | 'morph'>
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: 'blank',
    label: 'Blank',
    nameBase: 'Animation',
    description: 'Empty 2s timeline, one Body track',
    build: () => ({
      duration: 2,
      thumbOffset: 50,
      tracks: [
        { target: 'squash', origin: GROUND, ease: SMOOTH, unit: '%', keyframes: [identityKeyframe(0), identityKeyframe(100)] },
      ],
    }),
  },
  {
    key: 'bounce',
    label: 'Bounce',
    description: 'Crouch, hop, land with a squash',
    build: () => ({
      duration: 1.2,
      thumbOffset: 40,
      tracks: [
        {
          target: 'squash',
          origin: GROUND,
          unit: '%',
          keyframes: [
            { o: 0, sy: 1, sx: 1, ty: 0, ease: SNAP_IN },
            { o: 15, sy: 0.86, sx: 1.1, ty: 0, ease: SPRING },
            { o: 40, sy: 1.08, sx: 0.95, ty: -18, ease: FALL },
            { o: 62, sy: 0.88, sx: 1.1, ty: 0, ease: SPRING },
            { o: 80, sy: 1.02, sx: 0.99, ty: 0, ease: SMOOTH },
            { o: 100, sy: 1, sx: 1, ty: 0 },
          ],
        },
      ],
    }),
  },
  {
    key: 'breathe',
    label: 'Breathe',
    description: 'Slow rise and fall from the ground up',
    build: () => ({
      duration: 3.5,
      thumbOffset: 50,
      tracks: [
        {
          target: 'squash',
          origin: GROUND,
          ease: SMOOTH,
          unit: '%',
          keyframes: [
            { o: 0, sy: 1, sx: 1 },
            { o: 50, sy: 1.04, sx: 0.98 },
            { o: 100, sy: 1, sx: 1 },
          ],
        },
        {
          target: 'eyes',
          ease: SMOOTH,
          unit: '%',
          keyframes: [
            { o: 0, ty: 0 },
            { o: 55, ty: -1 },
            { o: 100, ty: 0 },
          ],
        },
      ],
    }),
  },
  {
    key: 'nod',
    label: 'Nod yes',
    description: 'Dip and spring back up',
    build: () => ({
      duration: 1.1,
      thumbOffset: 25,
      tracks: [
        {
          target: 'squash',
          origin: GROUND,
          unit: '%',
          keyframes: [
            { o: 0, ty: 0, sy: 1, ease: SNAP_IN },
            { o: 20, ty: 2.5, sy: 0.94, ease: SPRING },
            { o: 48, ty: -1.5, sy: 1.03, ease: SMOOTH },
            { o: 72, ty: 1, sy: 0.99, ease: DECEL },
            { o: 100, ty: 0, sy: 1 },
          ],
        },
        {
          target: 'eyes',
          ease: SMOOTH,
          unit: '%',
          keyframes: [
            { o: 0, ty: 0 },
            { o: 22, ty: 1.2 },
            { o: 50, ty: -0.8 },
            { o: 100, ty: 0 },
          ],
        },
      ],
    }),
  },
  {
    key: 'shake',
    label: 'Shake no',
    description: 'Quick side-to-side head shake',
    build: () => ({
      duration: 0.9,
      thumbOffset: 20,
      tracks: [
        {
          target: 'root',
          origin: GROUND,
          ease: SMOOTH,
          unit: '%',
          keyframes: [
            { o: 0, tx: 0, r: 0 },
            { o: 15, tx: -2.5, r: -2 },
            { o: 40, tx: 2.5, r: 2 },
            { o: 62, tx: -1.5, r: -1.2 },
            { o: 82, tx: 0.8, r: 0.6 },
            { o: 100, tx: 0, r: 0 },
          ],
        },
      ],
    }),
  },
  {
    key: 'float',
    label: 'Float',
    description: 'Weightless hover with a gentle sway',
    build: () => ({
      duration: 2.8,
      thumbOffset: 50,
      tracks: [
        {
          target: 'root',
          origin: GROUND,
          ease: SMOOTH,
          unit: '%',
          keyframes: [
            { o: 0, ty: 0, r: 0 },
            { o: 30, ty: -5, r: 1.5 },
            { o: 70, ty: -5, r: -1.5 },
            { o: 100, ty: 0, r: 0 },
          ],
        },
        {
          target: 'squash',
          origin: GROUND,
          ease: SMOOTH,
          unit: '%',
          keyframes: [
            { o: 0, sy: 1, sx: 1 },
            { o: 50, sy: 1.02, sx: 0.99 },
            { o: 100, sy: 1, sx: 1 },
          ],
        },
      ],
    }),
  },
]

/** New custom expression from a starter template (blank when omitted). */
export function newCustomExpression(project: AvatarProject, template: StarterTemplate = STARTER_TEMPLATES[0]): ExpressionDef {
  const label = uniqueLabel(project, template.nameBase ?? template.label)
  return { name: slugify(label), label, ...clone(template.build()) }
}

/** Deep-copy any expression (preset or custom) into a new custom def. */
export function duplicateExpression(project: AvatarProject, source: ExpressionDef): ExpressionDef {
  const label = uniqueLabel(project, expressionLabel(source))
  const copy = clone(source)
  return { ...copy, name: slugify(label), label }
}

/** Register a custom def in the project (def + its expression settings). */
export function addCustomExpression(project: AvatarProject, def: ExpressionDef): void {
  project.customExpressions.push(def)
  project.expressions[def.name] = { speed: 1, intensity: 1, loop: 'infinite', include: true }
}

export function removeCustomExpression(project: AvatarProject, name: string): void {
  project.customExpressions = project.customExpressions.filter((d) => d.name !== name)
  delete project.expressions[name]
}

/** Rename: re-slugs and moves the settings entry to the new key. */
export function renameCustomExpression(project: AvatarProject, def: ExpressionDef, label: string): void {
  const oldName = def.name
  def.label = label.trim()
  def.name = slugify(def.label)
  if (def.name !== oldName && project.expressions[oldName]) {
    project.expressions[def.name] = project.expressions[oldName]
    delete project.expressions[oldName]
  }
}

// ---- timeline rows ---------------------------------------------------------

/**
 * The curated track rows the Animate tab exposes. Eye-lid cross-fade layers
 * (eyeOpen/eyeClosed/eyeSmile and L/R variants) are deliberately absent: the
 * matched-silhouette swap is too easy to break by hand, so they round-trip
 * untouched instead.
 */
export interface RowDef {
  key: string
  label: string
  /** Target when the row is unified (or its only mode). */
  target: TrackTarget
  /** L/R split targets, for rows with a Both/Left/Right toggle. */
  split?: [TrackTarget, TrackTarget]
  /** Keyframes expose opacity (brows fade in/out). */
  hasOpacity?: boolean
  defaultOrigin?: string
  /** Which canvas gizmos the row supports. */
  gizmos: ('move' | 'rotate' | 'scale')[]
}

export const ROWS: RowDef[] = [
  { key: 'squash', label: 'Body', target: 'squash', defaultOrigin: GROUND, gizmos: ['move', 'rotate', 'scale'] },
  { key: 'root', label: 'Whole character', target: 'root', defaultOrigin: GROUND, gizmos: ['move', 'rotate', 'scale'] },
  { key: 'eyes', label: 'Eyes', target: 'eyes', split: ['eyeL', 'eyeR'], gizmos: ['move', 'scale'] },
  { key: 'brows', label: 'Brows', target: 'brows', split: ['browL', 'browR'], hasOpacity: true, gizmos: ['move', 'rotate'] },
  { key: 'pupils', label: 'Pupils', target: 'pupils', gizmos: ['move'] },
  { key: 'mouth', label: 'Mouth (transform)', target: 'mouth', gizmos: ['move', 'rotate', 'scale'] },
]

const ROW_TARGETS = new Set<TrackTarget>(ROWS.flatMap((r) => [r.target, ...(r.split ?? [])]))

/** Tracks preserved in the data but not editable in v1 (eye-lid layers…). */
export function hiddenTracks(def: ExpressionDef): Track[] {
  return def.tracks.filter((t) => !ROW_TARGETS.has(t.target))
}

export function newTrack(target: TrackTarget, row: RowDef): Track {
  return {
    target,
    ...(row.defaultOrigin ? { origin: row.defaultOrigin } : {}),
    ease: SMOOTH,
    unit: '%',
    keyframes: [
      { o: 0, ...(row.hasOpacity ? { opacity: 1 } : {}) },
      { o: 100, ...(row.hasOpacity ? { opacity: 1 } : {}) },
    ],
  }
}

// ---- keyframe values -------------------------------------------------------

export interface KeyframeValues {
  tx: number
  ty: number
  r: number
  sx: number
  sy: number
  opacity?: number
}

export function keyframeValues(kf: TransformKeyframe): KeyframeValues {
  return {
    tx: kf.tx ?? 0,
    ty: kf.ty ?? 0,
    r: kf.r ?? 0,
    sx: kf.sx ?? 1,
    sy: kf.sy ?? 1,
    ...(kf.opacity !== undefined ? { opacity: kf.opacity } : {}),
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.001

function sameValues(a: TransformKeyframe, b: TransformKeyframe): boolean {
  const va = keyframeValues(a)
  const vb = keyframeValues(b)
  return (
    near(va.tx, vb.tx) &&
    near(va.ty, vb.ty) &&
    near(va.r, vb.r) &&
    near(va.sx, vb.sx) &&
    near(va.sy, vb.sy) &&
    near(va.opacity ?? 1, vb.opacity ?? 1)
  )
}

const NEUTRAL: TransformKeyframe = { o: 100 }

// ---- loop hygiene ----------------------------------------------------------

/**
 * Loop-seam check. For looping expressions every track's first and last
 * keyframes must hold the same values (and the morph must return to its
 * start); for play-once, the final keyframes must be neutral/identity.
 */
export function seamBroken(def: ExpressionDef, loopsForever: boolean): boolean {
  for (const track of def.tracks) {
    const kfs = track.keyframes
    if (kfs.length < 2) continue
    const last = kfs[kfs.length - 1]
    const reference = loopsForever ? kfs[0] : { ...NEUTRAL, ...(last.opacity !== undefined ? { opacity: kfs[0].opacity } : {}) }
    if (!sameValues(reference, last) || last.o < 100) return true
  }
  if (def.morph && def.morph.length >= 2) {
    const last = def.morph[def.morph.length - 1]
    if (!near(def.morph[0].curvature, last.curvature) || last.o < 100) return true
  }
  return false
}

/**
 * One-click seam fix: give every track a 100% keyframe copying the 0% values
 * (loop) or neutral values (play once), and close the morph the same way.
 */
export function fixSeam(def: ExpressionDef, loopsForever: boolean): void {
  for (const track of def.tracks) {
    const kfs = track.keyframes
    if (!kfs.length) continue
    const source = loopsForever ? kfs[0] : { ...NEUTRAL, opacity: kfs[0].opacity }
    const values = { ...keyframeValues(source), o: 100 }
    const last = kfs[kfs.length - 1]
    if (last.o >= 100) Object.assign(last, values)
    else kfs.push({ ...values, ease: last.ease })
  }
  if (def.morph?.length) {
    const target = def.morph[0].curvature
    const last = def.morph[def.morph.length - 1]
    if (last.o >= 100) last.curvature = target
    else def.morph.push({ o: 100, curvature: target })
  }
}

// ---- soft value ranges -----------------------------------------------------

/** Sane-motion ranges; values outside get a soft warning, not a hard block. */
export const SAFE_RANGES = {
  scale: [0.2, 2],
  rotation: [-45, 45],
  /** % of body size (matches unit '%' tracks). */
  translation: [-40, 40],
} as const

export function keyframeWarning(kf: TransformKeyframe): string | null {
  const v = keyframeValues(kf)
  if (v.sx < SAFE_RANGES.scale[0] || v.sx > SAFE_RANGES.scale[1] || v.sy < SAFE_RANGES.scale[0] || v.sy > SAFE_RANGES.scale[1]) {
    return 'Scale outside the safe 0.2–2 range'
  }
  if (Math.abs(v.r) > SAFE_RANGES.rotation[1]) return 'Rotation beyond ±45°'
  if (Math.abs(v.tx) > SAFE_RANGES.translation[1] || Math.abs(v.ty) > SAFE_RANGES.translation[1]) {
    return 'Translation beyond ±40% of body size'
  }
  return null
}
