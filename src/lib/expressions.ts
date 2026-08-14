import type { ExpressionName } from '../types/avatar'

/**
 * Expressions are pure data: keyframed transforms on named parts of the
 * avatar, plus an optional mouth-curvature morph. The same definitions drive
 * the editor preview, the expression-card thumbnails and the exported CSS.
 */

export type TrackTarget =
  | 'root'
  | 'squash'
  | 'eyes'
  | 'eyeL'
  | 'eyeR'
  | 'eyeOpen'
  | 'eyeLOpen'
  | 'eyeROpen'
  | 'eyeClosed'
  | 'eyeLClosed'
  | 'eyeRClosed'
  | 'eyeSmile'
  | 'eyeLSmile'
  | 'eyeRSmile'
  | 'brows'
  | 'browL'
  | 'browR'
  | 'pupils'
  | 'mouth'

export interface TransformKeyframe {
  /** Offset in percent, 0–100. */
  o: number
  tx?: number
  ty?: number
  r?: number
  sx?: number
  sy?: number
  /**
   * 0–1 — used for props (scaled by intensity) and eye-pose cross-fades
   * (used raw, so lids stay solid at any intensity).
   */
  opacity?: number
  /** Timing function from this keyframe to the next (overrides the track ease). */
  ease?: string
}

export interface Track {
  target: TrackTarget
  /** CSS transform-origin (fill-box). */
  origin?: string
  ease?: string
  /**
   * With '%', tx/ty are percentages of the body size (of the eye size for
   * pupils) instead of px, so motion scales with the character's proportions.
   */
  unit?: '%'
  keyframes: TransformKeyframe[]
}

export interface MorphKeyframe {
  o: number
  /** Absolute target curvature, -1..1. Intensity blends from the base value. */
  curvature: number
  /** Timing function from this keyframe to the next. */
  ease?: string
}

/**
 * A small decorative element (hearts, Zzz, sparkles…) that exists only during
 * its expression. Rendered hidden (opacity 0) into every avatar so the
 * exported SFC needs no extra assets; the expression CSS fades it in and out.
 */
export interface ExpressionProp {
  /** Unique within the expression; selector is .avatar-prop--<expr>-<id>. */
  id: string
  shape: 'heart' | 'zzz' | 'puff' | 'sparkle' | 'star'
  /** Anchor relative to the body: ±1 = body edge (x right, y down). */
  x: number
  y: number
  /** Size as a fraction of the smaller body dimension. */
  size: number
  color: string
  /** Hidden below this intensity, ramping in above it (more props at higher intensity). */
  minIntensity?: number
  ease?: string
  /** tx/ty are % of body size. Keyframes must start and end at opacity 0. */
  keyframes: TransformKeyframe[]
}

export interface FlushKeyframe {
  o: number
  /** 0–1 blend of the body colour toward the flush colour. Scaled by intensity. */
  amount: number
  ease?: string
}

export interface ExpressionDef {
  name: ExpressionName
  /** Base duration in seconds at 1× speed. */
  duration: number
  /** Percent offset used for the static thumbnail frame. */
  thumbOffset: number
  /** Suspends the always-on blink while active (the expression drives the eyelids itself). */
  ownsEyes?: boolean
  tracks: Track[]
  morph?: MorphKeyframe[]
  props?: ExpressionProp[]
  /** Animates the body colour toward `color` and back (e.g. the angry flush). */
  flush?: { color: string; keyframes: FlushKeyframe[] }
}

export const TARGET_SELECTORS: Record<TrackTarget, string> = {
  root: '.avatar-root',
  squash: '.avatar-squash',
  eyes: '.avatar-eye-anim',
  eyeL: '.avatar-eye--left .avatar-eye-anim',
  eyeR: '.avatar-eye--right .avatar-eye-anim',
  eyeOpen: '.avatar-eye-open',
  eyeLOpen: '.avatar-eye--left .avatar-eye-open',
  eyeROpen: '.avatar-eye--right .avatar-eye-open',
  eyeClosed: '.avatar-eye-closed',
  eyeLClosed: '.avatar-eye--left .avatar-eye-closed',
  eyeRClosed: '.avatar-eye--right .avatar-eye-closed',
  eyeSmile: '.avatar-eye-smile',
  eyeLSmile: '.avatar-eye--left .avatar-eye-smile',
  eyeRSmile: '.avatar-eye--right .avatar-eye-smile',
  brows: '.avatar-eyebrow',
  browL: '.avatar-eye--left .avatar-eyebrow',
  browR: '.avatar-eye--right .avatar-eyebrow',
  pupils: '.avatar-pupil-anim',
  mouth: '.avatar-mouth-anim',
}

// Shared timing vocabulary. SPRING overshoots (snappy reactions), SNAP_IN
// accelerates (anticipation dips), FALL is gravity, SMOOTH/DECEL are settles.
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const SNAP_IN = 'cubic-bezier(0.55, 0, 0.7, 0.3)'
const SMOOTH = 'cubic-bezier(0.45, 0, 0.55, 1)'
const DECEL = 'cubic-bezier(0.22, 1, 0.36, 1)'
const FALL = 'cubic-bezier(0.5, 0, 0.9, 0.6)'

const GROUND = '50% 100%'

export const EXPRESSIONS: Record<ExpressionName, ExpressionDef> = {
  // Barely alive: slow breath from the ground up, eyes lag half a beat behind.
  // Blink and pupil drift layer on top from the base CSS.
  idle: {
    name: 'idle',
    duration: 3.6,
    thumbOffset: 50,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, sy: 1, sx: 1 },
          { o: 50, sy: 1.015, sx: 0.994 },
          { o: 100, sy: 1, sx: 1 },
        ],
      },
      {
        target: 'eyes',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, ty: 0 },
          { o: 56, ty: -0.5 },
          { o: 100, ty: 0 },
        ],
      },
    ],
  },

  // Anticipation crouch → stretched hop → landing squash → overshoot settle.
  // Eyes arc and mouth widens ~90ms after the body peaks.
  happy: {
    name: 'happy',
    duration: 1.15,
    thumbOffset: 40,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        unit: '%',
        keyframes: [
          { o: 0, sy: 1, sx: 1, ty: 0, ease: SNAP_IN },
          { o: 12, sy: 0.88, sx: 1.09, ty: 0, ease: SPRING },
          { o: 36, sy: 1.09, sx: 0.94, ty: -15, ease: FALL },
          { o: 58, sy: 0.88, sx: 1.09, ty: 0, ease: SPRING },
          { o: 74, sy: 1.03, sx: 0.985, ty: 0, ease: SMOOTH },
          { o: 100, sy: 1, sx: 1, ty: 0 },
        ],
      },
      {
        target: 'eyes',
        origin: GROUND,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 1 },
          { o: 28, sy: 1 },
          { o: 44, sy: 0.62 },
          { o: 66, sy: 0.62 },
          { o: 84, sy: 1 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 20, sx: 1, sy: 1 },
          { o: 42, sx: 1.18, sy: 1.12 },
          { o: 68, sx: 1.18, sy: 1.12 },
          { o: 88, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.6, ease: SMOOTH },
      { o: 40, curvature: 1 },
      { o: 68, curvature: 1 },
      { o: 100, curvature: 0.6 },
    ],
  },

  // Whole-body lean with a tiny counter-tilt first, then a long held beat
  // (holds read as thinking). One eye grows, the other narrows, mouth "o"s.
  curious: {
    name: 'curious',
    duration: 2.8,
    thumbOffset: 50,
    tracks: [
      {
        target: 'root',
        origin: GROUND,
        unit: '%',
        keyframes: [
          { o: 0, r: 0, tx: 0, ease: SNAP_IN },
          { o: 8, r: -1.5, tx: -0.3, ease: SPRING },
          { o: 24, r: 8, tx: 1.5 },
          { o: 72, r: 8, tx: 1.5, ease: SMOOTH },
          { o: 90, r: 0, tx: 0 },
          { o: 100, r: 0, tx: 0 },
        ],
      },
      {
        target: 'eyeL',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 24, sx: 1, sy: 1, ease: SPRING },
          { o: 36, sx: 1.28, sy: 1.28 },
          { o: 70, sx: 1.28, sy: 1.28, ease: SMOOTH },
          { o: 86, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        target: 'eyeR',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 24, sx: 1, sy: 1, ease: SPRING },
          { o: 36, sx: 0.86, sy: 0.86 },
          { o: 70, sx: 0.86, sy: 0.86, ease: SMOOTH },
          { o: 86, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        target: 'pupils',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, tx: 0 },
          { o: 26, tx: 0 },
          { o: 38, tx: 18 },
          { o: 70, tx: 18 },
          { o: 86, tx: 0 },
          { o: 100, tx: 0 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 24, sx: 1, sy: 1, ease: SPRING },
          { o: 36, sx: 0.72, sy: 0.85 },
          { o: 70, sx: 0.72, sy: 0.85, ease: SMOOTH },
          { o: 86, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.3, ease: SMOOTH },
      { o: 36, curvature: 0.05 },
      { o: 70, curvature: 0.05 },
      { o: 100, curvature: 0.3 },
    ],
  },

  // Sharp stomp and a readable glare. The eyes remain large; dedicated brows
  // carry the anger instead of crushing the eyeballs into tiny white slits.
  angry: {
    name: 'angry',
    duration: 1.5,
    thumbOffset: 35,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        keyframes: [
          { o: 0, sy: 1, sx: 1, ease: SNAP_IN },
          { o: 10, sy: 0.9, sx: 1.1, ease: 'linear' },
          { o: 70, sy: 0.9, sx: 1.1, ease: SMOOTH },
          { o: 90, sy: 1, sx: 1 },
          { o: 100, sy: 1, sx: 1 },
        ],
      },
      {
        target: 'root',
        ease: 'linear',
        unit: '%',
        keyframes: [
          { o: 0, tx: 0 },
          { o: 10, tx: 0 },
          { o: 14, tx: -1.2 },
          { o: 18, tx: 1.2 },
          { o: 22, tx: -1 },
          { o: 26, tx: 1 },
          { o: 30, tx: -0.6 },
          { o: 34, tx: 0.6 },
          { o: 38, tx: 0 },
          { o: 100, tx: 0 },
        ],
      },
      {
        target: 'eyeL',
        origin: '50% 50%',
        keyframes: [
          { o: 0, sy: 1, r: 0, ease: SNAP_IN },
          { o: 10, sx: 1.04, sy: 0.84, r: 4, ease: SPRING },
          { o: 70, sx: 1.04, sy: 0.84, r: 4, ease: SMOOTH },
          { o: 90, sy: 1, r: 0 },
          { o: 100, sy: 1, r: 0 },
        ],
      },
      {
        target: 'eyeR',
        origin: '50% 50%',
        keyframes: [
          { o: 0, sy: 1, r: 0, ease: SNAP_IN },
          { o: 10, sx: 1.04, sy: 0.84, r: -4, ease: SPRING },
          { o: 70, sx: 1.04, sy: 0.84, r: -4, ease: SMOOTH },
          { o: 90, sy: 1, r: 0 },
          { o: 100, sy: 1, r: 0 },
        ],
      },
      {
        target: 'browL',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0, r: 0 },
          { o: 8, opacity: 0, r: 0, ease: SPRING },
          { o: 14, opacity: 1, r: 16 },
          { o: 70, opacity: 1, r: 16 },
          { o: 88, opacity: 0, r: 0 },
          { o: 100, opacity: 0, r: 0 },
        ],
      },
      {
        target: 'browR',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0, r: 0 },
          { o: 8, opacity: 0, r: 0, ease: SPRING },
          { o: 14, opacity: 1, r: -16 },
          { o: 70, opacity: 1, r: -16 },
          { o: 88, opacity: 0, r: 0 },
          { o: 100, opacity: 0, r: 0 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, ease: SNAP_IN },
          { o: 10, sx: 0.85, ease: 'linear' },
          { o: 70, sx: 0.85, ease: SMOOTH },
          { o: 90, sx: 1 },
          { o: 100, sx: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: -0.1, ease: SNAP_IN },
      { o: 10, curvature: -0.95 },
      { o: 70, curvature: -0.95, ease: SMOOTH },
      { o: 90, curvature: -0.1 },
      { o: 100, curvature: -0.1 },
    ],
    // Red flush rises with the stomp, holds through the glare, drains on release.
    flush: {
      color: '#d64545',
      keyframes: [
        { o: 0, amount: 0, ease: SNAP_IN },
        { o: 10, amount: 0.5 },
        { o: 70, amount: 0.5, ease: SMOOTH },
        { o: 90, amount: 0 },
        { o: 100, amount: 0 },
      ],
    },
    props: [
      {
        id: 'steam1',
        shape: 'puff',
        x: -0.62,
        y: -1.12,
        size: 0.2,
        color: '#d8dde6',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.4, sy: 0.4, ty: 0, opacity: 0 },
          { o: 12, sx: 0.4, sy: 0.4, ty: 0, opacity: 0, ease: SPRING },
          { o: 22, sx: 0.9, sy: 0.9, ty: -2, opacity: 0.85 },
          { o: 45, sx: 1.3, sy: 1.3, ty: -7, tx: -1, opacity: 0.5 },
          { o: 58, sx: 1.5, sy: 1.5, ty: -10, tx: -1.5, opacity: 0 },
          { o: 100, sx: 1.5, sy: 1.5, ty: -10, tx: -1.5, opacity: 0 },
        ],
      },
      {
        id: 'steam2',
        shape: 'puff',
        x: 0.62,
        y: -1.12,
        size: 0.17,
        color: '#d8dde6',
        minIntensity: 0.35,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.4, sy: 0.4, ty: 0, opacity: 0 },
          { o: 26, sx: 0.4, sy: 0.4, ty: 0, opacity: 0, ease: SPRING },
          { o: 36, sx: 0.9, sy: 0.9, ty: -2, opacity: 0.85 },
          { o: 56, sx: 1.3, sy: 1.3, ty: -7, tx: 1, opacity: 0.5 },
          { o: 68, sx: 1.5, sy: 1.5, ty: -10, tx: 1.5, opacity: 0 },
          { o: 100, sx: 1.5, sy: 1.5, ty: -10, tx: 1.5, opacity: 0 },
        ],
      },
    ],
  },

  // "?" energy: irregular wobble timing, asymmetric eye squash, mouth
  // drifting small and off-centre. Deliberately not a clean rhythm.
  confused: {
    name: 'confused',
    duration: 3.4,
    thumbOffset: 30,
    tracks: [
      {
        target: 'root',
        origin: GROUND,
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, r: 0, tx: 0 },
          { o: 18, r: 5, tx: 0.8 },
          { o: 38, r: -3.5, tx: -0.6 },
          { o: 62, r: 6, tx: 1 },
          { o: 82, r: -2, tx: -0.4 },
          { o: 100, r: 0, tx: 0 },
        ],
      },
      {
        target: 'eyeL',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 1 },
          { o: 20, sy: 1.2 },
          { o: 45, sy: 0.95 },
          { o: 65, sy: 1.15 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'eyeR',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 1 },
          { o: 22, sx: 0.94, sy: 0.78 },
          { o: 48, sy: 1.05 },
          { o: 68, sx: 0.96, sy: 0.82 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'browL',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0, r: 0 },
          { o: 18, opacity: 0.8, r: -8 },
          { o: 48, opacity: 0.25, r: 5 },
          { o: 68, opacity: 0.75, r: -6 },
          { o: 100, opacity: 0, r: 0 },
        ],
      },
      {
        target: 'browR',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0, r: 0 },
          { o: 18, opacity: 0.35, r: 7 },
          { o: 48, opacity: 0.8, r: -5 },
          { o: 68, opacity: 0.3, r: 8 },
          { o: 100, opacity: 0, r: 0 },
        ],
      },
      {
        target: 'pupils',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, tx: -20 },
          { o: 25, tx: 15 },
          { o: 55, tx: -10 },
          { o: 80, tx: 20 },
          { o: 100, tx: -20 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, tx: -2, r: -5, sx: 0.8 },
          { o: 40, tx: 1.6, r: 6, sx: 0.75 },
          { o: 75, tx: -1.2, r: -4, sx: 0.8 },
          { o: 100, tx: -2, r: -5, sx: 0.8 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: -0.15, ease: SMOOTH },
      { o: 30, curvature: 0.2 },
      { o: 55, curvature: -0.25 },
      { o: 78, curvature: 0.1 },
      { o: 100, curvature: -0.15 },
    ],
  },

  // Everything droops: body settles down and deflates, lids fall from the
  // top, gaze drops, very slow breathing with a bottom-lip quiver.
  sad: {
    name: 'sad',
    duration: 4.6,
    thumbOffset: 50,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, ty: 4.5, sy: 0.95, sx: 1.025, r: -1.5 },
          { o: 50, ty: 5.5, sy: 0.93, sx: 1.04, r: -2 },
          { o: 100, ty: 4.5, sy: 0.95, sx: 1.025, r: -1.5 },
        ],
      },
      {
        target: 'eyes',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, ty: 1 },
          { o: 50, ty: 1.2 },
          { o: 100, ty: 1 },
        ],
      },
      {
        target: 'eyeOpen',
        origin: '50% 0%',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 0.82 },
          { o: 50, sy: 0.76 },
          { o: 100, sy: 0.82 },
        ],
      },
      {
        target: 'browL',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0.65, r: -10, ty: 1 },
          { o: 50, opacity: 0.8, r: -12, ty: 1.5 },
          { o: 100, opacity: 0.65, r: -10, ty: 1 },
        ],
      },
      {
        target: 'browR',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0.65, r: 10, ty: 1 },
          { o: 50, opacity: 0.8, r: 12, ty: 1.5 },
          { o: 100, opacity: 0.65, r: 10, ty: 1 },
        ],
      },
      {
        target: 'pupils',
        unit: '%',
        keyframes: [
          { o: 0, ty: 22 },
          { o: 100, ty: 22 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, ty: 0.8, sx: 0.85 },
          { o: 50, ty: 1, sx: 0.85 },
          { o: 100, ty: 0.8, sx: 0.85 },
        ],
      },
    ],
    // Bottom-lip quiver mid-cycle.
    morph: [
      { o: 0, curvature: -1 },
      { o: 42, curvature: -0.8 },
      { o: 48, curvature: -1 },
      { o: 54, curvature: -0.82 },
      { o: 60, curvature: -1 },
      { o: 100, curvature: -1 },
    ],
  },

  // ~110ms lean-in, then a sharp stretched recoil up and back, eyes popping
  // just after the body, a tremble on the settle, long held stare, release.
  surprised: {
    name: 'surprised',
    duration: 1.6,
    thumbOffset: 22,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        unit: '%',
        keyframes: [
          { o: 0, ty: 0, tx: 0, sy: 1, sx: 1, r: 0, ease: SNAP_IN },
          { o: 7, ty: 0.8, tx: 0, sy: 0.94, sx: 1.06, r: 0, ease: SPRING },
          { o: 17, ty: -9, tx: -1.5, sy: 1.12, sx: 0.92, r: 0, ease: SMOOTH },
          { o: 24, ty: -6.5, tx: -1, sy: 1.04, sx: 0.98, r: 1.5 },
          { o: 32, ty: -6.8, tx: -1, sy: 1.04, sx: 0.98, r: -1.2 },
          { o: 40, ty: -6.5, tx: -1, sy: 1.04, sx: 0.98, r: 0.8 },
          { o: 48, ty: -6.6, tx: -1, sy: 1.04, sx: 0.98, r: 0 },
          { o: 74, ty: -6.6, tx: -1, sy: 1.04, sx: 0.98, r: 0, ease: DECEL },
          { o: 92, ty: 0, tx: 0, sy: 1, sx: 1, r: 0 },
          { o: 100, ty: 0, tx: 0, sy: 1, sx: 1, r: 0 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sx: 1, sy: 1, ease: SNAP_IN },
          { o: 8, sx: 1, sy: 0.85, ease: SPRING },
          { o: 20, sx: 1.42, sy: 1.42 },
          { o: 76, sx: 1.42, sy: 1.42, ease: SMOOTH },
          { o: 90, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        // Pupils shrink to pinpricks — classic shock.
        target: 'pupils',
        keyframes: [
          { o: 0, sx: 1, sy: 1, ease: SNAP_IN },
          { o: 20, sx: 0.72, sy: 0.72 },
          { o: 76, sx: 0.72, sy: 0.72, ease: SMOOTH },
          { o: 90, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, sy: 1, ease: SNAP_IN },
          { o: 9, sx: 0.8, sy: 0.8, ease: SPRING },
          { o: 22, sx: 0.72, sy: 1.7 },
          { o: 76, sx: 0.72, sy: 1.7, ease: SMOOTH },
          { o: 90, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    // Snaps into a gasp "o" and holds it.
    morph: [
      { o: 0, curvature: -0.05, ease: SNAP_IN },
      { o: 22, curvature: -0.6 },
      { o: 76, curvature: -0.55, ease: SMOOTH },
      { o: 90, curvature: -0.05 },
      { o: 100, curvature: -0.05 },
    ],
    // Sparkles pop with the recoil, twinkle through the stare, fade on release.
    props: [
      {
        id: 'spark1',
        shape: 'sparkle',
        x: -0.95,
        y: -0.75,
        size: 0.14,
        color: '#f6c344',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.2, sy: 0.2, r: 0, opacity: 0 },
          { o: 16, sx: 0.2, sy: 0.2, r: 0, opacity: 0, ease: SPRING },
          { o: 25, sx: 1.1, sy: 1.1, r: 20, opacity: 1 },
          { o: 50, sx: 0.85, sy: 0.85, r: 45, opacity: 0.75 },
          { o: 72, sx: 1, sy: 1, r: 65, opacity: 0.9 },
          { o: 86, sx: 0.4, sy: 0.4, r: 80, opacity: 0 },
          { o: 100, sx: 0.4, sy: 0.4, r: 80, opacity: 0 },
        ],
      },
      {
        id: 'spark2',
        shape: 'sparkle',
        x: 0.85,
        y: -1.05,
        size: 0.11,
        color: '#f6c344',
        minIntensity: 0.25,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.2, sy: 0.2, r: 0, opacity: 0 },
          { o: 20, sx: 0.2, sy: 0.2, r: 0, opacity: 0, ease: SPRING },
          { o: 29, sx: 1.1, sy: 1.1, r: -25, opacity: 1 },
          { o: 54, sx: 0.8, sy: 0.8, r: -50, opacity: 0.7 },
          { o: 74, sx: 1, sy: 1, r: -70, opacity: 0.85 },
          { o: 88, sx: 0.4, sy: 0.4, r: -85, opacity: 0 },
          { o: 100, sx: 0.4, sy: 0.4, r: -85, opacity: 0 },
        ],
      },
      {
        id: 'spark3',
        shape: 'sparkle',
        x: -0.3,
        y: -1.35,
        size: 0.09,
        color: '#fbd97a',
        minIntensity: 0.55,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.2, sy: 0.2, r: 0, opacity: 0 },
          { o: 24, sx: 0.2, sy: 0.2, r: 0, opacity: 0, ease: SPRING },
          { o: 33, sx: 1.1, sy: 1.1, r: 30, opacity: 0.95 },
          { o: 58, sx: 0.85, sy: 0.85, r: 55, opacity: 0.7 },
          { o: 84, sx: 0.4, sy: 0.4, r: 75, opacity: 0 },
          { o: 100, sx: 0.4, sy: 0.4, r: 75, opacity: 0 },
        ],
      },
    ],
  },

  // Long pendulum sway with two genuine slow blinks. Open eyes stay readable
  // while drowsy; at each closure they cross-fade to a drawn eyelid line.
  sleepy: {
    name: 'sleepy',
    duration: 5.2,
    thumbOffset: 71,
    ownsEyes: true,
    tracks: [
      {
        target: 'root',
        origin: GROUND,
        ease: SMOOTH,
        keyframes: [
          { o: 0, r: -2.5 },
          { o: 50, r: 2.5 },
          { o: 100, r: -2.5 },
        ],
      },
      {
        target: 'squash',
        origin: GROUND,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 1, sx: 1 },
          { o: 42, sy: 1.03, sx: 0.99 },
          { o: 100, sy: 1, sx: 1 },
        ],
      },
      {
        target: 'eyeOpen',
        origin: '50% 0%',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 0.66, opacity: 1 },
          { o: 14, sy: 0.58, opacity: 1 },
          { o: 20, sy: 0.28, opacity: 0.2 },
          { o: 23, sy: 0.2, opacity: 0 },
          { o: 29, sy: 0.56, opacity: 1 },
          { o: 48, sy: 0.7, opacity: 1 },
          { o: 62, sy: 0.56, opacity: 1 },
          { o: 68, sy: 0.26, opacity: 0.15 },
          { o: 71, sy: 0.2, opacity: 0 },
          { o: 79, sy: 0.58, opacity: 1 },
          { o: 100, sy: 0.66, opacity: 1 },
        ],
      },
      {
        target: 'eyeClosed',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0 },
          { o: 18, opacity: 0 },
          { o: 22, opacity: 1 },
          { o: 25, opacity: 1 },
          { o: 30, opacity: 0 },
          { o: 66, opacity: 0 },
          { o: 70, opacity: 1 },
          { o: 73, opacity: 1 },
          { o: 80, opacity: 0 },
          { o: 100, opacity: 0 },
        ],
      },
      {
        target: 'pupils',
        unit: '%',
        keyframes: [
          { o: 0, ty: 18 },
          { o: 100, ty: 18 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.7, sy: 0.8 },
          { o: 42, sx: 0.76, sy: 0.8 },
          { o: 100, sx: 0.7, sy: 0.8 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.1 },
      { o: 100, curvature: 0.1 },
    ],
    // Zzz drift up and away from the head, one after another.
    props: [
      {
        id: 'z1',
        shape: 'zzz',
        x: 0.72,
        y: -0.95,
        size: 0.13,
        color: '#8b95ab',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.6, sy: 0.6, tx: 0, ty: 0, opacity: 0 },
          { o: 8, sx: 0.7, sy: 0.7, tx: 0.5, ty: -1.5, opacity: 0.8 },
          { o: 30, sx: 1, sy: 1, tx: 2, ty: -6, opacity: 0.7 },
          { o: 46, sx: 1.1, sy: 1.1, tx: 3.2, ty: -10, opacity: 0 },
          { o: 100, sx: 1.1, sy: 1.1, tx: 3.2, ty: -10, opacity: 0 },
        ],
      },
      {
        id: 'z2',
        shape: 'zzz',
        x: 0.9,
        y: -1.18,
        size: 0.17,
        color: '#8b95ab',
        minIntensity: 0.3,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.6, sy: 0.6, tx: 0, ty: 0, opacity: 0 },
          { o: 28, sx: 0.6, sy: 0.6, tx: 0, ty: 0, opacity: 0 },
          { o: 38, sx: 0.75, sy: 0.75, tx: 0.6, ty: -1.8, opacity: 0.8 },
          { o: 60, sx: 1.05, sy: 1.05, tx: 2.4, ty: -6.5, opacity: 0.65 },
          { o: 76, sx: 1.15, sy: 1.15, tx: 3.6, ty: -10.5, opacity: 0 },
          { o: 100, sx: 1.15, sy: 1.15, tx: 3.6, ty: -10.5, opacity: 0 },
        ],
      },
      {
        id: 'z3',
        shape: 'zzz',
        x: 1.12,
        y: -1.45,
        size: 0.21,
        color: '#8b95ab',
        minIntensity: 0.65,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.6, sy: 0.6, tx: 0, ty: 0, opacity: 0 },
          { o: 52, sx: 0.6, sy: 0.6, tx: 0, ty: 0, opacity: 0 },
          { o: 62, sx: 0.8, sy: 0.8, tx: 0.7, ty: -2, opacity: 0.75 },
          { o: 82, sx: 1.1, sy: 1.1, tx: 2.6, ty: -7, opacity: 0.55 },
          { o: 96, sx: 1.2, sy: 1.2, tx: 3.8, ty: -11, opacity: 0 },
          { o: 100, sx: 1.2, sy: 1.2, tx: 3.8, ty: -11, opacity: 0 },
        ],
      },
    ],
  },

  // Heartbeat: two quick soft beats then a rest, riding a gentle upward
  // float. Real curved smile-eyes replace the old flattened white ovals.
  love: {
    name: 'love',
    duration: 1.9,
    thumbOffset: 26,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, sx: 1, sy: 1, ty: 0, ease: SPRING },
          { o: 8, sx: 1.06, sy: 1.06, ty: -0.6 },
          { o: 16, sx: 1, sy: 1, ty: -1, ease: SPRING },
          { o: 24, sx: 1.08, sy: 1.08, ty: -1.4 },
          { o: 34, sx: 1, sy: 1, ty: -1.8 },
          { o: 55, sx: 1, sy: 1, ty: -2.2 },
          { o: 100, sx: 1, sy: 1, ty: 0 },
        ],
      },
      {
        target: 'eyeOpen',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 1, sy: 1 },
          { o: 10, opacity: 0.15, sy: 0.72 },
          { o: 14, opacity: 0, sy: 0.65 },
          { o: 58, opacity: 0, sy: 0.65 },
          { o: 76, opacity: 1, sy: 1 },
          { o: 100, opacity: 1, sy: 1 },
        ],
      },
      {
        target: 'eyeSmile',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0, sx: 0.9, sy: 0.9 },
          { o: 10, opacity: 0.85, sx: 1.06, sy: 1.06, ease: SPRING },
          { o: 14, opacity: 1, sx: 1, sy: 1 },
          { o: 58, opacity: 1, sx: 1, sy: 1 },
          { o: 76, opacity: 0, sx: 0.92, sy: 0.92 },
          { o: 100, opacity: 0, sx: 0.92, sy: 0.92 },
        ],
      },
      {
        target: 'pupils',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1.35, sy: 1.35, ease: SPRING },
          { o: 8, sx: 1.55, sy: 1.55 },
          { o: 16, sx: 1.35, sy: 1.35, ease: SPRING },
          { o: 24, sx: 1.6, sy: 1.6 },
          { o: 40, sx: 1.35, sy: 1.35 },
          { o: 100, sx: 1.35, sy: 1.35 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 10, sx: 1.1, sy: 1.08 },
          { o: 26, sx: 1.14, sy: 1.1 },
          { o: 50, sx: 1.05, sy: 1.03 },
          { o: 80, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.75, ease: SMOOTH },
      { o: 25, curvature: 1 },
      { o: 55, curvature: 0.9 },
      { o: 100, curvature: 0.75 },
    ],
    // Hearts bloom on the beats and float away.
    props: [
      {
        id: 'heart1',
        shape: 'heart',
        x: -0.55,
        y: -1.05,
        size: 0.2,
        color: '#ec6a8c',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.3, sy: 0.3, ty: 0, tx: 0, opacity: 0, ease: SPRING },
          { o: 10, sx: 1, sy: 1, ty: -3, tx: -0.5, opacity: 0.9 },
          { o: 32, sx: 1.05, sy: 1.05, ty: -10, tx: 1, r: 8, opacity: 0.8 },
          { o: 52, sx: 1.1, sy: 1.1, ty: -18, tx: -0.5, r: -6, opacity: 0 },
          { o: 100, sx: 1.1, sy: 1.1, ty: -18, tx: -0.5, r: -6, opacity: 0 },
        ],
      },
      {
        id: 'heart2',
        shape: 'heart',
        x: 0.6,
        y: -0.9,
        size: 0.14,
        color: '#f28ca8',
        minIntensity: 0.25,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.3, sy: 0.3, ty: 0, tx: 0, opacity: 0 },
          { o: 22, sx: 0.3, sy: 0.3, ty: 0, tx: 0, opacity: 0, ease: SPRING },
          { o: 32, sx: 1, sy: 1, ty: -3, tx: 0.8, opacity: 0.85 },
          { o: 55, sx: 1.05, sy: 1.05, ty: -11, tx: -0.8, r: -10, opacity: 0.7 },
          { o: 76, sx: 1.1, sy: 1.1, ty: -19, tx: 0.5, r: 6, opacity: 0 },
          { o: 100, sx: 1.1, sy: 1.1, ty: -19, tx: 0.5, r: 6, opacity: 0 },
        ],
      },
      {
        id: 'heart3',
        shape: 'heart',
        x: 0.05,
        y: -1.3,
        size: 0.1,
        color: '#f6a8bd',
        minIntensity: 0.6,
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 0.3, sy: 0.3, ty: 0, tx: 0, opacity: 0 },
          { o: 44, sx: 0.3, sy: 0.3, ty: 0, tx: 0, opacity: 0, ease: SPRING },
          { o: 54, sx: 1, sy: 1, ty: -3, tx: 0.4, opacity: 0.8 },
          { o: 74, sx: 1.05, sy: 1.05, ty: -10, tx: -0.6, r: 9, opacity: 0.6 },
          { o: 92, sx: 1.1, sy: 1.1, ty: -17, tx: 0.3, r: -5, opacity: 0 },
          { o: 100, sx: 1.1, sy: 1.1, ty: -17, tx: 0.3, r: -5, opacity: 0 },
        ],
      },
    ],
  },

  // Rapid full-body shake with strong squash-stretch and a slight rock.
  // Proper smile-eye strokes sell the laugh without leaving white slits.
  laughing: {
    name: 'laughing',
    duration: 0.55,
    thumbOffset: 25,
    ownsEyes: true,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, sy: 1, sx: 1, ty: 0 },
          { o: 22, sy: 0.84, sx: 1.12, ty: 0 },
          { o: 50, sy: 1.08, sx: 0.94, ty: -2.5 },
          { o: 72, sy: 0.86, sx: 1.1, ty: 0 },
          { o: 100, sy: 1, sx: 1, ty: 0 },
        ],
      },
      {
        target: 'root',
        origin: GROUND,
        ease: SMOOTH,
        keyframes: [
          { o: 0, r: -1 },
          { o: 50, r: 1.2 },
          { o: 100, r: -1 },
        ],
      },
      {
        target: 'eyeOpen',
        keyframes: [
          { o: 0, opacity: 0 },
          { o: 100, opacity: 0 },
        ],
      },
      {
        target: 'eyeSmile',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, opacity: 1, sx: 1.04, sy: 1, ty: 0 },
          { o: 50, opacity: 1, sx: 1.12, sy: 1.08, ty: -1 },
          { o: 100, opacity: 1, sx: 1.04, sy: 1, ty: 0 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sx: 1.25, sy: 1.15 },
          { o: 34, sx: 1.3, sy: 1.45 },
          { o: 62, sx: 1.22, sy: 1.1 },
          { o: 100, sx: 1.25, sy: 1.15 },
        ],
      },
    ],
    // Opens and closes with each "ha".
    morph: [
      { o: 0, curvature: 1, ease: SMOOTH },
      { o: 50, curvature: 0.7 },
      { o: 100, curvature: 1 },
    ],
  },

  // One eye widens a touch, then snaps shut while the body tilts toward the
  // winking side and the mouth smirks off-centre. Reopens with an overshoot.
  wink: {
    name: 'wink',
    duration: 1.3,
    thumbOffset: 35,
    ownsEyes: true,
    tracks: [
      {
        target: 'eyeROpen',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 1, opacity: 1 },
          { o: 12, sy: 1.08, opacity: 1, ease: SNAP_IN },
          { o: 18, sy: 0.3, opacity: 0.2 },
          { o: 21, sy: 0.2, opacity: 0 },
          { o: 58, sy: 0.2, opacity: 0, ease: SPRING },
          { o: 68, sy: 1.08, opacity: 1 },
          { o: 82, sy: 1, opacity: 1 },
          { o: 100, sy: 1, opacity: 1 },
        ],
      },
      {
        target: 'eyeRClosed',
        ease: SMOOTH,
        keyframes: [
          { o: 0, opacity: 0, sx: 0.9 },
          { o: 17, opacity: 0, sx: 0.9, ease: SPRING },
          { o: 21, opacity: 1, sx: 1.08 },
          { o: 58, opacity: 1, sx: 1.08 },
          { o: 68, opacity: 0, sx: 0.92 },
          { o: 100, opacity: 0, sx: 0.92 },
        ],
      },
      {
        target: 'eyeL',
        ease: SMOOTH,
        keyframes: [
          { o: 0, sy: 1 },
          { o: 16, sy: 0.92 },
          { o: 58, sy: 0.92 },
          { o: 72, sy: 1 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'root',
        origin: GROUND,
        unit: '%',
        keyframes: [
          { o: 0, r: 0, tx: 0, ease: SNAP_IN },
          { o: 10, r: -1.2, tx: -0.2, ease: SPRING },
          { o: 22, r: 4, tx: 0.8 },
          { o: 58, r: 4, tx: 0.8, ease: SMOOTH },
          { o: 72, r: -0.5, tx: 0 },
          { o: 84, r: 0, tx: 0 },
          { o: 100, r: 0, tx: 0 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        unit: '%',
        keyframes: [
          { o: 0, tx: 0, r: 0, sx: 1 },
          { o: 14, tx: 0, r: 0, sx: 1, ease: SPRING },
          { o: 24, tx: 1, r: -7, sx: 1.12 },
          { o: 58, tx: 1, r: -7, sx: 1.12, ease: SMOOTH },
          { o: 76, tx: 0, r: 0, sx: 1 },
          { o: 100, tx: 0, r: 0, sx: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.6, ease: SMOOTH },
      { o: 24, curvature: 0.95 },
      { o: 58, curvature: 0.95 },
      { o: 80, curvature: 0.6 },
      { o: 100, curvature: 0.6 },
    ],
  },

  // Body orbits a small circle (continuous, so linear is correct); eyes
  // counter-rotate against it while the pupils orbit the opposite way.
  dizzy: {
    name: 'dizzy',
    duration: 2.4,
    thumbOffset: 30,
    ownsEyes: true,
    tracks: [
      {
        target: 'squash',
        origin: GROUND,
        ease: 'linear',
        unit: '%',
        keyframes: [
          { o: 0, tx: 2.5, ty: 0, r: 5 },
          { o: 12.5, tx: 1.8, ty: 0.9, r: 3.5 },
          { o: 25, tx: 0, ty: 1.3, r: 0 },
          { o: 37.5, tx: -1.8, ty: 0.9, r: -3.5 },
          { o: 50, tx: -2.5, ty: 0, r: -5 },
          { o: 62.5, tx: -1.8, ty: -0.9, r: -3.5 },
          { o: 75, tx: 0, ty: -1.3, r: 0 },
          { o: 87.5, tx: 1.8, ty: -0.9, r: 3.5 },
          { o: 100, tx: 2.5, ty: 0, r: 5 },
        ],
      },
      {
        target: 'eyes',
        ease: 'linear',
        keyframes: [
          { o: 0, r: -10, sy: 0.85 },
          { o: 25, r: 0, sy: 0.85 },
          { o: 50, r: 10, sy: 0.85 },
          { o: 75, r: 0, sy: 0.85 },
          { o: 100, r: -10, sy: 0.85 },
        ],
      },
      {
        target: 'pupils',
        ease: 'linear',
        unit: '%',
        keyframes: [
          { o: 0, tx: -25, ty: 0 },
          { o: 25, tx: 0, ty: -25 },
          { o: 50, tx: 25, ty: 0 },
          { o: 75, tx: 0, ty: 25 },
          { o: 100, tx: -25, ty: 0 },
        ],
      },
      {
        target: 'mouth',
        ease: SMOOTH,
        keyframes: [
          { o: 0, r: -8, sx: 0.85 },
          { o: 25, r: 6, sx: 0.85 },
          { o: 50, r: -7, sx: 0.85 },
          { o: 75, r: 7, sx: 0.85 },
          { o: 100, r: -8, sx: 0.85 },
        ],
      },
    ],
    // Wobbles between queasy frown and grimace.
    morph: [
      { o: 0, curvature: -0.3, ease: SMOOTH },
      { o: 35, curvature: 0.15 },
      { o: 65, curvature: -0.25 },
      { o: 100, curvature: -0.3 },
    ],
    // Stars orbit the head in opposite phases, spinning as they go. They dip
    // to zero at the loop seam so the wrap reads as a twinkle, not a pop.
    props: [
      {
        id: 'star1',
        shape: 'star',
        x: 0,
        y: -1.28,
        size: 0.16,
        color: '#f6c344',
        ease: 'linear',
        keyframes: [
          { o: 0, tx: 42, ty: 0, r: 0, opacity: 0 },
          { o: 12.5, tx: 30, ty: 4.5, r: -45, opacity: 0.9 },
          { o: 25, tx: 0, ty: 6.5, r: -90, opacity: 0.9 },
          { o: 37.5, tx: -30, ty: 4.5, r: -135, opacity: 0.9 },
          { o: 50, tx: -42, ty: 0, r: -180, opacity: 0.9 },
          { o: 62.5, tx: -30, ty: -4.5, r: -225, opacity: 0.9 },
          { o: 75, tx: 0, ty: -6.5, r: -270, opacity: 0.9 },
          { o: 87.5, tx: 30, ty: -4.5, r: -315, opacity: 0.9 },
          { o: 100, tx: 42, ty: 0, r: -360, opacity: 0 },
        ],
      },
      {
        id: 'star2',
        shape: 'star',
        x: 0,
        y: -1.28,
        size: 0.11,
        color: '#fbd97a',
        minIntensity: 0.35,
        ease: 'linear',
        keyframes: [
          { o: 0, tx: -42, ty: 0, r: 0, opacity: 0 },
          { o: 12.5, tx: -30, ty: -4.5, r: 45, opacity: 0.85 },
          { o: 25, tx: 0, ty: -6.5, r: 90, opacity: 0.85 },
          { o: 37.5, tx: 30, ty: -4.5, r: 135, opacity: 0.85 },
          { o: 50, tx: 42, ty: 0, r: 180, opacity: 0.85 },
          { o: 62.5, tx: 30, ty: 4.5, r: 225, opacity: 0.85 },
          { o: 75, tx: 0, ty: 6.5, r: 270, opacity: 0.85 },
          { o: 87.5, tx: -30, ty: 4.5, r: 315, opacity: 0.85 },
          { o: 100, tx: -42, ty: 0, r: 360, opacity: 0 },
        ],
      },
    ],
  },
}