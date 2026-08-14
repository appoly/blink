import type { ExpressionName } from '../types/avatar'

/**
 * Expressions are pure data: keyframed transforms on named parts of the
 * avatar, plus an optional mouth-curvature morph. The same definitions drive
 * the editor preview, the expression-card thumbnails and the exported CSS.
 */

export type TrackTarget = 'root' | 'squash' | 'eyes' | 'eyeL' | 'eyeR' | 'pupils' | 'mouth'

export interface TransformKeyframe {
  /** Offset in percent, 0–100. */
  o: number
  tx?: number
  ty?: number
  r?: number
  sx?: number
  sy?: number
}

export interface Track {
  target: TrackTarget
  /** CSS transform-origin (fill-box). */
  origin?: string
  ease?: string
  keyframes: TransformKeyframe[]
}

export interface MorphKeyframe {
  o: number
  /** Absolute target curvature, -1..1. Intensity blends from the base value. */
  curvature: number
}

export interface ExpressionDef {
  name: ExpressionName
  /** Base duration in seconds at 1× speed. */
  duration: number
  /** Percent offset used for the static thumbnail frame. */
  thumbOffset: number
  tracks: Track[]
  morph?: MorphKeyframe[]
}

export const TARGET_SELECTORS: Record<TrackTarget, string> = {
  root: '.avatar-root',
  squash: '.avatar-squash',
  eyes: '.avatar-eye-anim',
  eyeL: '.avatar-eye--left .avatar-eye-anim',
  eyeR: '.avatar-eye--right .avatar-eye-anim',
  pupils: '.avatar-pupil-anim',
  mouth: '.avatar-mouth-anim',
}

export const EXPRESSIONS: Record<ExpressionName, ExpressionDef> = {
  idle: {
    name: 'idle',
    duration: 1,
    thumbOffset: 0,
    tracks: [],
  },

  happy: {
    name: 'happy',
    duration: 1.1,
    thumbOffset: 55,
    tracks: [
      {
        target: 'squash',
        origin: '50% 100%',
        keyframes: [
          { o: 0, sy: 1, sx: 1, ty: 0 },
          { o: 25, sy: 0.9, sx: 1.06, ty: 0 },
          { o: 55, sy: 1.06, sx: 0.97, ty: -14 },
          { o: 80, sy: 0.96, sx: 1.03, ty: 0 },
          { o: 100, sy: 1, sx: 1, ty: 0 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sy: 1 },
          { o: 55, sy: 0.85 },
          { o: 100, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.85 },
      { o: 55, curvature: 1 },
      { o: 100, curvature: 0.85 },
    ],
  },

  curious: {
    name: 'curious',
    duration: 2.6,
    thumbOffset: 45,
    tracks: [
      {
        target: 'root',
        keyframes: [
          { o: 0, r: 0 },
          { o: 30, r: 8 },
          { o: 70, r: 8 },
          { o: 100, r: 0 },
        ],
      },
      {
        target: 'eyeL',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 30, sx: 1.22, sy: 1.22 },
          { o: 70, sx: 1.22, sy: 1.22 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        target: 'eyeR',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 30, sx: 0.85, sy: 0.85 },
          { o: 70, sx: 0.85, sy: 0.85 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        target: 'pupils',
        keyframes: [
          { o: 0, tx: 0 },
          { o: 30, tx: 2.5 },
          { o: 70, tx: 2.5 },
          { o: 100, tx: 0 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 30, sx: 0.8, sy: 0.9 },
          { o: 70, sx: 0.8, sy: 0.9 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.2 },
      { o: 30, curvature: 0.4 },
      { o: 70, curvature: 0.4 },
      { o: 100, curvature: 0.2 },
    ],
  },

  angry: {
    name: 'angry',
    duration: 1.6,
    thumbOffset: 30,
    tracks: [
      {
        target: 'root',
        ease: 'linear',
        keyframes: [
          { o: 0, tx: 0 },
          { o: 10, tx: -1.5 },
          { o: 20, tx: 1.5 },
          { o: 30, tx: -1 },
          { o: 40, tx: 1 },
          { o: 50, tx: 0 },
          { o: 100, tx: 0 },
        ],
      },
      {
        target: 'eyeL',
        keyframes: [
          { o: 0, sy: 0.55, r: 16 },
          { o: 50, sy: 0.5, r: 18 },
          { o: 100, sy: 0.55, r: 16 },
        ],
      },
      {
        target: 'eyeR',
        keyframes: [
          { o: 0, sy: 0.55, r: -16 },
          { o: 50, sy: 0.5, r: -18 },
          { o: 100, sy: 0.55, r: -16 },
        ],
      },
      {
        // Gritted-teeth twitch in time with the shake.
        target: 'mouth',
        ease: 'linear',
        keyframes: [
          { o: 0, sx: 1 },
          { o: 10, sx: 0.86 },
          { o: 20, sx: 1 },
          { o: 30, sx: 0.9 },
          { o: 40, sx: 1 },
          { o: 100, sx: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: -0.85 },
      { o: 100, curvature: -0.85 },
    ],
  },

  confused: {
    name: 'confused',
    duration: 3,
    thumbOffset: 50,
    tracks: [
      {
        target: 'root',
        keyframes: [
          { o: 0, r: 0 },
          { o: 25, r: 5 },
          { o: 75, r: -5 },
          { o: 100, r: 0 },
        ],
      },
      {
        target: 'eyeL',
        keyframes: [
          { o: 0, sy: 1 },
          { o: 50, sy: 1.18 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'eyeR',
        keyframes: [
          { o: 0, sy: 1 },
          { o: 50, sy: 0.68 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'pupils',
        keyframes: [
          { o: 0, tx: -3 },
          { o: 50, tx: 3 },
          { o: 100, tx: -3 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, r: -5 },
          { o: 50, r: 5 },
          { o: 100, r: -5 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: -0.15 },
      { o: 50, curvature: 0.2 },
      { o: 100, curvature: -0.15 },
    ],
  },

  sad: {
    name: 'sad',
    duration: 3.2,
    thumbOffset: 50,
    tracks: [
      {
        target: 'root',
        keyframes: [
          { o: 0, ty: 2, r: -1 },
          { o: 50, ty: 7, r: -2.5 },
          { o: 100, ty: 2, r: -1 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sy: 0.8, ty: 2 },
          { o: 50, sy: 0.72, ty: 3 },
          { o: 100, sy: 0.8, ty: 2 },
        ],
      },
      {
        target: 'pupils',
        keyframes: [
          { o: 0, ty: 2.5 },
          { o: 100, ty: 2.5 },
        ],
      },
    ],
    // Bottom-lip quiver.
    morph: [
      { o: 0, curvature: -1 },
      { o: 42, curvature: -0.78 },
      { o: 50, curvature: -1 },
      { o: 58, curvature: -0.78 },
      { o: 66, curvature: -1 },
      { o: 100, curvature: -1 },
    ],
  },

  surprised: {
    name: 'surprised',
    duration: 1.4,
    thumbOffset: 25,
    tracks: [
      {
        target: 'squash',
        origin: '50% 100%',
        keyframes: [
          { o: 0, sy: 1, sx: 1 },
          { o: 15, sy: 1.08, sx: 0.95 },
          { o: 40, sy: 1.05, sx: 0.97 },
          { o: 70, sy: 1, sx: 1 },
          { o: 100, sy: 1, sx: 1 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 15, sx: 1.35, sy: 1.35 },
          { o: 55, sx: 1.3, sy: 1.3 },
          { o: 90, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 15, sx: 1.35, sy: 1.5 },
          { o: 55, sx: 1.3, sy: 1.45 },
          { o: 90, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    // Drops into a little gasp "o" then recovers.
    morph: [
      { o: 0, curvature: -0.05 },
      { o: 15, curvature: -0.4 },
      { o: 55, curvature: -0.35 },
      { o: 90, curvature: -0.05 },
      { o: 100, curvature: -0.05 },
    ],
  },

  sleepy: {
    name: 'sleepy',
    duration: 4.2,
    thumbOffset: 50,
    tracks: [
      {
        target: 'root',
        keyframes: [
          { o: 0, r: 0, ty: 0 },
          { o: 50, r: 2.5, ty: 3 },
          { o: 100, r: 0, ty: 0 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sy: 0.38 },
          { o: 50, sy: 0.28 },
          { o: 100, sy: 0.38 },
        ],
      },
      {
        target: 'pupils',
        keyframes: [
          { o: 0, ty: 2 },
          { o: 100, ty: 2 },
        ],
      },
      {
        // Slow yawn.
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 40, sx: 1.25, sy: 1.4 },
          { o: 60, sx: 1.25, sy: 1.4 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.15 },
      { o: 40, curvature: -0.25 },
      { o: 60, curvature: -0.25 },
      { o: 100, curvature: 0.15 },
    ],
  },

  love: {
    name: 'love',
    duration: 1.6,
    thumbOffset: 30,
    tracks: [
      {
        target: 'squash',
        origin: '50% 100%',
        keyframes: [
          { o: 0, r: -2 },
          { o: 50, r: 2 },
          { o: 100, r: -2 },
        ],
      },
      {
        target: 'pupils',
        keyframes: [
          { o: 0, sx: 1.3, sy: 1.3 },
          { o: 30, sx: 1.6, sy: 1.6 },
          { o: 60, sx: 1.3, sy: 1.3 },
          { o: 100, sx: 1.3, sy: 1.3 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sx: 1.05, sy: 1.05 },
          { o: 30, sx: 1.15, sy: 1.15 },
          { o: 60, sx: 1.05, sy: 1.05 },
          { o: 100, sx: 1.05, sy: 1.05 },
        ],
      },
      {
        // Smile swells with the heartbeat pulse.
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, sy: 1 },
          { o: 30, sx: 1.15, sy: 1.15 },
          { o: 60, sx: 1, sy: 1 },
          { o: 100, sx: 1, sy: 1 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.85 },
      { o: 30, curvature: 1 },
      { o: 60, curvature: 0.85 },
      { o: 100, curvature: 0.85 },
    ],
  },

  laughing: {
    name: 'laughing',
    duration: 0.65,
    thumbOffset: 25,
    tracks: [
      {
        target: 'squash',
        origin: '50% 100%',
        keyframes: [
          { o: 0, sy: 1, sx: 1 },
          { o: 25, sy: 0.94, sx: 1.04 },
          { o: 50, sy: 1.03, sx: 0.98 },
          { o: 75, sy: 0.96, sx: 1.02 },
          { o: 100, sy: 1, sx: 1 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sy: 0.35 },
          { o: 100, sy: 0.35 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1.15, sy: 1.15 },
          { o: 50, sx: 1.25, sy: 1.35 },
          { o: 100, sx: 1.15, sy: 1.15 },
        ],
      },
    ],
    // Opens and closes with each "ha".
    morph: [
      { o: 0, curvature: 1 },
      { o: 50, curvature: 0.65 },
      { o: 100, curvature: 1 },
    ],
  },

  wink: {
    name: 'wink',
    duration: 1.8,
    thumbOffset: 32,
    tracks: [
      {
        target: 'eyeR',
        keyframes: [
          { o: 0, sy: 1 },
          { o: 18, sy: 1 },
          { o: 28, sy: 0.08 },
          { o: 50, sy: 0.08 },
          { o: 62, sy: 1 },
          { o: 100, sy: 1 },
        ],
      },
      {
        target: 'root',
        keyframes: [
          { o: 0, r: 0 },
          { o: 28, r: 3 },
          { o: 50, r: 3 },
          { o: 62, r: 0 },
          { o: 100, r: 0 },
        ],
      },
      {
        // Cheeky smirk widens during the wink.
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 1, r: 0 },
          { o: 28, sx: 1.1, r: -4 },
          { o: 50, sx: 1.1, r: -4 },
          { o: 62, sx: 1, r: 0 },
          { o: 100, sx: 1, r: 0 },
        ],
      },
    ],
    morph: [
      { o: 0, curvature: 0.7 },
      { o: 28, curvature: 0.95 },
      { o: 50, curvature: 0.95 },
      { o: 62, curvature: 0.7 },
      { o: 100, curvature: 0.7 },
    ],
  },

  dizzy: {
    name: 'dizzy',
    duration: 2.2,
    thumbOffset: 25,
    tracks: [
      {
        target: 'root',
        keyframes: [
          { o: 0, r: -6 },
          { o: 50, r: 6 },
          { o: 100, r: -6 },
        ],
      },
      {
        target: 'pupils',
        ease: 'linear',
        keyframes: [
          { o: 0, tx: 3, ty: 0 },
          { o: 25, tx: 0, ty: 3 },
          { o: 50, tx: -3, ty: 0 },
          { o: 75, tx: 0, ty: -3 },
          { o: 100, tx: 3, ty: 0 },
        ],
      },
      {
        target: 'eyes',
        keyframes: [
          { o: 0, sy: 0.82 },
          { o: 100, sy: 0.82 },
        ],
      },
      {
        target: 'mouth',
        keyframes: [
          { o: 0, sx: 0.85 },
          { o: 50, sx: 1.15 },
          { o: 100, sx: 0.85 },
        ],
      },
    ],
    // Wobbles between queasy frown and grimace.
    morph: [
      { o: 0, curvature: -0.35 },
      { o: 50, curvature: 0.25 },
      { o: 100, curvature: -0.35 },
    ],
  },
}
