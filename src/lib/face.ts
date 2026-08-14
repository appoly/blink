import type { Eyes, Mouth } from '../types/avatar'

const f = (n: number) => Number(n.toFixed(2))

/**
 * Path for one eye shape, centred on (0,0), before squash is applied.
 * Squash is applied as a scaleY on the group so blinking composes with it.
 */
export function eyePath(eyes: Eyes): string {
  const s = eyes.size
  switch (eyes.style) {
    case 'round':
      return `M ${f(-s)} 0 a ${f(s)} ${f(s)} 0 1 0 ${f(2 * s)} 0 a ${f(s)} ${f(s)} 0 1 0 ${f(-2 * s)} 0 Z`
    case 'oval': {
      const rx = s * 0.72
      return `M ${f(-rx)} 0 a ${f(rx)} ${f(s)} 0 1 0 ${f(2 * rx)} 0 a ${f(rx)} ${f(s)} 0 1 0 ${f(-2 * rx)} 0 Z`
    }
    case 'halfmoon':
      // Flat-bottomed dome.
      return `M ${f(-s)} ${f(s * 0.45)} A ${f(s)} ${f(s)} 0 0 1 ${f(s)} ${f(s * 0.45)} Z`
    case 'bean':
      return [
        `M ${f(-s * 0.85)} ${f(-s * 0.3)}`,
        `C ${f(-s * 0.85)} ${f(-s * 1.05)} ${f(s * 0.9)} ${f(-s * 0.95)} ${f(s * 0.85)} ${f(-s * 0.1)}`,
        `C ${f(s * 0.8)} ${f(s * 0.75)} ${f(-s * 0.3)} ${f(s * 0.95)} ${f(-s * 0.6)} ${f(s * 0.45)}`,
        `C ${f(-s * 0.8)} ${f(s * 0.15)} ${f(-s * 0.85)} ${f(s * 0.05)} ${f(-s * 0.85)} ${f(-s * 0.3)}`,
        'Z',
      ].join(' ')
  }
}

export interface MouthMorph {
  /** Overrides mouth.curvature, -1..1. */
  curvature?: number
}

/**
 * Mouth geometry. Smile/flat/tongue curves share an identical path structure
 * (single quadratic) at every curvature so CSS can morph `d` between them.
 */
export function mouthCurvePath(mouth: Mouth, morph: MouthMorph = {}): string {
  const w = mouth.width
  const h = mouth.height
  const curvature = morph.curvature ?? (mouth.style === 'flat' ? 0 : mouth.curvature)
  const cy = curvature * h * 2
  return `M ${f(-w / 2)} 0 Q 0 ${f(cy)} ${f(w / 2)} 0`
}

/**
 * Open mouth (D-grin) with morphable curvature: the bulge shrinks toward a
 * sliver at 0 and inverts into an upturned wail when negative. One quadratic
 * structure at every curvature so CSS can interpolate `d` between them.
 */
export function openMouthPath(mouth: Mouth, morph: MouthMorph = {}): string {
  const w = mouth.width
  const h = mouth.height
  const c = morph.curvature ?? 1
  const b = Math.sign(c || 1) * Math.max(0.15, Math.abs(c) * 1.6) * h
  return `M ${f(-w / 2)} 0 Q 0 0 ${f(w / 2)} 0 Q ${f(w * 0.48)} ${f(b)} 0 ${f(b)} Q ${f(-w * 0.48)} ${f(b)} ${f(-w / 2)} 0 Z`
}

export function oMouthPath(mouth: Mouth): string {
  const rx = mouth.width / 3.2
  const ry = mouth.height * 0.75
  return `M ${f(-rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0 Z`
}

/** Cat "w" mouth: the humps flatten at 0 curvature and flip up when negative. */
export function catMouthPath(mouth: Mouth, morph: MouthMorph = {}): string {
  const w = mouth.width
  const hump = mouth.height * (morph.curvature ?? 1)
  return `M ${f(-w / 2)} 0 Q ${f(-w / 4)} ${f(hump)} 0 0 Q ${f(w / 4)} ${f(hump)} ${f(w / 2)} 0`
}

/**
 * Morph-target path for an expression's mouth keyframe, or null when the
 * style has no morphable geometry ('o' stays a neutral gasp by design).
 */
export function mouthMorphPath(mouth: Mouth, curvature: number): string | null {
  switch (mouth.style) {
    case 'smile':
    case 'flat':
    case 'tongue':
      return mouthCurvePath(mouth, { curvature })
    case 'open':
      return openMouthPath(mouth, { curvature })
    case 'cat':
      return catMouthPath(mouth, { curvature })
    case 'o':
      return null
  }
}

/** The curvature an expression morph blends away from at low intensity. */
export function mouthBaseCurvature(mouth: Mouth): number {
  if (mouth.style === 'flat') return 0
  // Open/cat resting shapes are their full grin.
  if (mouth.style === 'open' || mouth.style === 'cat') return 1
  return mouth.curvature
}

export function tonguePath(mouth: Mouth): string {
  const w = mouth.width * 0.42
  const h = mouth.height * 1.1
  return `M ${f(-w / 2)} ${f(mouth.height * 0.25)} Q 0 ${f(mouth.height * 0.25 + h)} ${f(w / 2)} ${f(mouth.height * 0.25)} Z`
}
