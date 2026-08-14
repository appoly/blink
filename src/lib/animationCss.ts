import type { AvatarProject, ExpressionSettings } from '../types/avatar'
import { TARGET_SELECTORS, type ExpressionDef, type MorphKeyframe, type Track, type TransformKeyframe } from './expressions'
import { getExpressionDef } from './customExpressions'
import { mouthBaseCurvature, mouthMorphPath } from './face'
import { blobPath, darken, mixHex, type BlobDeform } from './shapes'

/**
 * Generates the CSS that animates an avatar. Used verbatim by the editor
 * preview, the expression thumbnails and the exported component, so what you
 * see in the app is exactly what ships.
 *
 * Every animated rule reads `--avatar-play` / `--avatar-seek`, which is how
 * the exported `paused` prop and the editor's scrubber/thumbnails work.
 */

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
export function unitScale(track: Track, project: AvatarProject): { x: number; y: number } {
  if (track.unit !== '%') return { x: 1, y: 1 }
  if (track.target === 'pupils') return { x: project.eyes.size / 100, y: project.eyes.size / 100 }
  return { x: project.body.width / 100, y: project.body.height / 100 }
}

/** Blob squash/stretch is punchier than rigid shapes — dough, not cardboard. */
const BLOB_SQUASH = 1.15

function ampScale(v: number | undefined, blobSquash: boolean): number {
  const n = v ?? 1
  if (!blobSquash || n === 1) return n
  return 1 + (n - 1) * BLOB_SQUASH
}

function transformValue(
  kf: TransformKeyframe,
  ref: { x: number; y: number },
  blobSquash = false,
): string {
  const tx = (kf.tx ?? 0) * ref.x
  const ty = (kf.ty ?? 0) * ref.y
  return `translate(${px(tx)}, ${px(ty)}) rotate(${deg(kf.r ?? 0)}) scale(${scale(ampScale(kf.sx, blobSquash))}, ${scale(ampScale(kf.sy, blobSquash))})`
}

export type SampledTransform = { tx: number; ty: number; r: number; sx: number; sy: number }

const NAMED_EASES: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
}

/** Evaluate a CSS timing function at t (0–1). Output may overshoot [0,1]. */
export function easeValue(ease: string | undefined, t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (!ease || ease === 'linear') return t
  let cp = NAMED_EASES[ease]
  if (!cp) {
    const m = ease.match(/cubic-bezier\(([^)]+)\)/)
    const parts = m ? m[1].split(',').map(Number) : []
    if (parts.length !== 4 || parts.some(Number.isNaN)) return t
    cp = parts as [number, number, number, number]
  }
  const [x1, y1, x2, y2] = cp
  const bez = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3
  // x(u) is monotonic for valid timing functions; bisect for u, then read y.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (bez(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  const u = (lo + hi) / 2
  return bez(y1, y2, u)
}

/** Sample a track at offset o, following each segment's timing function. */
export function sampleTrack(track: Track | undefined, o: number): SampledTransform {
  const rest = { tx: 0, ty: 0, r: 0, sx: 1, sy: 1 }
  if (!track?.keyframes.length) return rest
  const at = (kf: TransformKeyframe): SampledTransform => ({
    tx: kf.tx ?? 0,
    ty: kf.ty ?? 0,
    r: kf.r ?? 0,
    sx: kf.sx ?? 1,
    sy: kf.sy ?? 1,
  })
  const kfs = track.keyframes
  if (o <= kfs[0].o) return at(kfs[0])
  for (let i = 0; i < kfs.length - 1; i++) {
    if (o <= kfs[i + 1].o) {
      const a = at(kfs[i])
      const b = at(kfs[i + 1])
      const span = kfs[i + 1].o - kfs[i].o
      const t = span <= 0 ? 1 : (o - kfs[i].o) / span
      const e = easeValue(kfs[i].ease ?? track.ease ?? 'ease-in-out', t)
      return {
        tx: a.tx + (b.tx - a.tx) * e,
        ty: a.ty + (b.ty - a.ty) * e,
        r: a.r + (b.r - a.r) * e,
        sx: a.sx + (b.sx - a.sx) * e,
        sy: a.sy + (b.sy - a.sy) * e,
      }
    }
  }
  return at(kfs[kfs.length - 1])
}

/**
 * Outline deform at offset o, driven entirely by the animation's own motion:
 * the ripple amplitude follows the pose's rate of change, so the jelly
 * wobbles while the body moves and settles to stillness through holds and
 * idle — no free-running motion of its own.
 */
function blobDeformAt(def: ExpressionDef, o: number, intensity: number): BlobDeform {
  const squashTrack = def.tracks.find((t) => t.target === 'squash')
  const rootTrack = def.tracks.find((t) => t.target === 'root')
  const squash = sampleTrack(squashTrack, o)
  const root = sampleTrack(rootTrack, o)

  const D = 1.5
  const before = { s: sampleTrack(squashTrack, o - D), r: sampleTrack(rootTrack, o - D) }
  const after = { s: sampleTrack(squashTrack, o + D), r: sampleTrack(rootTrack, o + D) }
  const velocity =
    Math.abs(after.s.sy - before.s.sy) +
    Math.abs(after.s.sx - before.s.sx) +
    Math.abs(after.s.tx - before.s.tx + (after.r.tx - before.r.tx)) * 0.02 +
    Math.abs(after.s.r - before.s.r + (after.r.r - before.r.r)) * 0.015

  return {
    squash: 1 + (squash.sy - 1) * intensity,
    slosh: (root.r + squash.r) * 0.012 * intensity,
    wobble: o / 100,
    wobbleAmp: Math.min(0.04, velocity * 1.2) * intensity,
  }
}

/**
 * Blob outline keyframes aligned 1:1 with the squash/root keyframe offsets,
 * each segment carrying the same timing function as the transform it mirrors
 * — sampling at other offsets would cut the beziers mid-flight and make the
 * outline fight the (eased) squash transform.
 */
function blobMorphKeyframes(project: AvatarProject, def: ExpressionDef, intensity: number): string {
  const squashTrack = def.tracks.find((t) => t.target === 'squash')
  const rootTrack = def.tracks.find((t) => t.target === 'root')
  const offsets = new Set<number>([0, 100])
  for (const track of [squashTrack, rootTrack]) {
    for (const kf of track?.keyframes ?? []) offsets.add(kf.o)
  }
  const easeAt = (o: number): string => {
    // Ease of the segment starting at o: an exact squash keyframe wins, then
    // an exact root keyframe, then the squash segment containing o.
    for (const track of [squashTrack, rootTrack]) {
      const kf = track?.keyframes.find((k) => k.o === o)
      if (kf) return kf.ease ?? track!.ease ?? 'ease-in-out'
    }
    const seg = [...(squashTrack?.keyframes ?? [])].reverse().find((k) => k.o < o)
    return seg?.ease ?? squashTrack?.ease ?? 'ease-in-out'
  }
  const { width, height, blobVariant } = project.body
  return [...offsets]
    .sort((a, b) => a - b)
    .map((o) => {
      const d = blobPath(width, height, blobVariant, blobDeformAt(def, o, intensity))
      return `  ${f(o)}% { d: path("${d}"); animation-timing-function: ${easeAt(o)}; }`
    })
    .join('\n')
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
  '.avatar-eye-open',
  '.avatar-eye-closed',
  '.avatar-eye-smile',
  '.avatar-eyebrow',
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
        // Track opacity (eye-pose cross-fades) is deliberately not intensity-
        // scaled: half intensity must not mean half-transparent eyelids.
        const opacity = kf.opacity !== undefined ? ` opacity: ${f(kf.opacity)};` : ''
        const ease = kf.ease ? ` animation-timing-function: ${kf.ease};` : ''
        const blobSquash = project.body.kind === 'blob' && track.target === 'squash'
        return `  ${f(kf.o)}% { transform: ${transformValue(kf, ref, blobSquash)};${opacity}${ease} }`
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

  const bodyShapeAnims: string[] = []

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
      bodyShapeAnims.push(`${animName} ${duration}s ease-in-out ${iters} both`)
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

  if (project.body.kind === 'blob') {
    // Jelly outline: the path itself sloshes, independent of the uniform
    // squash transform, so hops land with a wobble instead of a scaled oval.
    const animName = `${ns}-${def.name}-blob`
    lines.push(`@keyframes ${animName} {\n${blobMorphKeyframes(project, def, settings.intensity)}\n}`)
    bodyShapeAnims.push(`${animName} ${duration}s cubic-bezier(0.45, 0, 0.55, 1) ${iters} both`)
  }

  if (bodyShapeAnims.length) {
    lines.push(
      `${scope} .avatar-body-shape {\n  animation: ${bodyShapeAnims.join(', ')};\n${PLAY_VARS}\n}`,
    )
  }

  if (def.morph && mouthMorphPath(project.mouth, 0) !== null) {
    const base = mouthBaseCurvature(project.mouth)
    const animName = `${ns}-${def.name}-mouthd`
    // Path data can't use calc(), so intensity is baked into the morph frames.
    const effective = (kf: MorphKeyframe) =>
      Math.max(-1, Math.min(1, base + (kf.curvature - base) * settings.intensity))
    const frames = def.morph
      .map((kf) => {
        const ease = kf.ease ? ` animation-timing-function: ${kf.ease};` : ''
        return `  ${f(kf.o)}% { d: path("${mouthMorphPath(project.mouth, effective(kf))}");${ease} }`
      })
      .join('\n')
    lines.push(`@keyframes ${animName} {\n${frames}\n}`)
    lines.push(`${scope} .avatar-mouth {\n  animation: ${animName} ${duration}s ease-in-out ${iters} both;\n${PLAY_VARS}\n}`)

    // WebKit (Safari and the Tauri desktop app's WKWebView) cannot animate the
    // `d` property. The mouth curves' depth is linear in curvature with the
    // endpoints pinned at y=0, so scaling the resting path vertically about
    // its endpoint line is an exact substitute for stroke mouths and a close
    // one for open/cat. Near-flat resting mouths have no depth to scale, so
    // they keep the (static) resting shape there. This rule comes after the
    // `d` rule so it wins the cascade where the @supports guard matches.
    if (Math.abs(base) >= 0.15) {
      const fallbackName = `${ns}-${def.name}-mouthscale`
      const fallbackFrames = def.morph
        .map((kf) => {
          const k = effective(kf) / base
          const ease = kf.ease ? ` animation-timing-function: ${kf.ease};` : ''
          return `  ${f(kf.o)}% { transform: scale(1, ${f(k)});${ease} }`
        })
        .join('\n')
      // The endpoint line is the fill-box's top edge for downward-bulging
      // resting curves (positive base) and the bottom edge for negative.
      const origin = base >= 0 ? '50% 0%' : '50% 100%'
      lines.push(
        `@supports not (d: path("m 0 0")) {\n` +
          `@keyframes ${fallbackName} {\n${fallbackFrames}\n}\n` +
          `${scope} .avatar-mouth {\n  transform-box: fill-box;\n  transform-origin: ${origin};\n` +
          `  animation: ${fallbackName} ${duration}s ease-in-out ${iters} both;\n${PLAY_VARS}\n}\n}`,
      )
    }
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
    const def = getExpressionDef(project, name)
    const settings = project.expressions[name]
    if (!def || !settings || def.tracks.length === 0 && !def.morph) continue
    parts.push(expressionCss(project, def, settings, `${rootSelector}.avatar-expr--${name}`, ns))
  }
  return parts.join('\n\n')
}
