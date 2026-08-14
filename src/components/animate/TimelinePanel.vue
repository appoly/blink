<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  ROWS,
  hiddenTracks,
  newTrack,
  seamBroken,
  fixSeam,
  keyframeWarning,
  type RowDef,
} from '../../lib/customExpressions'
import type { Track, TrackTarget } from '../../lib/expressions'
import { mouthBaseCurvature } from '../../lib/face'
import type { KeyRef } from '../../stores/animate'
import { useAnimEdit } from './useAnimEdit'

const {
  animate,
  project,
  def,
  settings,
  cycleDuration,
  playheadOffset,
  commit,
  snapOffset,
  ensureKeyframe,
  ensureMorphKeyframe,
  moveKeyframe,
  canDeleteKey,
  deleteSelectedKeys,
  duplicateKey,
  setKeyToNeutral,
  copySelectedKeys,
  pasteKeys,
  trackIndexByTarget,
  removeTrack,
  setSplit,
} = useAnimEdit()

// ---- rows -------------------------------------------------------------------

interface VisibleRow {
  trackIndex: number
  track: Track
  label: string
  row: RowDef
}

const rowFor = (target: TrackTarget): RowDef | undefined =>
  ROWS.find((r) => r.target === target || r.split?.includes(target))

const visibleRows = computed<VisibleRow[]>(() => {
  if (!def.value) return []
  const out: VisibleRow[] = []
  def.value.tracks.forEach((track, trackIndex) => {
    const row = rowFor(track.target)
    if (!row) return // eye-lid layers etc. — preserved, not editable
    const side = row.split?.[0] === track.target ? ' · left' : row.split?.[1] === track.target ? ' · right' : ''
    out.push({ trackIndex, track, label: row.label + side, row })
  })
  return out
})

/** Rows offered by the "+ Track" picker (not already on the timeline). */
const addableRows = computed(() => {
  if (!def.value) return []
  const missing = ROWS.filter(
    (r) => trackIndexByTarget(r.target) < 0 && !(r.split ?? []).some((t) => trackIndexByTarget(t) >= 0),
  )
  return [...missing.map((r) => ({ key: r.key, label: r.label })), ...(!def.value.morph ? [{ key: 'morph', label: 'Mouth shape' }] : [])]
})

const addMenuOpen = ref(false)

function addRow(key: string) {
  addMenuOpen.value = false
  if (!def.value) return
  if (key === 'morph') {
    // Seed from the mouth's resting curvature so adding the row is invisible.
    const base = mouthBaseCurvature(project.value.mouth)
    def.value.morph = [
      { o: 0, curvature: base },
      { o: 100, curvature: base },
    ]
    animate.selectedTrack = 'morph'
  } else {
    const row = ROWS.find((r) => r.key === key)!
    def.value.tracks.push(newTrack(row.target, row))
    animate.selectedTrack = def.value.tracks.length - 1
  }
  animate.selectedKeys = []
  commit()
}

function removeMorph() {
  if (!def.value?.morph) return
  if (def.value.morph.length > 2 && !confirm('Remove the mouth-shape track and its keyframes?')) return
  delete def.value.morph
  if (animate.selectedTrack === 'morph') animate.selectedTrack = null
  animate.selectedKeys = animate.selectedKeys.filter((k) => k.track !== 'morph')
  commit()
}

function isSplit(row: RowDef): boolean {
  return !!row.split && row.split.some((t) => trackIndexByTarget(t) >= 0)
}

// ---- transport ----------------------------------------------------------------

const num = (e: Event) => Number((e.target as HTMLInputElement).value)

function setDuration(e: Event) {
  if (!def.value) return
  def.value.duration = Math.min(8, Math.max(0.3, num(e)))
  commit()
}

function setThumbFrame() {
  if (!def.value) return
  def.value.thumbOffset = playheadOffset.value
  commit()
}

const loopsForever = computed(() => settings.value?.loop !== 'once')

const seamIsBroken = computed(() => (def.value ? seamBroken(def.value, loopsForever.value) : false))

const seamPopover = ref(false)

function applySeamFix() {
  if (!def.value) return
  fixSeam(def.value, loopsForever.value)
  seamPopover.value = false
  commit()
}

// ---- scrubbing ------------------------------------------------------------------

const lanesEl = ref<HTMLElement | null>(null)
let scrubbing = false

function offsetFromEvent(e: { clientX: number }): number {
  const rect = lanesEl.value!.getBoundingClientRect()
  return snapOffset(((e.clientX - rect.left) / rect.width) * 100)
}

function onScrubDown(e: PointerEvent) {
  scrubbing = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  animate.scrub((offsetFromEvent(e) / 100) * cycleDuration.value)
}

function onScrubMove(e: PointerEvent) {
  if (scrubbing) animate.scrub((offsetFromEvent(e) / 100) * cycleDuration.value)
}

function onScrubUp() {
  scrubbing = false
}

/** Double-click on a lane drops a keyframe there, seeded from the current pose. */
function onLaneDblClick(e: MouseEvent, track: number | 'morph') {
  const o = offsetFromEvent(e)
  if (track === 'morph') ensureMorphKeyframe(o)
  else ensureKeyframe(track, o)
  animate.selectKey({ track, o })
  animate.scrub((o / 100) * cycleDuration.value)
  commit()
}

// ---- keyframe interaction ---------------------------------------------------------

// The diamond elements are recreated whenever their offset changes (they are
// keyed by it), so the drag listens on window instead of the element — an
// element-bound drag would die after the first 1% step.
let dragKey: { ref: KeyRef; moved: boolean } | null = null

function onKeyPointerDown(e: PointerEvent, ref: KeyRef) {
  e.stopPropagation()
  if (e.button === 2) return
  e.preventDefault()
  animate.pause()
  animate.selectKey(ref, e.shiftKey)
  animate.scrub((ref.o / 100) * cycleDuration.value)
  dragKey = { ref, moved: false }
  window.addEventListener('pointermove', onKeyDragMove)
  window.addEventListener('pointerup', onKeyDragUp)
}

function onKeyDragMove(e: PointerEvent) {
  if (!dragKey) return
  const o = offsetFromEvent(e)
  if (o !== dragKey.ref.o) {
    const next = moveKeyframe(dragKey.ref, o)
    if (next.o !== dragKey.ref.o) {
      dragKey = { ref: next, moved: true }
      animate.scrub((next.o / 100) * cycleDuration.value)
    }
  }
}

function onKeyDragUp() {
  window.removeEventListener('pointermove', onKeyDragMove)
  window.removeEventListener('pointerup', onKeyDragUp)
  if (dragKey?.moved) commit()
  dragKey = null
}

onBeforeUnmount(onKeyDragUp)

function isSelected(ref: KeyRef): boolean {
  return animate.selectedKeys.some((k) => k.track === ref.track && k.o === ref.o)
}

// Right-click menu on a keyframe.
const menu = ref<{ ref: KeyRef; x: number; y: number } | null>(null)

function openKeyMenu(e: MouseEvent, ref: KeyRef) {
  animate.selectKey(ref)
  menu.value = {
    ref,
    x: Math.min(e.clientX, window.innerWidth - 190),
    y: Math.min(e.clientY, window.innerHeight - 170),
  }
}

// ---- morph curve ---------------------------------------------------------------

/** Polyline of the morph curvature (-1..1) across the row. */
const morphCurve = computed(() => {
  const morph = def.value?.morph
  if (!morph?.length) return ''
  const pts: string[] = []
  const y = (c: number) => 50 - c * 38
  const sorted = [...morph].sort((a, b) => a.o - b.o)
  if (sorted[0].o > 0) pts.push(`0,${y(sorted[0].curvature).toFixed(1)}`)
  for (const kf of sorted) pts.push(`${kf.o},${y(kf.curvature).toFixed(1)}`)
  if (sorted[sorted.length - 1].o < 100) pts.push(`100,${y(sorted[sorted.length - 1].curvature).toFixed(1)}`)
  return pts.join(' ')
})

const hasExtras = computed(() => {
  if (!def.value) return false
  return !!def.value.props?.length || !!def.value.flush || hiddenTracks(def.value).length > 0
})

const extrasText = computed(() => {
  if (!def.value) return ''
  const bits: string[] = []
  if (def.value.props?.length) bits.push('props')
  if (def.value.flush) bits.push('flush')
  if (hiddenTracks(def.value).length) bits.push('eye layers')
  return bits.join(', ')
})

/** Ruler ticks: one per 10%, labelled at the quarters. */
const ticks = computed(() =>
  Array.from({ length: 11 }, (_, i) => {
    const o = i * 10
    return { o, label: o % 25 === 0 || o === 100 ? `${((o / 100) * cycleDuration.value).toFixed(1)}s` : '' }
  }),
)
</script>

<template>
  <div v-if="def && settings" class="timeline">
    <!-- transport -->
    <div class="transport">
      <button class="play" :title="animate.playing ? 'Pause' : 'Play'" @click="animate.togglePlay()">
        {{ animate.playing ? '⏸' : '▶' }}
      </button>
      <button
        class="toggle"
        :class="{ on: animate.loopPreview }"
        title="Loop the preview"
        @click="animate.loopPreview = !animate.loopPreview"
      >
        ⟳
      </button>
      <button
        class="toggle autokey"
        :class="{ on: animate.autoKey }"
        title="Auto-key: posing on the canvas writes keyframes at the playhead"
        @click="animate.autoKey = !animate.autoKey"
      >
        ●
      </button>
      <span class="time">{{ animate.time.toFixed(2) }}s / {{ cycleDuration.toFixed(2) }}s · {{ playheadOffset }}%</span>

      <span class="divider" />

      <label>Duration</label>
      <input type="number" class="dur" min="0.3" max="8" step="0.1" :value="def.duration" @change="setDuration" />
      <span class="unit">s</span>

      <button class="thumb-btn" title="Use the current frame as this expression's thumbnail" @click="setThumbFrame">
        Set thumbnail
      </button>

      <span class="divider" />

      <label>Speed</label>
      <input
        type="range"
        class="tweak"
        min="0.25"
        max="3"
        step="0.05"
        :value="settings.speed"
        @input="settings.speed = num($event)"
        @change="commit"
      />
      <label>Intensity</label>
      <input
        type="range"
        class="tweak"
        min="0"
        max="1.5"
        step="0.05"
        :value="settings.intensity"
        @input="settings.intensity = num($event)"
        @change="commit"
      />

      <span class="spacer" />

      <span v-if="hasExtras" class="extras-chip" :title="`This animation carries non-editable extras (${extrasText}). They are preserved and still play.`">
        extras: {{ extrasText }}
      </span>

      <!-- loop-seam indicator -->
      <button
        class="seam"
        :class="seamIsBroken ? 'broken' : 'ok'"
        :title="seamIsBroken ? 'The loop has a visible seam' : loopsForever ? 'Loop is seamless' : 'Ends at neutral'"
        @click="seamPopover = seamIsBroken ? !seamPopover : false"
      >
        {{ seamIsBroken ? '⚠' : '✓' }}
      </button>
      <div v-if="seamPopover" class="seam-pop">
        <p v-if="loopsForever">The first and last keyframes don't match, so the loop will visibly jump.</p>
        <p v-else>This plays once but doesn't settle back to neutral.</p>
        <button class="primary" @click="applySeamFix">{{ loopsForever ? 'Match end to start' : 'Settle to neutral' }}</button>
      </div>
    </div>

    <!-- ruler + rows -->
    <div class="tracks-area">
      <div class="labels-col">
        <div class="ruler-corner">
          <div class="add-track">
            <button :disabled="!addableRows.length" @click="addMenuOpen = !addMenuOpen">＋ Track</button>
            <div v-if="addMenuOpen" class="add-menu">
              <button v-for="r in addableRows" :key="r.key" @click="addRow(r.key)">{{ r.label }}</button>
            </div>
          </div>
        </div>
        <div
          v-for="vr in visibleRows"
          :key="vr.track.target"
          class="row-label"
          :class="{ selected: animate.selectedTrack === vr.trackIndex }"
          @click="animate.selectedTrack = vr.trackIndex"
        >
          <span class="row-name">{{ vr.label }}</span>
          <span v-if="vr.row.split && vr.track.target === vr.row.target || (vr.row.split && vr.track.target === vr.row.split[0])" class="lr-toggle">
            <button :class="{ on: !isSplit(vr.row) }" @click.stop="setSplit(vr.row, false)">Both</button>
            <button :class="{ on: isSplit(vr.row) }" @click.stop="setSplit(vr.row, true)">L/R</button>
          </span>
          <button class="row-remove" title="Remove track" @click.stop="removeTrack(vr.trackIndex)">×</button>
        </div>
        <div
          v-if="def.morph"
          class="row-label"
          :class="{ selected: animate.selectedTrack === 'morph' }"
          @click="animate.selectedTrack = 'morph'"
        >
          <span class="row-name">Mouth shape</span>
          <button class="row-remove" title="Remove track" @click.stop="removeMorph">×</button>
        </div>
      </div>

      <div class="lanes-col">
        <!-- ruler -->
        <div class="ruler" @pointerdown="onScrubDown" @pointermove="onScrubMove" @pointerup="onScrubUp">
          <span v-for="t in ticks" :key="t.o" class="tick" :style="{ left: `${t.o}%` }">
            <i />
            <em v-if="t.label">{{ t.o }}% · {{ t.label }}</em>
          </span>
        </div>

        <div ref="lanesEl" class="lanes" @pointerdown="onScrubDown" @pointermove="onScrubMove" @pointerup="onScrubUp">
          <div
            v-for="vr in visibleRows"
            :key="vr.track.target"
            class="lane"
            :class="{ selected: animate.selectedTrack === vr.trackIndex }"
            title="Double-click to add a keyframe"
            @dblclick="onLaneDblClick($event, vr.trackIndex)"
          >
            <span
              v-for="kf in vr.track.keyframes"
              :key="kf.o"
              class="key"
              :class="{ selected: isSelected({ track: vr.trackIndex, o: kf.o }), warn: !!keyframeWarning(kf) }"
              :style="{ left: `${kf.o}%` }"
              :title="keyframeWarning(kf) ?? `${kf.o}%`"
              @pointerdown="onKeyPointerDown($event, { track: vr.trackIndex, o: kf.o })"
              @contextmenu.prevent="openKeyMenu($event, { track: vr.trackIndex, o: kf.o })"
            />
          </div>

          <!-- morph row: curvature curve + diamonds -->
          <div
            v-if="def.morph"
            class="lane morph"
            :class="{ selected: animate.selectedTrack === 'morph' }"
            title="Double-click to add a keyframe"
            @dblclick="onLaneDblClick($event, 'morph')"
          >
            <svg class="morph-curve" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="100" y2="50" class="zero" />
              <polyline :points="morphCurve" />
            </svg>
            <span
              v-for="kf in def.morph"
              :key="kf.o"
              class="key"
              :class="{ selected: isSelected({ track: 'morph', o: kf.o }) }"
              :style="{ left: `${kf.o}%` }"
              @pointerdown="onKeyPointerDown($event, { track: 'morph', o: kf.o })"
              @contextmenu.prevent="openKeyMenu($event, { track: 'morph', o: kf.o })"
            />
          </div>

          <!-- playhead -->
          <div class="playhead" :style="{ left: `${(animate.time / cycleDuration) * 100}%` }" />
        </div>
      </div>
    </div>

    <!-- keyframe context menu -->
    <template v-if="menu">
      <div class="ctx-backdrop" @click="menu = null" @contextmenu.prevent="menu = null" />
      <div class="ctx-menu" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }">
        <button :disabled="!canDeleteKey(menu.ref)" @click="deleteSelectedKeys(); menu = null">Delete</button>
        <button @click="duplicateKey(menu.ref); menu = null">Duplicate</button>
        <button @click="setKeyToNeutral(menu.ref); menu = null">Set to neutral</button>
        <button v-if="menu.ref.track !== 'morph'" @click="copySelectedKeys(); menu = null">Copy</button>
        <button v-if="menu.ref.track !== 'morph'" :disabled="!animate.clipboard.length" @click="pasteKeys(); menu = null">
          Paste at playhead
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.timeline {
  flex: 1 1 40%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-top: 1px solid var(--border);
}

.transport {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.play {
  width: 40px;
  height: 30px;
}

.toggle {
  width: 30px;
  height: 30px;
  color: var(--text-dim);
}

.toggle.on {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.toggle.autokey.on {
  color: #e05a5a;
  border-color: #e05a5a;
  background: rgba(224, 90, 90, 0.12);
}

.time {
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: 12px;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}

.transport label {
  font-size: 12px;
  color: var(--text-dim);
}

.dur {
  width: 56px;
}

.unit {
  color: var(--text-dim);
  font-size: 12px;
}

.thumb-btn {
  font-size: 12px;
}

.tweak {
  width: 74px;
}

.spacer {
  flex: 1;
}

.extras-chip {
  font-size: 11px;
  color: var(--text-dim);
  border: 1px dashed var(--border);
  border-radius: 999px;
  padding: 2px 10px;
  white-space: nowrap;
}

.seam {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 13px;
}

.seam.ok {
  color: #58b06a;
  border-color: #58b06a;
}

.seam.broken {
  color: #e0a13c;
  border-color: #e0a13c;
  background: rgba(224, 161, 60, 0.12);
}

.seam-pop {
  position: absolute;
  right: 10px;
  top: 100%;
  margin-top: 4px;
  z-index: 40;
  width: 240px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.seam-pop p {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-dim);
}

.tracks-area {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow-y: auto;
}

.labels-col {
  flex: 0 0 168px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.ruler-corner {
  height: 26px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.add-track {
  position: relative;
}

.add-track > button {
  font-size: 11px;
  padding: 2px 8px;
}

.add-menu {
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 40;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.add-menu button {
  border: none;
  background: transparent;
  text-align: left;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 12px;
}

.add-menu button:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.row-label {
  height: 26px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px 0 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  white-space: nowrap;
}

.row-label.selected {
  background: var(--accent-soft);
  color: var(--accent);
}

.row-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lr-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 5px;
  overflow: hidden;
}

.lr-toggle button {
  border: none;
  border-radius: 0;
  background: transparent;
  font-size: 10px;
  padding: 1px 6px;
  color: var(--text-dim);
}

.lr-toggle button.on {
  background: var(--accent-soft);
  color: var(--accent);
}

.row-remove {
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 13px;
  padding: 0 3px;
}

.row-remove:hover {
  color: #e07070;
}

.lanes-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-right: 14px;
}

.ruler {
  position: relative;
  height: 26px;
  border-bottom: 1px solid var(--border);
  cursor: ew-resize;
  touch-action: none;
}

.tick {
  position: absolute;
  top: 0;
  bottom: 0;
}

.tick i {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 1px;
  height: 7px;
  background: var(--border);
}

.tick em {
  position: absolute;
  top: 3px;
  left: 3px;
  font-style: normal;
  font-size: 9px;
  color: var(--text-dim);
  white-space: nowrap;
}

/* The 100% label sits left of its tick so it isn't clipped at the edge. */
.tick:last-child em {
  left: auto;
  right: 3px;
}

.lanes {
  position: relative;
  flex: 1;
  touch-action: none;
}

.lane {
  position: relative;
  height: 26px;
  border-bottom: 1px solid var(--border);
}

.lane.selected {
  background: rgba(111, 159, 255, 0.06);
}

.key {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: var(--panel-2);
  border: 1.5px solid var(--text-dim);
  border-radius: 2px;
  cursor: ew-resize;
  touch-action: none;
}

.key:hover {
  border-color: var(--accent);
}

.key.selected {
  background: var(--accent);
  border-color: var(--accent);
}

.key.warn {
  border-color: #e0a13c;
}

.morph-curve {
  position: absolute;
  inset: 2px 0;
  width: 100%;
  height: calc(100% - 4px);
  pointer-events: none;
}

.morph-curve polyline {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.morph-curve .zero {
  stroke: var(--border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 2 3;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: #e05a5a;
  pointer-events: none;
}

.ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
}

.ctx-menu {
  position: fixed;
  z-index: 91;
  min-width: 170px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.ctx-menu button {
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 10px;
  border-radius: 5px;
}

.ctx-menu button:hover:not(:disabled) {
  background: var(--accent-soft);
  color: var(--accent);
}

.ctx-menu button:disabled {
  color: var(--text-dim);
}
</style>
