import type { AvatarProject, ExpressionSettings } from '../types/avatar'
import { EXPRESSIONS, TARGET_SELECTORS, type ExpressionDef, type Track, type TransformKeyframe } from './expressions'
import { mouthCurvePath } from './face'
import { darken, mixHex } from './shapes'

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

// Amplitudes scale live via the --avatar-intensity custom property (set per
// expression scope), so the keyframes themselves are intensity-independent.
const I = 'var(--avatar-intensity, 1)'
const px = (v: number) => (v === 0 ? '0px' : `calc(${f(v)}px * ${I})`)
const deg = (v: number) => (v === 0 ? '0deg' : `calc(${f(v)}deg * ${I})`)
const scale = (v: number) => (v === 1 ? '1' : `calc(1 + ${f(v - 1)} * ${I})`)

/**
 * Reference size for a track's '%' translations: body size for body/face
 * targets, eye size for pupils. Resolved at generation time so motion scales
 * with the character's proportions instead of hardcoding pixels.
 */
function unitScale(track: Track, project: AvatarProject): { x: number; y: number } {
  if (track.unit !== '%') return { x: 1, y: 1 }
  if (track.target === 'pupils') return { x: project.eyes.size / 100, y: project.eyes.size / 100 }
  return { x: project.body.width / 100, y: project.body.height / 100 }
}

function transformValue(kf: TransformKeyframe, ref: { x: number; y: number }): string {
  const tx = (kf.tx ?? 0) * ref.x
  const ty = (kf.ty ?? 0) * ref.y
  return `translate(${px(tx)}, ${px(ty)}) rotate(${deg(kf.r ?? 0)}) scale(${scale(kf.sx ?? 1)}, ${scale(kf.sy ?? 1)})`
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
  '.avatar-prop',
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
        `  30% { transform: translate(1.1px, 0.5px); }\n` +
        `  65% { transform: translate(-1px, 0.3px); }\n` +
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

  lines.push(`${scope} {\n  --avatar-intensity: ${f(settings.intensity)};\n}`)
  if (def.ownsEyes) {
    // The expression drives the eyelids itself; suspend the idle blink.
    lines.push(`${scope} .avatar-eye-blink {\n  animation: none;\n}`)
  }

  for (const track of def.tracks) {
    const animName = `${ns}-${def.name}-${track.target}`
    const ref = unitScale(track, project)
    const frames = track.keyframes
      .map((kf) => {
        const ease = kf.ease ? ` animation-timing-function: ${kf.ease};` : ''
        return `  ${f(kf.o)}% { transform: ${transformValue(kf, ref)};${ease} }`
      })
      .join('\n')
    lines.push(`@keyframes ${animName} {\n${frames}\n}`)
    const origin = track.origin ? `\n  transform-origin: ${track.origin};` : ''
    lines.push(
      `${scope} ${TARGET_SELECTORS[track.target]} {\n` +
        `  animation: ${animName} ${duration}s ${track.ease ?? 'ease-in-out'} ${iters} both;\n${PLAY_VARS}${origin}\n}`,
    )
  }

  for (const prop of def.props ?? []) {
    const animName = `${ns}-${def.name}-prop-${prop.id}`
    const ref = { x: project.body.width / 100, y: project.body.height / 100 }
    // Props below their minIntensity stay invisible; above it they ramp in —
    // higher intensity shows more (and, via the transform calc, bigger) props.
    const m = prop.minIntensity ?? 0
    const ramp = m > 0 ? `calc((var(--avatar-intensity, 1) - ${f(m)}) / ${f(1 - m)})` : I
    const frames = prop.keyframes
      .map((kf) => {
        const parts = [`transform: ${transformValue(kf, ref)};`]
        if (kf.opacity !== undefined) {
          parts.push(kf.opacity === 0 ? 'opacity: 0;' : `opacity: calc(${f(kf.opacity)} * ${ramp});`)
        }
        if (kf.ease) parts.push(`animation-timing-function: ${kf.ease};`)
        return `  ${f(kf.o)}% { ${parts.join(' ')} }`
      })
      .join('\n')
    lines.push(`@keyframes ${animName} {\n${frames}\n}`)
    lines.push(
      `${scope} .avatar-prop--${def.name}-${prop.id} {\n` +
        `  animation: ${animName} ${duration}s ${prop.ease ?? 'ease-in-out'} ${iters} both;\n${PLAY_VARS}\n}`,
    )
  }

  if (def.flush) {
    // Blends the body colour toward the flush colour and back. Intensity is
    // baked into the blend (colours can't calc()); returns to the user's
    // colour at the loop ends, and the rules vanish with the expression class.
    const amount = (a: number) => Math.max(0, Math.min(1, a * settings.intensity))
    const flushFrames = (base: string, property: string) =>
      def
        .flush!.keyframes.map((kf) => {
          const ease = kf.ease ? ` animation-timing-function: ${kf.ease};` : ''
          return `  ${f(kf.o)}% { ${property}: ${mixHex(base, def.flush!.color, amount(kf.amount))};${ease} }`
        })
        .join('\n')
    if (project.body.fill.type === 'solid') {
      const animName = `${ns}-${def.name}-flush`
      lines.push(`@keyframes ${animName} {\n${flushFrames(project.body.fill.color, 'fill')}\n}`)
      lines.push(
        `${scope} .avatar-body > path {\n  animation: ${animName} ${duration}s ease-in-out ${iters} both;\n${PLAY_VARS}\n}`,
      )
    } else {
      // Gradient bodies flush by animating each stop-color.
      const stops = [project.body.fill.color, project.body.fill.color2 ?? darken(project.body.fill.color)]
      stops.forEach((base, i) => {
        const animName = `${ns}-${def.name}-flush${i}`
        lines.push(`@keyframes ${animName} {\n${flushFrames(base, 'stop-color')}\n}`)
        lines.push(
          `${scope} linearGradient[id$="-body-grad"] stop:nth-child(${i + 1}) {\n` +
            `  animation: ${animName} ${duration}s ease-in-out ${iters} both;\n${PLAY_VARS}\n}`,
        )
      })
    }
  }

  if (def.morph && MORPHABLE_MOUTHS.has(project.mouth.style)) {
    const base = project.mouth.style === 'flat' ? 0 : project.mouth.curvature
    const animName = `${ns}-${def.name}-mouthd`
    // Path data can't use calc(), so intensity is baked into the morph frames.
    const frames = def.morph
      .map((kf) => {
        const curvature = Math.max(-1, Math.min(1, base + (kf.curvature - base) * settings.intensity))
        const ease = kf.ease ? ` animation-timing-function: ${kf.ease};` : ''
        return `  ${f(kf.o)}% { d: path("${mouthCurvePath(project.mouth, { curvature })}");${ease} }`
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
