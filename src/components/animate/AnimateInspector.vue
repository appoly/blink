<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import EaseGlyph from './EaseGlyph.vue'
import { EASING_PRESETS } from './easing'
import { useAnimEdit } from './useAnimEdit'
import { ROWS, expressionLabel, keyframeWarning, nameError, removeCustomExpression } from '../../lib/customExpressions'
import { mouthMorphPath } from '../../lib/face'
import type { MorphKeyframe, Track, TransformKeyframe } from '../../lib/expressions'
import type { LoopMode } from '../../types/avatar'

const {
  animate,
  editor,
  project,
  def,
  settings,
  commit,
  keyframeAt,
  moveKeyframe,
  deleteSelectedKeys,
  canDeleteKey,
  rename,
} = useAnimEdit()

const num = (e: Event) => Number((e.target as HTMLInputElement).value)

// ---- animation section ------------------------------------------------------

const nameDraft = ref('')
const nameErr = ref<string | null>(null)

watch(
  () => def.value?.name,
  () => {
    nameDraft.value = def.value ? expressionLabel(def.value) : ''
    nameErr.value = null
  },
  { immediate: true },
)

function applyRename() {
  if (!def.value) return
  if (nameDraft.value.trim() === expressionLabel(def.value)) return
  const err = nameError(project.value, nameDraft.value, def.value.name)
  nameErr.value = err
  if (!err) rename(nameDraft.value)
}

const loopChoice = computed(() => {
  const loop = settings.value?.loop
  return typeof loop === 'number' ? 'count' : (loop ?? 'infinite')
})

function setLoop(e: Event) {
  if (!settings.value) return
  const value = (e.target as HTMLSelectElement).value
  settings.value.loop = (value === 'count' ? 3 : value) as LoopMode
  commit()
}

function toggleOwnsEyes() {
  if (!def.value) return
  // Store true or drop the key entirely — matches how presets carry the flag.
  if (def.value.ownsEyes) delete def.value.ownsEyes
  else def.value.ownsEyes = true
  commit()
}

function deleteAnimation() {
  if (!def.value) return
  if (!confirm(`Delete "${expressionLabel(def.value)}"? You can undo this with ⌘Z.`)) return
  const name = def.value.name
  removeCustomExpression(project.value, name)
  if (editor.currentExpression === name) editor.currentExpression = 'idle'
  animate.close()
  commit()
}

// ---- track section -----------------------------------------------------------

const selectedTrack = computed<Track | null>(() =>
  typeof animate.selectedTrack === 'number' ? (def.value?.tracks[animate.selectedTrack] ?? null) : null,
)

const selectedRow = computed(() => {
  const t = selectedTrack.value
  if (!t) return null
  return ROWS.find((r) => r.target === t.target || r.split?.includes(t.target)) ?? null
})

const ORIGIN_PRESETS = [
  { label: 'Ground (50% 100%)', value: '50% 100%' },
  { label: 'Center (50% 50%)', value: '50% 50%' },
  { label: 'Top (50% 0%)', value: '50% 0%' },
] as const

const originChoice = computed(() => {
  const origin = selectedTrack.value?.origin ?? '50% 50%'
  return ORIGIN_PRESETS.some((p) => p.value === origin) ? origin : 'custom'
})

function setOrigin(e: Event) {
  if (!selectedTrack.value) return
  selectedTrack.value.origin = (e.target as HTMLSelectElement).value
  commit()
}

function toggleUnit() {
  if (!selectedTrack.value) return
  if (selectedTrack.value.unit === '%') delete selectedTrack.value.unit
  else selectedTrack.value.unit = '%'
  commit()
}

// ---- keyframe section ----------------------------------------------------------

const activeRef = computed(() => animate.selectedKeys[animate.selectedKeys.length - 1] ?? null)

const activeKf = computed(() => (activeRef.value ? keyframeAt(activeRef.value) : undefined))

const isMorphKf = computed(() => activeRef.value?.track === 'morph')

const transformKf = computed(() => (!isMorphKf.value ? (activeKf.value as TransformKeyframe | undefined) : undefined))
const morphKf = computed(() => (isMorphKf.value ? (activeKf.value as MorphKeyframe | undefined) : undefined))

/** The row whose track owns the active keyframe (for the opacity field). */
const activeKfRow = computed(() => {
  const ref = activeRef.value
  if (!ref || ref.track === 'morph') return null
  const t = def.value?.tracks[ref.track]
  if (!t) return null
  return ROWS.find((r) => r.target === t.target || r.split?.includes(t.target)) ?? null
})

const warning = computed(() => (transformKf.value ? keyframeWarning(transformKf.value) : null))

function setOffset(e: Event) {
  if (!activeRef.value) return
  moveKeyframe(activeRef.value, num(e))
  commit()
}

function setField(field: 'tx' | 'ty' | 'r' | 'sx' | 'sy' | 'opacity', e: Event) {
  if (!transformKf.value) return
  transformKf.value[field] = num(e)
  commit()
}

function setCurvature(e: Event) {
  if (!morphKf.value) return
  morphKf.value.curvature = Math.max(-1, Math.min(1, num(e)))
  commit()
}

const activeEase = computed(() => activeKf.value?.ease)

function setEase(value: string) {
  for (const ref of animate.selectedKeys) {
    const kf = keyframeAt(ref)
    if (kf) kf.ease = value
  }
  commit()
}

/** Live mini-preview of the mouth curve at the selected curvature. */
const morphPreviewPath = computed(() => {
  if (!morphKf.value) return null
  return mouthMorphPath(project.value.mouth, morphKf.value.curvature)
})

const translationUnit = computed(() => (selectedTrackForKf.value?.unit === '%' ? '%' : 'px'))

const selectedTrackForKf = computed(() => {
  const ref = activeRef.value
  if (!ref || ref.track === 'morph') return null
  return def.value?.tracks[ref.track] ?? null
})
</script>

<template>
  <div v-if="def && settings" class="anim-inspector">
    <!-- animation -->
    <div class="section-title">Animation</div>
    <div class="field">
      <label>Name</label>
      <input :value="nameDraft" @input="nameDraft = ($event.target as HTMLInputElement).value" @change="applyRename" @keydown.enter="applyRename" />
      <span v-if="nameErr" class="error">{{ nameErr }}</span>
    </div>
    <div class="field">
      <label>Loop</label>
      <div class="row">
        <select :value="loopChoice" @change="setLoop">
          <option value="infinite">Forever</option>
          <option value="once">Once</option>
          <option value="count">N times</option>
        </select>
        <input
          v-if="loopChoice === 'count'"
          type="number"
          style="width: 48px"
          min="1"
          max="99"
          :value="settings.loop"
          @change="settings.loop = Math.max(1, num($event)); commit()"
        />
      </div>
    </div>
    <div class="field">
      <label class="check">
        <input type="checkbox" :checked="settings.include" @change="settings.include = !settings.include; commit()" />
        Include in export
      </label>
    </div>
    <div class="field">
      <label
        class="check"
        title="The idle blink normally keeps running underneath every expression. Suspend it if a frozen mid-blink spoils this animation — but note the character won't blink at all while it plays."
      >
        <input type="checkbox" :checked="!!def.ownsEyes" @change="toggleOwnsEyes" />
        Suspend idle blink
      </label>
    </div>
    <button class="danger-btn" @click="deleteAnimation">Delete animation…</button>

    <!-- keyframe -->
    <template v-if="animate.selectedKeys.length > 1">
      <div class="section-title">{{ animate.selectedKeys.length }} keyframes</div>
      <div class="field">
        <label>Easing (from each keyframe to the next)</label>
        <div class="ease-grid">
          <button v-for="p in EASING_PRESETS" :key="p.label" :title="p.label" @click="setEase(p.value)">
            <EaseGlyph :ease="p.value" />
            <span>{{ p.label }}</span>
          </button>
        </div>
      </div>
      <button class="danger-btn" @click="deleteSelectedKeys">Delete keyframes</button>
    </template>

    <template v-else-if="transformKf && activeRef">
      <div class="section-title">Keyframe</div>
      <div class="field">
        <label>Time</label>
        <div class="row">
          <input type="number" min="0" max="100" :value="transformKf.o" @change="setOffset" />
          <span class="suffix">%</span>
        </div>
      </div>
      <div class="pair">
        <div class="field">
          <label>Move X ({{ translationUnit }})</label>
          <input type="number" step="0.5" :value="transformKf.tx ?? 0" @change="setField('tx', $event)" />
        </div>
        <div class="field">
          <label>Move Y ({{ translationUnit }})</label>
          <input type="number" step="0.5" :value="transformKf.ty ?? 0" @change="setField('ty', $event)" />
        </div>
      </div>
      <div class="pair">
        <div class="field">
          <label>Scale X</label>
          <input type="number" step="0.05" :value="transformKf.sx ?? 1" @change="setField('sx', $event)" />
        </div>
        <div class="field">
          <label>Scale Y</label>
          <input type="number" step="0.05" :value="transformKf.sy ?? 1" @change="setField('sy', $event)" />
        </div>
      </div>
      <div class="pair">
        <div class="field">
          <label>Rotate (°)</label>
          <input type="number" step="1" :value="transformKf.r ?? 0" @change="setField('r', $event)" />
        </div>
        <div v-if="activeKfRow?.hasOpacity" class="field">
          <label>Opacity</label>
          <input type="number" step="0.1" min="0" max="1" :value="transformKf.opacity ?? 1" @change="setField('opacity', $event)" />
        </div>
      </div>
      <p v-if="warning" class="warn">⚠ {{ warning }}</p>
      <div class="field">
        <label>Easing to next keyframe</label>
        <div class="ease-grid">
          <button
            v-for="p in EASING_PRESETS"
            :key="p.label"
            :class="{ on: (activeEase ?? selectedTrackForKf?.ease) === p.value }"
            :title="p.label"
            @click="setEase(p.value)"
          >
            <EaseGlyph :ease="p.value" />
            <span>{{ p.label }}</span>
          </button>
        </div>
      </div>
      <button class="danger-btn" :disabled="!canDeleteKey(activeRef)" @click="deleteSelectedKeys">Delete keyframe</button>
    </template>

    <template v-else-if="morphKf && activeRef">
      <div class="section-title">Mouth shape keyframe</div>
      <div class="field">
        <label>Time</label>
        <div class="row">
          <input type="number" min="0" max="100" :value="morphKf.o" @change="setOffset" />
          <span class="suffix">%</span>
        </div>
      </div>
      <div class="field">
        <label>Curvature ({{ morphKf.curvature.toFixed(2) }})</label>
        <input type="range" min="-1" max="1" step="0.05" :value="morphKf.curvature" @input="setCurvature" @change="commit" />
      </div>
      <div v-if="morphPreviewPath" class="mouth-preview">
        <svg :viewBox="`${-project.mouth.width / 2 - 6} ${-project.mouth.height * 2.4} ${project.mouth.width + 12} ${project.mouth.height * 4.8}`">
          <path :d="morphPreviewPath" fill="none" :stroke="project.mouth.color" stroke-width="3" stroke-linecap="round" />
        </svg>
      </div>
      <p v-else class="warn">The "o" mouth style doesn't morph — this track has no effect until the mouth style changes.</p>
      <div class="field">
        <label>Easing to next keyframe</label>
        <div class="ease-grid">
          <button v-for="p in EASING_PRESETS" :key="p.label" :class="{ on: activeEase === p.value }" :title="p.label" @click="setEase(p.value)">
            <EaseGlyph :ease="p.value" />
            <span>{{ p.label }}</span>
          </button>
        </div>
      </div>
      <button class="danger-btn" :disabled="!canDeleteKey(activeRef)" @click="deleteSelectedKeys">Delete keyframe</button>
    </template>

    <!-- track -->
    <template v-else-if="selectedTrack && selectedRow">
      <div class="section-title">Track — {{ selectedRow.label }}</div>
      <div class="field">
        <label>Transform origin</label>
        <select :value="originChoice" @change="setOrigin">
          <option v-for="p in ORIGIN_PRESETS" :key="p.value" :value="p.value">{{ p.label }}</option>
          <option v-if="originChoice === 'custom'" value="custom" disabled>Custom ({{ selectedTrack.origin }})</option>
        </select>
      </div>
      <div class="field">
        <label
          class="check"
          title="With this on, movement is stored as a percentage of the body size, so the motion stays correct on any character proportions."
        >
          <input type="checkbox" :checked="selectedTrack.unit === '%'" @change="toggleUnit" />
          Scale with body size
        </label>
      </div>
      <p class="hint">
        Scrub the timeline, then drag the character on the canvas to pose it — a keyframe is written at the playhead.
        Double-click the row to add a keyframe by hand.
      </p>
    </template>

    <template v-else-if="animate.selectedTrack === 'morph'">
      <div class="section-title">Track — Mouth shape</div>
      <p class="hint">Double-click the row to add a keyframe, then edit its curvature (-1 frown … 1 smile) here.</p>
    </template>

    <p v-else class="hint">
      Select a track or keyframe on the timeline, or drag the character on the canvas to start posing.
    </p>
  </div>
</template>

<style scoped>
.anim-inspector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  margin-top: 6px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 12px;
  color: var(--text-dim);
}

.field input[type='number'],
.field input:not([type]),
.field select {
  width: 100%;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.suffix {
  color: var(--text-dim);
  font-size: 12px;
}

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.error {
  color: #e07070;
  font-size: 11px;
}

.warn {
  margin: 0;
  color: #e0a13c;
  font-size: 11px;
}

.hint {
  margin: 0;
  color: var(--text-dim);
  font-size: 12px;
}

.danger-btn {
  align-self: flex-start;
  color: #e07070;
  font-size: 12px;
}

.danger-btn:disabled {
  color: var(--text-dim);
}

.ease-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.ease-grid button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  font-size: 11px;
  color: var(--text-dim);
}

.ease-grid button.on {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.mouth-preview {
  height: 56px;
  display: grid;
  place-items: center;
  background: #edebe6;
  border-radius: 8px;
}

.mouth-preview svg {
  height: 100%;
  max-width: 100%;
}
</style>
