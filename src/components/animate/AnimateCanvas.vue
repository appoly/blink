<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AvatarSvg from '../AvatarSvg.vue'
import { sampleTrack, unitScale } from '../../lib/animationCss'
import { ROWS, type RowDef } from '../../lib/customExpressions'
import { avatarBounds } from '../../lib/render'
import type { Track, TrackTarget } from '../../lib/expressions'
import { newTrack } from '../../lib/customExpressions'
import { useAnimEdit } from './useAnimEdit'

/**
 * The Animate stage: the avatar playing (or paused at the playhead) through
 * the same compiled CSS the export uses, with pose-to-keyframe gizmos on top.
 * Dragging a part writes a keyframe on its track at the playhead (auto-key).
 */

const { animate, project, def, playheadOffset, ensureKeyframe, commit, trackIndexByTarget } = useAnimEdit()

const svgEl = ref<SVGSVGElement | null>(null)

// Local pan/zoom (the Pose tab keeps its own framing).
const zoom = ref(1.2)
const panX = ref(0)
const panY = ref(0)
const px = computed(() => 1 / zoom.value)

const stageVars = computed(() => ({
  '--avatar-play': animate.playing ? 'running' : 'paused',
  '--avatar-seek': `${(-(animate.playing ? animate.seekBase : animate.time)).toFixed(4)}s`,
}))

// ---- coordinate helpers ---------------------------------------------------

function screenPoint(e: PointerEvent | WheelEvent): { x: number; y: number } {
  const rect = svgEl.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function toWorld(sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - panX.value) / zoom.value, y: (sy - panY.value) / zoom.value }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const s = screenPoint(e)
  if (e.ctrlKey || e.metaKey) {
    const next = Math.min(8, Math.max(0.2, zoom.value * Math.exp(-e.deltaY * 0.01)))
    panX.value = s.x - ((s.x - panX.value) * next) / zoom.value
    panY.value = s.y - ((s.y - panY.value) * next) / zoom.value
    zoom.value = next
  } else {
    panX.value -= e.deltaX
    panY.value -= e.deltaY
  }
}

// ---- target geometry --------------------------------------------------------

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Untransformed bounding box for a track target, body-centred coords. */
function targetBox(target: TrackTarget): Box {
  const { body, eyes, mouth } = project.value
  const eyeR = eyes.size * 1.4
  switch (target) {
    case 'root': {
      const b = avatarBounds(project.value)
      return { x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY }
    }
    case 'squash':
      return { x: -body.width / 2, y: -body.height / 2, w: body.width, h: body.height }
    case 'eyes':
      return { x: -eyes.spacing - eyeR, y: eyes.offsetY - eyeR, w: (eyes.spacing + eyeR) * 2, h: eyeR * 2 }
    case 'eyeL':
      return { x: -eyes.spacing - eyeR, y: eyes.offsetY - eyeR, w: eyeR * 2, h: eyeR * 2 }
    case 'eyeR':
      return { x: eyes.spacing - eyeR, y: eyes.offsetY - eyeR, w: eyeR * 2, h: eyeR * 2 }
    case 'brows':
      return { x: -eyes.spacing - eyeR, y: eyes.offsetY - eyes.size * 2.1, w: (eyes.spacing + eyeR) * 2, h: eyes.size }
    case 'browL':
      return { x: -eyes.spacing - eyeR, y: eyes.offsetY - eyes.size * 2.1, w: eyeR * 2, h: eyes.size }
    case 'browR':
      return { x: eyes.spacing - eyeR, y: eyes.offsetY - eyes.size * 2.1, w: eyeR * 2, h: eyes.size }
    case 'pupils':
      return { x: -eyes.spacing - eyes.size, y: eyes.offsetY - eyes.size, w: (eyes.spacing + eyes.size) * 2, h: eyes.size * 2 }
    case 'mouth':
      return { x: -mouth.width / 2 - 4, y: mouth.offsetY - mouth.height - 4, w: mouth.width + 8, h: mouth.height * 2 + 8 }
    default:
      return { x: -body.width / 2, y: -body.height / 2, w: body.width, h: body.height }
  }
}

const selectedTrackObj = computed<Track | null>(() =>
  typeof animate.selectedTrack === 'number' ? (def.value?.tracks[animate.selectedTrack] ?? null) : null,
)

const selectedRow = computed<RowDef | null>(() => {
  const t = selectedTrackObj.value
  if (!t) return null
  return ROWS.find((r) => r.target === t.target || r.split?.includes(t.target)) ?? null
})

/** Transform-origin point in world coords, from the track's origin string. */
function originPoint(track: Track, box: Box): { x: number; y: number } {
  const m = track.origin?.match(/([\d.]+)%\s+([\d.]+)%/)
  const fx = m ? Number(m[1]) / 100 : 0.5
  const fy = m ? Number(m[2]) / 100 : 0.5
  return { x: box.x + box.w * fx, y: box.y + box.h * fy }
}

/** The gizmo box, posed with the track's sampled transform at the playhead. */
const gizmo = computed(() => {
  const track = selectedTrackObj.value
  if (!track || !selectedRow.value) return null
  const box = targetBox(track.target)
  const sampled = sampleTrack(track, playheadOffset.value)
  const ref = unitScale(track, project.value)
  const tx = sampled.tx * ref.x
  const ty = sampled.ty * ref.y
  const origin = originPoint(track, box)
  const transform =
    `translate(${(tx + origin.x).toFixed(2)} ${(ty + origin.y).toFixed(2)}) ` +
    `rotate(${sampled.r.toFixed(2)}) scale(${sampled.sx.toFixed(4)} ${sampled.sy.toFixed(4)}) ` +
    `translate(${(-origin.x).toFixed(2)} ${(-origin.y).toFixed(2)})`
  return { box, origin, transform, gizmos: selectedRow.value.gizmos, track }
})

// ---- posing (auto-key) ------------------------------------------------------

type DragMode =
  | { mode: 'pan'; startX: number; startY: number; panX0: number; panY0: number }
  | {
      mode: 'move' | 'rotate' | 'scale'
      trackIndex: number
      o: number
      startWorld: { x: number; y: number }
      start: { tx: number; ty: number; r: number; sx: number; sy: number }
      origin: { x: number; y: number }
      handle?: { dx: number; dy: number }
    }
  | null

let drag: DragMode = null

/** Resolve a canvas hit to the curated row it poses. */
function hitToTarget(el: Element): TrackTarget | null {
  if (el.closest('.avatar-pupil-anim')) return 'pupils'
  const eye = el.closest('.avatar-eye')
  if (eye) {
    const left = !!el.closest('.avatar-eye--left')
    // Match whichever eye-track layout the def currently uses.
    if (trackIndexByTarget('eyes') >= 0) return 'eyes'
    if (trackIndexByTarget(left ? 'eyeL' : 'eyeR') >= 0) return left ? 'eyeL' : 'eyeR'
    return 'eyes'
  }
  if (el.closest('.avatar-mouth-wrap')) return 'mouth'
  if (el.closest('.avatar-body') || el.closest('.avatar-part')) {
    return trackIndexByTarget('squash') >= 0 || trackIndexByTarget('root') < 0 ? 'squash' : 'root'
  }
  return null
}

/** Find (or with auto-key create) the track for a target. */
function resolveTrack(target: TrackTarget): number | null {
  const index = trackIndexByTarget(target)
  if (index >= 0) return index
  if (!animate.autoKey || !def.value) return null
  const row = ROWS.find((r) => r.target === target || r.split?.includes(target))
  if (!row) return null
  def.value.tracks.push(newTrack(target, row))
  return def.value.tracks.length - 1
}

function beginPose(e: PointerEvent, trackIndex: number, mode: 'move' | 'rotate' | 'scale', handle?: { dx: number; dy: number }) {
  const track = def.value!.tracks[trackIndex]
  const o = playheadOffset.value
  if (!animate.autoKey && !track.keyframes.some((k) => k.o === o)) return
  const kf = ensureKeyframe(trackIndex, o)
  const s = screenPoint(e)
  const box = targetBox(track.target)
  drag = {
    mode,
    trackIndex,
    o,
    startWorld: toWorld(s.x, s.y),
    start: { tx: kf.tx ?? 0, ty: kf.ty ?? 0, r: kf.r ?? 0, sx: kf.sx ?? 1, sy: kf.sy ?? 1 },
    origin: originPoint(track, box),
    handle,
  }
  animate.selectedTrack = trackIndex
  animate.selectedKeys = [{ track: trackIndex, o }]
  svgEl.value!.setPointerCapture(e.pointerId)
}

function onPointerDown(e: PointerEvent) {
  if (animate.playing) animate.pause()
  if (e.button === 1 || e.button === 2) {
    drag = { mode: 'pan', startX: e.clientX, startY: e.clientY, panX0: panX.value, panY0: panY.value }
    svgEl.value!.setPointerCapture(e.pointerId)
    return
  }
  if (e.button !== 0) return
  const target = e.target as Element

  // Gizmo handles stopPropagation via their own handlers; here it's either
  // the avatar itself (select + start moving) or empty space (deselect).
  const hit = hitToTarget(target)
  if (hit) {
    const index = resolveTrack(hit)
    if (index === null) return
    beginPose(e, index, 'move')
    return
  }
  animate.selectedKeys = []
}

function startHandle(e: PointerEvent, mode: 'move' | 'rotate' | 'scale', handle?: { dx: number; dy: number }) {
  if (typeof animate.selectedTrack !== 'number' || e.button !== 0) return
  e.stopPropagation()
  if (animate.playing) animate.pause()
  beginPose(e, animate.selectedTrack, mode, handle)
}

const round2 = (n: number) => Number(n.toFixed(2))

function onPointerMove(e: PointerEvent) {
  const d = drag
  if (!d) return
  if (d.mode === 'pan') {
    panX.value = d.panX0 + (e.clientX - d.startX)
    panY.value = d.panY0 + (e.clientY - d.startY)
    return
  }
  const track = def.value?.tracks[d.trackIndex]
  const kf = track?.keyframes.find((k) => k.o === d.o)
  if (!track || !kf) return
  const s = screenPoint(e)
  const w = toWorld(s.x, s.y)

  if (d.mode === 'move') {
    const ref = unitScale(track, project.value)
    kf.tx = round2(d.start.tx + (w.x - d.startWorld.x) / ref.x)
    kf.ty = round2(d.start.ty + (w.y - d.startWorld.y) / ref.y)
    return
  }

  if (d.mode === 'rotate') {
    const a0 = Math.atan2(d.startWorld.y - d.origin.y, d.startWorld.x - d.origin.x)
    const a1 = Math.atan2(w.y - d.origin.y, w.x - d.origin.x)
    let r = d.start.r + ((a1 - a0) * 180) / Math.PI
    if (e.shiftKey) r = Math.round(r / 15) * 15
    kf.r = round2(((r + 540) % 360) - 180)
    return
  }

  if (d.mode === 'scale') {
    const h = d.handle ?? { dx: 1, dy: 1 }
    const fx = h.dx !== 0 ? (w.x - d.origin.x) / (d.startWorld.x - d.origin.x || 1) : 1
    const fy = h.dy !== 0 ? (w.y - d.origin.y) / (d.startWorld.y - d.origin.y || 1) : 1
    if (e.shiftKey && h.dx !== 0 && h.dy !== 0) {
      const f = Math.max(fx, fy)
      kf.sx = round2(Math.max(0.05, d.start.sx * f))
      kf.sy = round2(Math.max(0.05, d.start.sy * f))
    } else {
      if (h.dx !== 0) kf.sx = round2(Math.max(0.05, d.start.sx * fx))
      if (h.dy !== 0) kf.sy = round2(Math.max(0.05, d.start.sy * fy))
    }
  }
}

function onPointerUp(e: PointerEvent) {
  if (!drag) return
  const wasEdit = drag.mode !== 'pan'
  drag = null
  if (svgEl.value?.hasPointerCapture(e.pointerId)) svgEl.value.releasePointerCapture(e.pointerId)
  if (wasEdit) commit()
}

const HANDLES: { dx: number; dy: number; cursor: string }[] = [
  { dx: -1, dy: -1, cursor: 'nwse-resize' },
  { dx: 1, dy: -1, cursor: 'nesw-resize' },
  { dx: 1, dy: 1, cursor: 'nwse-resize' },
  { dx: -1, dy: 1, cursor: 'nesw-resize' },
  { dx: 0, dy: -1, cursor: 'ns-resize' },
  { dx: 0, dy: 1, cursor: 'ns-resize' },
  { dx: -1, dy: 0, cursor: 'ew-resize' },
  { dx: 1, dy: 0, cursor: 'ew-resize' },
]

const groundY = computed(() => project.value.body.height / 2 + 14)

onMounted(() => {
  const rect = svgEl.value!.getBoundingClientRect()
  panX.value = rect.width / 2
  panY.value = rect.height * 0.55
})
</script>

<template>
  <div
    class="anim-canvas anim-stage"
    :class="`avatar-expr--${def?.name}`"
    :style="{
      ...stageVars,
      backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
      backgroundPosition: `${panX}px ${panY}px`,
    }"
  >
    <svg
      ref="svgEl"
      class="stage-svg"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
      @contextmenu.prevent
    >
      <g :key="animate.replayKey" :transform="`translate(${panX} ${panY}) scale(${zoom})`">
        <ellipse class="ground" cx="0" :cy="groundY" :rx="project.body.width * 0.62" :ry="12" />

        <AvatarSvg :project="project" id-prefix="an" bare />

        <!-- posing gizmo for the selected track, hidden while playing -->
        <g v-if="gizmo && !animate.playing" :transform="gizmo.transform">
          <rect
            class="outline dashed"
            :x="gizmo.box.x"
            :y="gizmo.box.y"
            :width="gizmo.box.w"
            :height="gizmo.box.h"
            :stroke-width="1.5 * px"
            style="cursor: move"
            @pointerdown="startHandle($event, 'move')"
          />
          <template v-if="gizmo.gizmos.includes('rotate')">
            <line
              class="outline"
              :x1="gizmo.box.x + gizmo.box.w / 2"
              :y1="gizmo.box.y"
              :x2="gizmo.box.x + gizmo.box.w / 2"
              :y2="gizmo.box.y - 18 * px"
              :stroke-width="1.5 * px"
            />
            <circle
              class="handle rotate-handle"
              :cx="gizmo.box.x + gizmo.box.w / 2"
              :cy="gizmo.box.y - 24 * px"
              :r="5 * px"
              @pointerdown="startHandle($event, 'rotate')"
            />
          </template>
          <template v-if="gizmo.gizmos.includes('scale')">
            <rect
              v-for="h in HANDLES"
              :key="`${h.dx},${h.dy}`"
              class="handle"
              :x="gizmo.box.x + ((h.dx + 1) * gizmo.box.w) / 2 - 4 * px"
              :y="gizmo.box.y + ((h.dy + 1) * gizmo.box.h) / 2 - 4 * px"
              :width="8 * px"
              :height="8 * px"
              :style="{ cursor: h.cursor }"
              @pointerdown="startHandle($event, 'scale', h)"
            />
          </template>
        </g>
      </g>
    </svg>

    <div class="canvas-hint">
      {{ animate.playing ? 'Click to pause and pose' : 'Drag the character to set a keyframe at the playhead' }}
    </div>
  </div>
</template>

<style scoped>
.anim-canvas {
  flex: 1 1 60%;
  min-height: 0;
  position: relative;
  background-color: #edebe6;
  background-image: radial-gradient(circle, #d2cfc8 1px, transparent 1px);
}

.stage-svg {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.ground {
  fill: rgba(30, 25, 15, 0.18);
  filter: blur(6px);
}

.outline {
  fill: rgba(111, 159, 255, 0.06);
  stroke: var(--accent);
}

.outline.dashed {
  stroke-dasharray: 4 3;
}

line.outline {
  fill: none;
}

.handle {
  fill: #fff;
  stroke: var(--accent);
  stroke-width: 1px;
}

.rotate-handle {
  cursor: crosshair;
}

.canvas-hint {
  position: absolute;
  top: 12px;
  left: 16px;
  font-size: 11px;
  color: #8a877f;
  letter-spacing: 0.03em;
  pointer-events: none;
}
</style>
