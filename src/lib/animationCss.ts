import type { AvatarProject, ExpressionSettings } from '../types/avatar'
import { EXPRESSIONS, TARGET_SELECTORS, type ExpressionDef, type TransformKeyframe } from './expressions'
import { mouthCurvePath } from './face'

/**
 * Generates the CSS that animates an avatar. Used verbatim by the editor
 * preview, the expression thumbnails and the exported component, so what you
 * see in the app is exactly what ships.
 *
 * Every animated rule reads `--avatar-play` / `--avatar-seek`, which is how
 * the exported `paused` prop and the editor's scrubber/thumbnails work.
 */

const MORPHABLE_MOUTHS = new Set(['smile', 'flat', 'tongue'])

// The `animation:` shorthand resets delay/play-state, so these live after it
// in every rule that starts an animation. They power `paused` and scrubbing.
const PLAY_VARS =
  '  animation-play-state: var(--avatar-play, running);\n  animation-delay: var(--avatar-seek, 0s);'

const f = (n: number) => Number(n.toFixed(3))

function transformValue(kf: TransformKeyframe, intensity: number): string {
  const tx = f((kf.tx ?? 0) * intensity)
  const ty = f((kf.ty ?? 0) * intensity)
  const r = f((kf.r ?? 0) * intensity)
  const sx = f(1 + ((kf.sx ?? 1) - 1) * intensity)
  const sy = f(1 + ((kf.sy ?? 1) - 1) * intensity)
  return `translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sx}, ${sy})`
}

function iterationCount(settings: ExpressionSettings): string {
  if (settings.loop === 'infinite') return 'infinite'
  if (settings.loop === 'once') return '1'
  return String(Math.max(1, Math.round(settings.loop)))
}

const ANIMATED_SELECTORS = [
  '.avatar-root',
  '.avatar-squash',
  '.avatar-eye-anim',
  '.avatar-eye-blink',
  '.avatar-pupil-anim',
  '.avatar-pupil',
  '.avatar-mouth-anim',
  '.avatar-mouth',
]

/**
 * Always-on CSS: transform plumbing, the idle blink (irregular offsets fake a
 * randomised 3–6s interval) and the optional pupil drift.
 * `scope` is a selector prefix (e.g. `.my-avatar`), `ns` namespaces keyframes.
 */
export function baseAvatarCss(project: AvatarProject, scope: string, ns: string): string {
  const lines: string[] = []
  lines.push(
    ANIMATED_SELECTORS.map((s) => `${scope} ${s}`).join(',\n') +
      ` {\n  transform-box: fill-box;\n  transform-origin: center;\n}`,
  )
  lines.push(`${scope} .avatar-mouth {\n  transition: d 0.25s ease;\n}`)

  // Three blinks per 11s cycle at uneven times ≈ randomised 3–6s intervals.
  lines.push(
    `@keyframes ${ns}-blink {\n` +
      `  0%, 6.8%, 9%, 34.8%, 37%, 76.8%, 79%, 100% { transform: scale(1, 1); }\n` +
      `  7.9%, 35.9%, 77.9% { transform: scale(1, 0.08); }\n` +
      `}`,
  )
  lines.push(`${scope} .avatar-eye-blink {\n  animation: ${ns}-blink 11s linear infinite;\n${PLAY_VARS}\n}`)

  if (project.eyes.pupilDrift) {
    lines.push(
      `@keyframes ${ns}-drift {\n` +
        `  0%, 100% { transform: translate(0px, 0px); }\n` +
        `  30% { transform: translate(1.6px, 0.8px); }\n` +
        `  65% { transform: translate(-1.4px, 0.5px); }\n` +
        `}`,
    )
    lines.push(`${scope} .avatar-pupil {\n  animation: ${ns}-drift 9s ease-in-out infinite;\n${PLAY_VARS}\n}`)
  }
  return lines.join('\n\n')
}

/**
 * CSS for one expression, active while `scope` matches (e.g.
 * `.my-avatar.avatar-expr--happy`). Speed/intensity/loop are baked in.
 */
export function expressionCss(
  project: AvatarProject,
  def: ExpressionDef,
  settings: ExpressionSettings,
  scope: string,
  ns: string,
): string {
  const duration = f(def.duration / settings.speed)
  const iters = iterationCount(settings)
  const lines: string[] = []

  for (const track of def.tracks) {
    const animName = `${ns}-${def.name}-${track.target}`
    const frames = track.keyframes
      .map((kf) => `  ${f(kf.o)}% { transform: ${transformValue(kf, settings.intensity)}; }`)
      .join('\n')
    lines.push(`@keyframes ${animName} {\n${frames}\n}`)
    const origin = track.origin ? `\n  transform-origin: ${track.origin};` : ''
    lines.push(
      `${scope} ${TARGET_SELECTORS[track.target]} {\n` +
        `  animation: ${animName} ${duration}s ${track.ease ?? 'ease-in-out'} ${iters} both;\n${PLAY_VARS}${origin}\n}`,
    )
  }

  if (def.morph && MORPHABLE_MOUTHS.has(project.mouth.style)) {
    const base = project.mouth.style === 'flat' ? 0 : project.mouth.curvature
    const animName = `${ns}-${def.name}-mouthd`
    const frames = def.morph
      .map((kf) => {
        const curvature = Math.max(-1, Math.min(1, base + (kf.curvature - base) * settings.intensity))
        return `  ${f(kf.o)}% { d: path("${mouthCurvePath(project.mouth, { curvature })}"); }`
      })
      .join('\n')
    lines.push(`@keyframes ${animName} {\n${frames}\n}`)
    lines.push(`${scope} .avatar-mouth {\n  animation: ${animName} ${duration}s ease-in-out ${iters} both;\n${PLAY_VARS}\n}`)
  }

  return lines.join('\n\n')
}

/** Full stylesheet for a set of expressions under one root selector. */
export function avatarStylesheet(
  project: AvatarProject,
  rootSelector: string,
  ns: string,
  expressionNames: string[],
): string {
  const parts = [baseAvatarCss(project, rootSelector, ns)]
  for (const name of expressionNames) {
    const def = EXPRESSIONS[name as keyof typeof EXPRESSIONS]
    const settings = project.expressions[name]
    if (!def || !settings || def.tracks.length === 0 && !def.morph) continue
    parts.push(expressionCss(project, def, settings, `${rootSelector}.avatar-expr--${name}`, ns))
  }
  return parts.join('\n\n')
}
