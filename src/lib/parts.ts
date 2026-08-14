import { newId, type AvatarProject, type Part, type PartKind } from '../types/avatar'

export interface PaletteShape {
  kind: PartKind
  label: string
}

export const PALETTE_SHAPES: PaletteShape[] = [
  { kind: 'rect', label: 'Rectangle' },
  { kind: 'circle', label: 'Circle' },
  { kind: 'ellipse', label: 'Ellipse' },
  { kind: 'capsule', label: 'Capsule' },
  { kind: 'trapezoid', label: 'Trapezoid' },
  { kind: 'blob', label: 'Blob' },
  { kind: 'triangle', label: 'Triangle' },
  { kind: 'star', label: 'Star' },
  { kind: 'heart', label: 'Heart' },
  { kind: 'strip', label: 'Strip' },
]

export function createPart(kind: PartKind, x: number, y: number): Part {
  const isStrip = kind === 'strip'
  return {
    id: newId(),
    name: PALETTE_SHAPES.find((s) => s.kind === kind)?.label ?? 'Shape',
    kind,
    x,
    y,
    width: isStrip ? 120 : 40,
    height: isStrip ? 14 : 40,
    rotation: 0,
    cornerRadius: kind === 'rect' ? 6 : 0,
    fill: { type: 'solid', color: '#f2d5b3' },
    stroke: null,
    opacity: 1,
    hidden: false,
    locked: false,
    mirror: false,
    behindBody: false,
  }
}

/** Margin outside the body a part's centre may reach — keeps the character coherent. */
const PART_MARGIN = 30

export function clampPartPosition(project: AvatarProject, x: number, y: number): { x: number; y: number } {
  const hw = project.body.width / 2 + PART_MARGIN
  const hh = project.body.height / 2 + PART_MARGIN
  return {
    x: Math.min(hw, Math.max(-hw, x)),
    y: Math.min(hh, Math.max(-hh, y)),
  }
}
