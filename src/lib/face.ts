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

export function openMouthPath(mouth: Mouth): string {
  const w = mouth.width
  const h = mouth.height
  return `M ${f(-w / 2)} 0 L ${f(w / 2)} 0 Q ${f(w / 2)} ${f(h * 1.6)} 0 ${f(h * 1.6)} Q ${f(-w / 2)} ${f(h * 1.6)} ${f(-w / 2)} 0 Z`
}

export function oMouthPath(mouth: Mouth): string {
  const rx = mouth.width / 3.2
  const ry = mouth.height * 0.75
  return `M ${f(-rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0 Z`
}

export function catMouthPath(mouth: Mouth): string {
  const w = mouth.width
  const h = mouth.height
  return `M ${f(-w / 2)} 0 Q ${f(-w / 4)} ${f(h)} 0 0 Q ${f(w / 4)} ${f(h)} ${f(w / 2)} 0`
}

export function tonguePath(mouth: Mouth): string {
  const w = mouth.width * 0.42
  const h = mouth.height * 1.1
  return `M ${f(-w / 2)} ${f(mouth.height * 0.25)} Q 0 ${f(mouth.height * 0.25 + h)} ${f(w / 2)} ${f(mouth.height * 0.25)} Z`
}
