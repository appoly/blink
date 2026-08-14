<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AvatarSvg from '../AvatarSvg.vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { clampPartPosition, createPart } from '../../lib/parts'
import { baseAvatarCss } from '../../lib/animationCss'
import { useInjectedStyle } from '../../composables/useInjectedStyle'
import type { Part, PartKind } from '../../types/avatar'

const editor = useEditorStore()
const store = useProjectStore()
const project = computed(() => store.project)

const svgEl = ref<SVGSVGElement | null>(null)

// Idle blink/drift run on the canvas too, via the same generated CSS.
useInjectedStyle(computed(() => baseAvatarCss(project.value, '.canvas-stage', 'canvas')))

// ---- coordinate helpers -------------------------------------------------

function screenPoint(e: PointerEvent | DragEvent | WheelEvent): { x: number; y: number } {
  const rect = svgEl.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function toWorld(sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - editor.panX) / editor.zoom, y: (sy - editor.panY) / editor.zoom }
}

const selectedPart = computed<Part | null>(() => {
  const sel = editor.selection
  if (sel?.kind !== 'part') return null
  return project.value.parts.find((p) => p.id === sel.id) ?? null
})

// ---- pan / zoom ---------------------------------------------------------

const spaceDown = ref(false)

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const s = screenPoint(e)
  if (e.ctrlKey || e.metaKey) {
    editor.zoomBy(Math.exp(-e.deltaY * 0.01), s.x, s.y)
  } else {
    editor.panX -= e.deltaX
    editor.panY -= e.deltaY
  }
}

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return

  if (e.code === 'Space') {
    spaceDown.value = e.type === 'keydown'
    if (e.type === 'keydown') e.preventDefault()
    return
  }
  if (e.type !== 'keydown' || editor.tab !== 'pose') return

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPart.value) {
    store.project.parts = store.project.parts.filter((p) => p.id !== selectedPart.value!.id)
    editor.select(null)
    store.commit()
    return
  }
  if (e.key === 'Escape') {
    editor.select(null)
    return
  }
  const nudges: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  const nudge = nudges[e.key]
  if (nudge && selectedPart.value && !selectedPart.value.locked) {
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    const pos = clampPartPosition(project.value, selectedPart.value.x + nudge[0] * step, selectedPart.value.y + nudge[1] * step)
    selectedPart.value.x = pos.x
    selectedPart.value.y = pos.y
    store.commit()
  }
}

// ---- drag state machine -------------------------------------------------

type DragMode =
  | { mode: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { mode: 'move'; part: Part; startWorld: { x: number; y: number }; start: { x: number; y: number } }
  | { mode: 'move-eyes'; grabbed: 'left' | 'right' }
  | { mode: 'move-mouth' }
  | {
      mode: 'resize'
      part: Part
      dx: number
      dy: number
      w0: number
      h0: number
      c0: { x: number; y: number }
      rot: number
    }
  | { mode: 'rotate'; part: Part; c0: { x: number; y: number } }
  | null

let drag: DragMode = null

const snapGuides = ref<{ v: number | null; h: number | null }>({ v: null, h: null })

function onPointerDown(e: PointerEvent) {
  if (e.button === 1 || spaceDown.value || e.button === 2) {
    drag = { mode: 'pan', startX: e.clientX, startY: e.clientY, panX: editor.panX, panY: editor.panY }
    svgEl.value!.setPointerCapture(e.pointerId)
    return
  }
  if (e.button !== 0) return

  const target = e.target as Element
  const partEl = target.closest('[data-part-id]')
  if (partEl) {
    const id = (partEl.getAttribute('data-part-id') ?? '').replace(/--mirror$/, '')
    const part = project.value.parts.find((p) => p.id === id)
    if (part) {
      editor.select({ kind: 'part', id })
      if (!part.locked) {
        const s = screenPoint(e)
        drag = { mode: 'move', part, startWorld: toWorld(s.x, s.y), start: { x: part.x, y: part.y } }
        svgEl.value!.setPointerCapture(e.pointerId)
      }
      return
    }
  }
  if (target.closest('.avatar-eye')) {
    const isLeft = !!target.closest('.avatar-eye--left')
    editor.select({ kind: 'eyes' })
    drag = { mode: 'move-eyes', grabbed: isLeft ? 'left' : 'right' }
    svgEl.value!.setPointerCapture(e.pointerId)
    return
  }
  if (target.closest('.avatar-mouth-wrap')) {
    editor.select({ kind: 'mouth' })
    drag = { mode: 'move-mouth' }
    svgEl.value!.setPointerCapture(e.pointerId)
    return
  }
  if (target.closest('.avatar-body')) {
    editor.select({ kind: 'body' })
    return
  }
  editor.select(null)
}

function startResize(e: PointerEvent, dx: number, dy: number) {
  const part = selectedPart.value
  if (!part || part.locked) return
  e.stopPropagation()
  drag = { mode: 'resize', part, dx, dy, w0: part.width, h0: part.height, c0: { x: part.x, y: part.y }, rot: part.rotation }
  svgEl.value!.setPointerCapture(e.pointerId)
}

function startRotate(e: PointerEvent) {
  const part = selectedPart.value
  if (!part || part.locked) return
  e.stopPropagation()
  drag = { mode: 'rotate', part, c0: { x: part.x, y: part.y } }
  svgEl.value!.setPointerCapture(e.pointerId)
}

/** Snap a proposed centre position; returns snapped value + guide lines. */
function applySnapping(part: Part, nx: number, ny: number): { x: number; y: number } {
  const threshold = 6 / editor.zoom
  const body = project.value.body
  const xTargets = [0, -body.width / 2, body.width / 2]
  const yTargets = [0, -body.height / 2, body.height / 2]
  for (const other of project.value.parts) {
    if (other.id === part.id || other.hidden) continue
    xTargets.push(other.x, other.x - other.width / 2, other.x + other.width / 2)
    yTargets.push(other.y, other.y - other.height / 2, other.y + other.height / 2)
  }
  const xOffsets = [0, -part.width / 2, part.width / 2]
  const yOffsets = [0, -part.height / 2, part.height / 2]

  let bestX: { snapped: number; guide: number } | null = null
  let bestY: { snapped: number; guide: number } | null = null
  let bestDx = threshold
  let bestDy = threshold
  for (const t of xTargets) {
    for (const off of xOffsets) {
      const d = Math.abs(t - (nx + off))
      if (d < bestDx) {
        bestDx = d
        bestX = { snapped: t - off, guide: t }
      }
    }
  }
  for (const t of yTargets) {
    for (const off of yOffsets) {
      const d = Math.abs(t - (ny + off))
      if (d < bestDy) {
        bestDy = d
        bestY = { snapped: t - off, guide: t }
      }
    }
  }
  snapGuides.value = { v: bestX ? bestX.guide : null, h: bestY ? bestY.guide : null }
  return { x: bestX ? bestX.snapped : nx, y: bestY ? bestY.snapped : ny }
}

function onPointerMove(e: PointerEvent) {
  if (!drag) return
  const s = screenPoint(e)
  const w = toWorld(s.x, s.y)

  if (drag.mode === 'pan') {
    editor.panX = drag.panX + (e.clientX - drag.startX)
    editor.panY = drag.panY + (e.clientY - drag.startY)
    return
  }

  if (drag.mode === 'move') {
    const part = drag.part
    const nx = drag.start.x + (w.x - drag.startWorld.x)
    const ny = drag.start.y + (w.y - drag.startWorld.y)
    const snapped = applySnapping(part, nx, ny)
    const clamped = clampPartPosition(project.value, snapped.x, snapped.y)
    part.x = clamped.x
    part.y = clamped.y
    return
  }

  if (drag.mode === 'move-eyes') {
    const eyes = project.value.eyes
    eyes.spacing = Math.max(4, Math.min(project.value.body.width, Math.abs(w.x)))
    eyes.offsetY = Math.max(-project.value.body.height, Math.min(project.value.body.height, w.y))
    return
  }

  if (drag.mode === 'move-mouth') {
    project.value.mouth.offsetY = Math.max(-project.value.body.height, Math.min(project.value.body.height, w.y))
    return
  }

  if (drag.mode === 'rotate') {
    const angle = (Math.atan2(w.y - drag.c0.y, w.x - drag.c0.x) * 180) / Math.PI + 90
    drag.part.rotation = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle * 10) / 10
    return
  }

  if (drag.mode === 'resize') {
    const { part, dx, dy, w0, h0, c0, rot } = drag
    // Pointer position in the part's original local frame.
    const rad = (-rot * Math.PI) / 180
    const lx = (w.x - c0.x) * Math.cos(rad) - (w.y - c0.y) * Math.sin(rad)
    const ly = (w.x - c0.x) * Math.sin(rad) + (w.y - c0.y) * Math.cos(rad)
    const fromCenter = e.altKey

    let newW = w0
    let newH = h0
    if (dx !== 0) {
      const ax = fromCenter ? 0 : -dx * (w0 / 2)
      newW = Math.max(4, fromCenter ? 2 * lx * dx : (lx - ax) * dx)
    }
    if (dy !== 0) {
      const ay = fromCenter ? 0 : -dy * (h0 / 2)
      newH = Math.max(4, fromCenter ? 2 * ly * dy : (ly - ay) * dy)
    }
    if (e.shiftKey && dx !== 0 && dy !== 0) {
      const scale = Math.max(newW / w0, newH / h0)
      newW = w0 * scale
      newH = h0 * scale
    }
    // Keep the anchor (opposite handle, or centre with Alt) fixed.
    let ncx = 0
    let ncy = 0
    if (!fromCenter) {
      if (dx !== 0) ncx = -dx * (w0 / 2) + dx * (newW / 2)
      if (dy !== 0) ncy = -dy * (h0 / 2) + dy * (newH / 2)
    }
    const rad2 = (rot * Math.PI) / 180
    part.width = newW
    part.height = newH
    part.x = c0.x + ncx * Math.cos(rad2) - ncy * Math.sin(rad2)
    part.y = c0.y + ncx * Math.sin(rad2) + ncy * Math.cos(rad2)
  }
}

function onPointerUp(e: PointerEvent) {
  if (!drag) return
  const wasChange = drag.mode !== 'pan'
  drag = null
  snapGuides.value = { v: null, h: null }
  if (svgEl.value?.hasPointerCapture(e.pointerId)) svgEl.value.releasePointerCapture(e.pointerId)
  if (wasChange) store.commit()
}

// ---- palette drop -------------------------------------------------------

function onDrop(e: DragEvent) {
  const kind = e.dataTransfer?.getData('application/x-avatar-shape')
  if (!kind) return
  e.preventDefault()
  const s = screenPoint(e)
  const w = toWorld(s.x, s.y)
  const pos = clampPartPosition(project.value, w.x, w.y)
  const part = createPart(kind as PartKind, pos.x, pos.y)
  store.project.parts.push(part)
  editor.select({ kind: 'part', id: part.id })
  store.commit()
}

// ---- overlays -----------------------------------------------------------

const HANDLES: { dx: number; dy: number; cursor: string }[] = [
  { dx: -1, dy: -1, cursor: 'nwse-resize' },
  { dx: 0, dy: -1, cursor: 'ns-resize' },
  { dx: 1, dy: -1, cursor: 'nesw-resize' },
  { dx: 1, dy: 0, cursor: 'ew-resize' },
  { dx: 1, dy: 1, cursor: 'nwse-resize' },
  { dx: 0, dy: 1, cursor: 'ns-resize' },
  { dx: -1, dy: 1, cursor: 'nesw-resize' },
  { dx: -1, dy: 0, cursor: 'ew-resize' },
]

const px = computed(() => 1 / editor.zoom) // 1 screen pixel in world units
const guideExtent = 4000

const groundY = computed(() => project.value.body.height / 2 + 14)

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  const rect = svgEl.value!.getBoundingClientRect()
  editor.panX = rect.width / 2
  editor.panY = rect.height * 0.52
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
})
</script>

<template>
  <div
    class="canvas-stage"
    :class="{ panning: spaceDown }"
    :style="{
      backgroundSize: `${24 * editor.zoom}px ${24 * editor.zoom}px`,
      backgroundPosition: `${editor.panX}px ${editor.panY}px`,
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
      @dragover.prevent
      @drop="onDrop"
    >
      <g :transform="`translate(${editor.panX} ${editor.panY}) scale(${editor.zoom})`">
        <!-- ground shadow -->
        <ellipse class="ground" cx="0" :cy="groundY" :rx="project.body.width * 0.62" :ry="12" />

        <AvatarSvg :project="project" id-prefix="ed" bare />

        <!-- snap guides -->
        <line
          v-if="snapGuides.v !== null"
          class="guide"
          :x1="snapGuides.v"
          :x2="snapGuides.v"
          :y1="-guideExtent"
          :y2="guideExtent"
          :stroke-width="px"
        />
        <line
          v-if="snapGuides.h !== null"
          class="guide"
          :y1="snapGuides.h"
          :y2="snapGuides.h"
          :x1="-guideExtent"
          :x2="guideExtent"
          :stroke-width="px"
        />

        <!-- body / eyes / mouth selection outlines -->
        <rect
          v-if="editor.selection?.kind === 'body'"
          class="outline dashed"
          :x="-project.body.width / 2"
          :y="-project.body.height / 2"
          :width="project.body.width"
          :height="project.body.height"
          :stroke-width="1.5 * px"
        />
        <rect
          v-if="editor.selection?.kind === 'eyes'"
          class="outline dashed"
          :x="-project.eyes.spacing - project.eyes.size * 1.4"
          :y="project.eyes.offsetY - project.eyes.size * 1.4"
          :width="(project.eyes.spacing + project.eyes.size * 1.4) * 2"
          :height="project.eyes.size * 2.8"
          :stroke-width="1.5 * px"
        />
        <rect
          v-if="editor.selection?.kind === 'mouth'"
          class="outline dashed"
          :x="-project.mouth.width / 2 - 4"
          :y="project.mouth.offsetY - project.mouth.height - 4"
          :width="project.mouth.width + 8"
          :height="project.mouth.height * 2 + 8"
          :stroke-width="1.5 * px"
        />

        <!-- part selection: outline + resize/rotate handles -->
        <g
          v-if="selectedPart"
          :transform="`translate(${selectedPart.x} ${selectedPart.y}) rotate(${selectedPart.rotation})`"
        >
          <rect
            class="outline"
            :x="-selectedPart.width / 2"
            :y="-selectedPart.height / 2"
            :width="selectedPart.width"
            :height="selectedPart.height"
            :stroke-width="1.5 * px"
          />
          <line
            class="outline"
            x1="0"
            :y1="-selectedPart.height / 2"
            x2="0"
            :y2="-selectedPart.height / 2 - 18 * px"
            :stroke-width="1.5 * px"
          />
          <circle
            class="handle rotate-handle"
            cx="0"
            :cy="-selectedPart.height / 2 - 24 * px"
            :r="5 * px"
            @pointerdown="startRotate"
          />
          <rect
            v-for="h in HANDLES"
            :key="`${h.dx},${h.dy}`"
            class="handle"
            :x="(h.dx * selectedPart.width) / 2 - 4 * px"
            :y="(h.dy * selectedPart.height) / 2 - 4 * px"
            :width="8 * px"
            :height="8 * px"
            :style="{ cursor: h.cursor }"
            @pointerdown="startResize($event, h.dx, h.dy)"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Light canvas under dark chrome so any character colour stays visible. */
.canvas-stage {
  flex: 1;
  min-height: 0;
  position: relative;
  background-color: #edebe6;
  background-image: radial-gradient(circle, #d2cfc8 1px, transparent 1px);
}

.canvas-stage.panning {
  cursor: grab;
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

.guide {
  stroke: #ff5f9e;
}

.outline {
  fill: none;
  stroke: var(--accent);
}

.outline.dashed {
  stroke-dasharray: 4 3;
}

.handle {
  fill: #fff;
  stroke: var(--accent);
  stroke-width: 1px;
}

.rotate-handle {
  cursor: crosshair;
}
</style>
