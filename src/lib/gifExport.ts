import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import type { AvatarProject, ExpressionName } from '../types/avatar'
import { avatarStylesheet } from './animationCss'
import { EXPRESSIONS } from './expressions'
import { buildAvatar, serializeNode } from './render'

/**
 * Rasterise one animation cycle of an expression into an animated GIF.
 *
 * Each frame is the same standalone SVG (animation CSS inlined) rendered with
 * `--avatar-play: paused` and `--avatar-seek` at that frame's time — the exact
 * mechanism the editor's scrubber and thumbnails use, so the GIF matches the
 * preview frame for frame.
 */
export async function renderExpressionGif(
  project: AvatarProject,
  expression: ExpressionName,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  const fps = 25
  const maxSize = 480

  const def = EXPRESSIONS[expression]
  const settings = project.expressions[expression]
  const duration = def.duration / settings.speed

  const render = buildAvatar(project, 'gif', [expression])
  const children = render.nodes.map((n) => serializeNode(n, '  ')).join('\n')
  const css = avatarStylesheet(project, '.avatar', 'gif', [expression])

  // Expression props (hearts, Zzz…) float outside the avatar's bounds; give
  // them room, but keep prop-less expressions tightly framed.
  const pad = (def.props?.length ? 0.3 : 0.06) * Math.max(render.width, render.height)
  const [vx, vy, vw, vh] = render.viewBox.split(' ').map(Number)
  const viewBox = `${vx - pad} ${vy - pad} ${vw + pad * 2} ${vh + pad * 2}`
  const scale = maxSize / Math.max(vw + pad * 2, vh + pad * 2)
  const width = Math.round((vw + pad * 2) * scale)
  const height = Math.round((vh + pad * 2) * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  const frameCount = Math.max(2, Math.round(duration * fps))
  const delay = Math.round(1000 / fps)
  // GIF repeat: 0 = loop forever, -1 = play once, n = n extra plays.
  const loop = settings.loop
  const repeat = loop === 'infinite' ? 0 : loop === 'once' ? -1 : loop - 1

  const gif = GIFEncoder()
  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * duration
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" class="avatar avatar-expr--${expression}" ` +
      `viewBox="${viewBox}" width="${width}" height="${height}" ` +
      `style="--avatar-play: paused; --avatar-seek: ${-t.toFixed(4)}s">\n` +
      `<style>${css}</style>\n${children}\n</svg>`
    const img = await loadSvgImage(svg)
    // GIF transparency is 1-bit, which frays antialiased edges — composite
    // onto white instead.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    const { data } = ctx.getImageData(0, 0, width, height)
    const palette = quantize(data, 256)
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay, repeat })
    onProgress?.(i + 1, frameCount)
  }
  gif.finish()
  return gif.bytes()
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}
