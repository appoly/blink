import type { AvatarProject, Fill, Part, Stroke } from '../types/avatar'
import { darken, shapePath } from './shapes'
import { catMouthPath, eyePath, mouthCurvePath, oMouthPath, openMouthPath, tonguePath } from './face'

/**
 * A plain-object SVG node tree. The editor renders it with Vue's `h()`,
 * the exporter and thumbnails serialise it to a string — one geometry
 * source, so preview and export are guaranteed to match.
 */
export interface SvgNode {
  tag: string
  attrs: Record<string, string | number>
  children?: SvgNode[]
}

export interface AvatarRender {
  viewBox: string
  width: number
  height: number
  nodes: SvgNode[]
}

const el = (tag: string, attrs: Record<string, string | number> = {}, children?: SvgNode[]): SvgNode => ({
  tag,
  attrs: Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [k, typeof v === 'number' ? Number(v.toFixed(2)) : v]),
  ),
  children,
})

function fillAttrs(fill: Fill, gradientId: string | null): Record<string, string> {
  if (fill.type === 'gradient' && gradientId) return { fill: `url(#${gradientId})` }
  return { fill: fill.color }
}

function strokeAttrs(stroke: Stroke | null): Record<string, string | number> {
  if (!stroke || stroke.width <= 0) return {}
  return { stroke: stroke.color, 'stroke-width': stroke.width }
}

function gradientDef(id: string, fill: Fill): SvgNode {
  return el(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0', y2: '1' },
    [
      el('stop', { offset: '0%', 'stop-color': fill.color }),
      el('stop', { offset: '100%', 'stop-color': fill.color2 ?? darken(fill.color) }),
    ],
  )
}

function partNode(part: Part, gradientId: string | null, mirrored = false): SvgNode {
  const x = mirrored ? -part.x : part.x
  const rotation = mirrored ? -part.rotation : part.rotation
  const transforms = [`translate(${x} ${part.y})`]
  if (rotation) transforms.push(`rotate(${rotation})`)
  if (mirrored) transforms.push('scale(-1 1)')
  return el('g', { class: 'avatar-part', 'data-part-id': mirrored ? `${part.id}--mirror` : part.id, transform: transforms.join(' ') }, [
    el('path', {
      d: shapePath(part.kind, part.width, part.height, part.cornerRadius, 0, part.corners),
      ...fillAttrs(part.fill, gradientId),
      ...strokeAttrs(part.stroke),
      ...(part.opacity < 1 ? { opacity: part.opacity } : {}),
    }),
  ])
}

function eyeNodes(project: AvatarProject, side: 'left' | 'right', clipId: string): SvgNode {
  const eyes = project.eyes
  const sx = side === 'left' ? -eyes.spacing : eyes.spacing
  // Horizontal half-width of each eye style, as a fraction of eyes.size —
  // pupils are clamped to it so they never get clipped flat at the sides.
  const EYE_RX: Record<string, number> = { round: 1, oval: 0.72, halfmoon: 1, bean: 0.85 }
  const pupilR = Math.min(eyes.size * eyes.pupilSize, eyes.size * EYE_RX[eyes.style] * 0.82)
  const pupilChildren: SvgNode[] = [el('circle', { r: pupilR, fill: eyes.pupilColor })]
  if (eyes.highlight) {
    pupilChildren.push(
      el('circle', {
        r: Math.max(1.2, pupilR * 0.28),
        cx: -pupilR * 0.32,
        cy: -pupilR * 0.4,
        fill: '#ffffff',
      }),
    )
  }
  return el(
    'g',
    { class: `avatar-eye avatar-eye--${side}`, transform: `translate(${sx} ${eyes.offsetY})` },
    [
      // Separate wrappers so expression transforms, the idle blink and the
      // pupil drift each animate their own element without conflicts.
      el('g', { class: 'avatar-eye-anim' }, [
        el('g', { class: 'avatar-eye-blink' }, [
          el('g', { transform: `scale(1 ${eyes.squash})` }, [
            el('path', { d: eyePath(eyes), fill: eyes.color }),
            el('g', { 'clip-path': `url(#${clipId})` }, [
              el('g', { class: 'avatar-pupil-anim' }, [el('g', { class: 'avatar-pupil' }, pupilChildren)]),
            ]),
          ]),
        ]),
      ]),
    ],
  )
}

function mouthNodes(project: AvatarProject): SvgNode {
  const mouth = project.mouth
  const strokeW = Math.max(2.5, mouth.height / 4)
  const strokeBase: Record<string, string | number> = {
    fill: 'none',
    stroke: mouth.color,
    'stroke-width': strokeW,
    'stroke-linecap': 'round',
  }
  const children: SvgNode[] = []
  switch (mouth.style) {
    case 'smile':
    case 'flat':
      children.push(el('path', { class: 'avatar-mouth', d: mouthCurvePath(mouth), ...strokeBase }))
      break
    case 'tongue':
      children.push(el('path', { class: 'avatar-tongue', d: tonguePath(mouth), fill: '#e8788a' }))
      children.push(el('path', { class: 'avatar-mouth', d: mouthCurvePath(mouth), ...strokeBase }))
      break
    case 'open':
      children.push(el('path', { class: 'avatar-mouth', d: openMouthPath(mouth), fill: mouth.color }))
      break
    case 'o':
      children.push(el('path', { class: 'avatar-mouth', d: oMouthPath(mouth), fill: mouth.color }))
      break
    case 'cat':
      children.push(el('path', { class: 'avatar-mouth', d: catMouthPath(mouth), ...strokeBase }))
      break
  }
  return el('g', { class: 'avatar-mouth-wrap', transform: `translate(0 ${mouth.offsetY})` }, [
    el('g', { class: 'avatar-mouth-anim' }, children),
  ])
}

/** Bounds of the whole character in body-centred coordinates. */
export function avatarBounds(project: AvatarProject): { minX: number; minY: number; maxX: number; maxY: number } {
  const b = project.body
  let minX = -b.width / 2
  let maxX = b.width / 2
  let minY = -b.height / 2
  let maxY = b.height / 2
  for (const part of project.parts) {
    // Use the rotated-bounds diagonal so rotated parts stay inside.
    const half = Math.hypot(part.width, part.height) / 2
    const xs = part.mirror ? [part.x, -part.x] : [part.x]
    for (const x of xs) {
      minX = Math.min(minX, x - half)
      maxX = Math.max(maxX, x + half)
      minY = Math.min(minY, part.y - half)
      maxY = Math.max(maxY, part.y + half)
    }
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Build the avatar's SVG node tree. `idPrefix` namespaces defs ids so several
 * instances can coexist in one document.
 */
export function buildAvatar(project: AvatarProject, idPrefix = 'avatar'): AvatarRender {
  const margin = 24
  const bounds = avatarBounds(project)
  const minX = bounds.minX - margin
  const minY = bounds.minY - margin
  const width = bounds.maxX - bounds.minX + margin * 2
  const height = bounds.maxY - bounds.minY + margin * 2

  const defs: SvgNode[] = []
  const bodyGradientId = project.body.fill.type === 'gradient' ? `${idPrefix}-body-grad` : null
  if (bodyGradientId) defs.push(gradientDef(bodyGradientId, project.body.fill))

  const partNodes = (parts: Part[]): SvgNode[] =>
    parts.flatMap((part) => {
      if (part.hidden) return []
      let gradId: string | null = null
      if (part.fill.type === 'gradient') {
        gradId = `${idPrefix}-grad-${part.id}`
        defs.push(gradientDef(gradId, part.fill))
      }
      const nodes = [partNode(part, gradId)]
      if (part.mirror) nodes.push(partNode(part, gradId, true))
      return nodes
    })

  const clipId = `${idPrefix}-eye-clip`
  defs.push(el('clipPath', { id: clipId }, [el('path', { d: eyePath(project.eyes) })]))

  // Three z-bands: behind body → above body (below face) → above face.
  const behind = partNodes(project.parts.filter((p) => p.behindBody))
  const mid = partNodes(project.parts.filter((p) => !p.behindBody && !p.aboveFace))
  const overlay = partNodes(project.parts.filter((p) => !p.behindBody && p.aboveFace))

  const body = el('g', { class: 'avatar-body' }, [
    el('path', {
      d: shapePath(project.body.kind, project.body.width, project.body.height, project.body.cornerRadius, project.body.blobVariant),
      ...fillAttrs(project.body.fill, bodyGradientId),
      ...strokeAttrs(project.body.stroke),
    }),
  ])

  const root = el('g', { class: 'avatar-root' }, [
    el('g', { class: 'avatar-squash' }, [
      ...behind,
      body,
      ...mid,
      el('g', { class: 'avatar-face' }, [
        eyeNodes(project, 'left', clipId),
        eyeNodes(project, 'right', clipId),
        mouthNodes(project),
      ]),
      ...overlay,
    ]),
  ])

  return {
    viewBox: `${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`,
    width,
    height,
    nodes: [el('defs', {}, defs), root],
  }
}

const VOID_OK = new Set(['stop', 'circle', 'path', 'rect', 'ellipse', 'line'])

export function serializeNode(node: SvgNode, indent = ''): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')
  const children = node.children ?? []
  if (children.length === 0 && VOID_OK.has(node.tag)) {
    return `${indent}<${node.tag}${attrs} />`
  }
  if (children.length === 0) return `${indent}<${node.tag}${attrs}></${node.tag}>`
  const inner = children.map((c) => serializeNode(c, indent + '  ')).join('\n')
  return `${indent}<${node.tag}${attrs}>\n${inner}\n${indent}</${node.tag}>`
}
