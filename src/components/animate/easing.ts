import { DECEL, FALL, SMOOTH, SNAP_IN, SPRING } from '../../lib/expressions'

/** The curated easing vocabulary — the same beziers the presets use. */
export const EASING_PRESETS = [
  { label: 'Smooth', value: SMOOTH },
  { label: 'Springy', value: SPRING },
  { label: 'Anticipate', value: SNAP_IN },
  { label: 'Settle', value: DECEL },
  { label: 'Drop', value: FALL },
  { label: 'Linear', value: 'linear' },
] as const

export function easeLabel(value: string | undefined): string {
  return EASING_PRESETS.find((p) => p.value === (value ?? SMOOTH))?.label ?? 'Custom'
}
