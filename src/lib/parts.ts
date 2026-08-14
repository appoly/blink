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
    cornerRadius: kind === 'rect' ? 6 : kind === 'strip' ? 4 : 0,
    corners: null,
    fill: { type: 'solid', color: '#f2d5b3' },
    stroke: null,
    opacity: 1,
    hidden: false,
    locked: false,
    mirror: false,
    behindBody: false,
    aboveFace: false,
  }
}

/** Deep-copy a part with a fresh id, offset slightly so the copy is visible. */
export function clonePart(source: Part, project: AvatarProject, offset = 12): Part {
  const copy: Part = JSON.parse(JSON.stringify(source))
  copy.id = newId()
  copy.name = `${source.name} copy`
  const pos = clampPartPosition(project, source.x + offset, source.y + offset)
  copy.x = pos.x
  copy.y = pos.y
  return copy
}

/** Z-band a part renders in: behind the body, above it, or above the face. */
export type Band = 'back' | 'mid' | 'top'

export const bandOf = (p: Part): Band => (p.behindBody ? 'back' : p.aboveFace ? 'top' : 'mid')

export function setBand(p: Part, band: Band) {
  p.behindBody = band === 'back'
  p.aboveFace = band === 'top'
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
