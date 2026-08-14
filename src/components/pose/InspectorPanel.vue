<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { PALETTES } from '../../lib/palettes'
import { bandOf, clonePart, setBand, type Band } from '../../lib/parts'
import type { BodyKind, EyeStyle, Fill, MouthStyle, Part, PartKind, Stroke } from '../../types/avatar'

const editor = useEditorStore()
const store = useProjectStore()
const project = computed(() => store.project)

const selectedPart = computed<Part | null>(() => {
  const sel = editor.selection
  if (sel?.kind !== 'part') return null
  return project.value.parts.find((p) => p.id === sel.id) ?? null
})

const num = (e: Event) => Number((e.target as HTMLInputElement).value)
const commit = () => store.commit()

function setFillColor(fill: Fill, color: string) {
  fill.color = color
  commit()
}

function toggleStroke(target: { stroke: Stroke | null }) {
  target.stroke = target.stroke ? null : { color: '#5c4327', width: 3 }
  commit()
}

function deletePart(part: Part) {
  store.project.parts = store.project.parts.filter((p) => p.id !== part.id)
  editor.select(null)
  commit()
}

function duplicatePart(part: Part) {
  const copy = clonePart(part, project.value)
  store.project.parts.splice(store.project.parts.indexOf(part) + 1, 0, copy)
  editor.select({ kind: 'part', id: copy.id })
  commit()
}

function setLayer(part: Part, e: Event) {
  setBand(part, (e.target as HTMLSelectElement).value as Band)
  commit()
}

function togglePerCorner(part: Part) {
  const r = part.cornerRadius
  part.corners = part.corners ? null : [r, r, r, r]
  commit()
}

function setCorner(part: Part, index: number, e: Event) {
  if (!part.corners) return
  part.corners[index] = Math.max(0, num(e))
  commit()
}

function setKind(part: Part, e: Event) {
  const kind = (e.target as HTMLSelectElement).value as PartKind
  part.kind = kind
  if (kind === 'arc' && part.bend == null) part.bend = 0.6
  if (kind === 'rect' && part.cornerRadius === 0) part.cornerRadius = 6
  commit()
}

const BODY_KINDS = [
  ['rect', 'Rounded rect'],
  ['circle', 'Circle'],
  ['ellipse', 'Ellipse'],
  ['capsule', 'Capsule'],
  ['trapezoid', 'Trapezoid'],
  ['tapered', 'Tapered — wide top'],
  ['blob', 'Blob'],
] as const

const PART_KINDS = [
  ['rect', 'Rounded rect'],
  ['circle', 'Circle'],
  ['ellipse', 'Ellipse'],
  ['capsule', 'Capsule'],
  ['arc', 'Arc / curve'],
  ['trapezoid', 'Trapezoid'],
  ['blob', 'Blob'],
  ['triangle', 'Triangle'],
  ['star', 'Star'],
  ['heart', 'Heart'],
  ['strip', 'Strip'],
] as const

const EYE_STYLES = ['round', 'oval', 'halfmoon', 'bean'] as const
const MOUTH_STYLES = ['smile', 'open', 'flat', 'o', 'cat', 'tongue'] as const
</script>

<template>
  <div class="inspector">
    <!-- BODY -->
    <template v-if="editor.selection?.kind === 'body'">
      <div class="section-title">Body</div>
      <div class="field">
        <label>Shape</label>
        <select :value="project.body.kind" @change="project.body.kind = ($event.target as HTMLSelectElement).value as BodyKind; commit()">
          <option v-for="[kind, label] in BODY_KINDS" :key="kind" :value="kind">{{ label }}</option>
        </select>
      </div>
      <div class="field">
        <label>Width</label>
        <div class="row">
          <input type="range" min="40" max="400" :value="project.body.width" @input="project.body.width = num($event)" @change="commit" />
          <input type="number" style="width: 56px" :value="project.body.width" @change="project.body.width = num($event); commit()" />
        </div>
      </div>
      <div class="field">
        <label>Height</label>
        <div class="row">
          <input type="range" min="40" max="400" :value="project.body.height" @input="project.body.height = num($event)" @change="commit" />
          <input type="number" style="width: 56px" :value="project.body.height" @change="project.body.height = num($event); commit()" />
        </div>
      </div>
      <div v-if="project.body.kind === 'rect'" class="field">
        <label>Corner radius</label>
        <input type="range" min="0" max="80" :value="project.body.cornerRadius" @input="project.body.cornerRadius = num($event)" @change="commit" />
      </div>
      <div v-if="project.body.kind === 'blob'" class="field">
        <label>Blob preset</label>
        <select :value="project.body.blobVariant" @change="project.body.blobVariant = num($event); commit()">
          <option :value="0">Pebble — round</option>
          <option :value="1">Splodge — pear</option>
          <option :value="2">Puddle — wide</option>
        </select>
      </div>

      <div class="section-title">Fill</div>
      <div class="field">
        <label>Style</label>
        <select
          :value="project.body.fill.type"
          @change="project.body.fill.type = ($event.target as HTMLSelectElement).value as Fill['type']; commit()"
        >
          <option value="solid">Solid</option>
          <option value="gradient">Gradient (auto shade)</option>
        </select>
      </div>
      <div class="field">
        <label>Colour</label>
        <input type="color" :value="project.body.fill.color" @input="project.body.fill.color = ($event.target as HTMLInputElement).value" @change="commit" />
      </div>
      <div class="field">
        <label>Stroke</label>
        <div class="row">
          <input type="checkbox" :checked="!!project.body.stroke" @change="toggleStroke(project.body)" />
          <template v-if="project.body.stroke">
            <input type="color" :value="project.body.stroke.color" @input="project.body.stroke!.color = ($event.target as HTMLInputElement).value" @change="commit" />
            <input type="number" style="width: 48px" min="1" max="20" :value="project.body.stroke.width" @change="project.body.stroke!.width = num($event); commit()" />
          </template>
        </div>
      </div>

      <div class="section-title">Palettes</div>
      <div v-for="palette in PALETTES" :key="palette.name" class="palette-row">
        <span class="palette-name">{{ palette.name }}</span>
        <button
          v-for="color in palette.colors"
          :key="color"
          class="swatch"
          :style="{ background: color }"
          :title="color"
          @click="setFillColor(project.body.fill, color)"
        />
      </div>
    </template>

    <!-- EYES -->
    <template v-else-if="editor.selection?.kind === 'eyes'">
      <div class="section-title">Eyes</div>
      <div class="field">
        <label>Style</label>
        <select :value="project.eyes.style" @change="project.eyes.style = ($event.target as HTMLSelectElement).value as EyeStyle; commit()">
          <option v-for="style in EYE_STYLES" :key="style" :value="style">{{ style }}</option>
        </select>
      </div>
      <div class="field">
        <label>Spacing</label>
        <input type="range" min="4" :max="project.body.width * 0.7" :value="project.eyes.spacing" @input="project.eyes.spacing = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Vertical pos</label>
        <input type="range" :min="-project.body.height * 0.6" :max="project.body.height * 0.6" :value="project.eyes.offsetY" @input="project.eyes.offsetY = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Size</label>
        <input type="range" min="4" max="60" :value="project.eyes.size" @input="project.eyes.size = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Squash</label>
        <input type="range" min="0.5" max="1.5" step="0.05" :value="project.eyes.squash" @input="project.eyes.squash = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Pupil size</label>
        <input type="range" min="0.1" max="0.9" step="0.05" :value="project.eyes.pupilSize" @input="project.eyes.pupilSize = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Highlight</label>
        <input type="checkbox" :checked="project.eyes.highlight" @change="project.eyes.highlight = !project.eyes.highlight; commit()" />
      </div>
      <div class="field">
        <label>Pupil drift</label>
        <input type="checkbox" :checked="project.eyes.pupilDrift" @change="project.eyes.pupilDrift = !project.eyes.pupilDrift; commit()" />
      </div>
      <div class="field">
        <label>Eye colour</label>
        <input type="color" :value="project.eyes.color" @input="project.eyes.color = ($event.target as HTMLInputElement).value" @change="commit" />
      </div>
      <div class="field">
        <label>Pupil colour</label>
        <input type="color" :value="project.eyes.pupilColor" @input="project.eyes.pupilColor = ($event.target as HTMLInputElement).value" @change="commit" />
      </div>
      <p class="hint">Eyes are a linked pair, mirrored across the centre line. Blinking is always on and ships with every export.</p>
    </template>

    <!-- MOUTH -->
    <template v-else-if="editor.selection?.kind === 'mouth'">
      <div class="section-title">Mouth</div>
      <div class="field">
        <label>Style</label>
        <select :value="project.mouth.style" @change="project.mouth.style = ($event.target as HTMLSelectElement).value as MouthStyle; commit()">
          <option v-for="style in MOUTH_STYLES" :key="style" :value="style">{{ style }}</option>
        </select>
      </div>
      <div class="field">
        <label>Vertical pos</label>
        <input type="range" :min="-project.body.height * 0.6" :max="project.body.height * 0.7" :value="project.mouth.offsetY" @input="project.mouth.offsetY = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Width</label>
        <input type="range" min="8" max="160" :value="project.mouth.width" @input="project.mouth.width = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Height</label>
        <input type="range" min="4" max="60" :value="project.mouth.height" @input="project.mouth.height = num($event)" @change="commit" />
      </div>
      <div v-if="project.mouth.style === 'smile' || project.mouth.style === 'tongue'" class="field">
        <label>Curvature</label>
        <input type="range" min="-1" max="1" step="0.05" :value="project.mouth.curvature" @input="project.mouth.curvature = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Colour</label>
        <input type="color" :value="project.mouth.color" @input="project.mouth.color = ($event.target as HTMLInputElement).value" @change="commit" />
      </div>
      <p class="hint">Negative curvature makes a frown. Expressions morph this same curve, so it always animates smoothly.</p>
    </template>

    <!-- PART -->
    <template v-else-if="selectedPart">
      <div class="section-title">{{ selectedPart.name }}</div>
      <div class="field">
        <label>Shape</label>
        <select :value="selectedPart.kind" @change="setKind(selectedPart!, $event)">
          <option v-for="[kind, label] in PART_KINDS" :key="kind" :value="kind">{{ label }}</option>
        </select>
      </div>
      <div class="field">
        <label>X / Y</label>
        <div class="row">
          <input type="number" style="width: 62px" :value="Math.round(selectedPart.x)" @change="selectedPart!.x = num($event); commit()" />
          <input type="number" style="width: 62px" :value="Math.round(selectedPart.y)" @change="selectedPart!.y = num($event); commit()" />
        </div>
      </div>
      <div class="field">
        <label>W / H</label>
        <div class="row">
          <input type="number" style="width: 62px" min="4" :value="Math.round(selectedPart.width)" @change="selectedPart!.width = Math.max(4, num($event)); commit()" />
          <input type="number" style="width: 62px" min="4" :value="Math.round(selectedPart.height)" @change="selectedPart!.height = Math.max(4, num($event)); commit()" />
        </div>
      </div>
      <div class="field">
        <label>Rotation</label>
        <input type="range" min="-180" max="180" :value="selectedPart.rotation" @input="selectedPart!.rotation = num($event)" @change="commit" />
      </div>
      <div v-if="selectedPart.kind === 'lobe' || selectedPart.kind === 'capsule'" class="field">
        <label>Pinch</label>
        <div class="row">
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            :value="selectedPart.pinch ?? 0"
            @input="selectedPart!.pinch = num($event)"
            @change="commit"
          />
          <input
            type="number"
            style="width: 48px"
            min="0"
            max="0.9"
            step="0.05"
            :value="selectedPart.pinch ?? 0"
            @change="selectedPart!.pinch = Math.max(0, Math.min(0.9, num($event))); commit()"
          />
        </div>
      </div>
      <div v-if="selectedPart.kind === 'arc'" class="field">
        <label>Bend</label>
        <div class="row">
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            :value="selectedPart.bend ?? 0.6"
            @input="selectedPart!.bend = num($event)"
            @change="commit"
          />
          <input
            type="number"
            style="width: 48px"
            min="-1.5"
            max="1.5"
            step="0.05"
            :value="selectedPart.bend ?? 0.6"
            @change="selectedPart!.bend = Math.max(-1.5, Math.min(1.5, num($event))); commit()"
          />
        </div>
      </div>
      <div v-if="selectedPart.kind === 'blob'" class="field">
        <label>Blob preset</label>
        <select :value="selectedPart.blobVariant ?? 0" @change="selectedPart!.blobVariant = num($event); commit()">
          <option :value="0">Pebble — round</option>
          <option :value="1">Splodge — pear</option>
          <option :value="2">Puddle — wide</option>
        </select>
      </div>
      <template v-if="selectedPart.kind === 'rect' || selectedPart.kind === 'strip'">
        <div v-if="!selectedPart.corners" class="field">
          <label>Corner radius</label>
          <div class="row">
            <input type="range" min="0" max="60" :value="selectedPart.cornerRadius" @input="selectedPart!.cornerRadius = num($event)" @change="commit" />
            <input type="number" style="width: 48px" min="0" :value="selectedPart.cornerRadius" @change="selectedPart!.cornerRadius = Math.max(0, num($event)); commit()" />
          </div>
        </div>
        <div class="field">
          <label>Per-corner</label>
          <input type="checkbox" :checked="!!selectedPart.corners" @change="togglePerCorner(selectedPart!)" />
        </div>
        <div v-if="selectedPart.corners" class="field">
          <label>Corners</label>
          <div class="corner-grid">
            <div class="corner-cell">
              <span class="corner-glyph tl" />
              <input type="number" min="0" :value="selectedPart.corners[0]" @change="setCorner(selectedPart!, 0, $event)" />
            </div>
            <div class="corner-cell">
              <input type="number" min="0" :value="selectedPart.corners[1]" @change="setCorner(selectedPart!, 1, $event)" />
              <span class="corner-glyph tr" />
            </div>
            <div class="corner-cell">
              <span class="corner-glyph bl" />
              <input type="number" min="0" :value="selectedPart.corners[3]" @change="setCorner(selectedPart!, 3, $event)" />
            </div>
            <div class="corner-cell">
              <input type="number" min="0" :value="selectedPart.corners[2]" @change="setCorner(selectedPart!, 2, $event)" />
              <span class="corner-glyph br" />
            </div>
          </div>
        </div>
      </template>
      <div class="field">
        <label>Opacity</label>
        <input type="range" min="0" max="1" step="0.05" :value="selectedPart.opacity" @input="selectedPart!.opacity = num($event)" @change="commit" />
      </div>
      <div class="field">
        <label>Fill</label>
        <div class="row">
          <input type="color" :value="selectedPart.fill.color" @input="selectedPart!.fill.color = ($event.target as HTMLInputElement).value" @change="commit" />
          <select :value="selectedPart.fill.type" @change="selectedPart!.fill.type = ($event.target as HTMLSelectElement).value as Fill['type']; commit()">
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Stroke</label>
        <div class="row">
          <input type="checkbox" :checked="!!selectedPart.stroke" @change="toggleStroke(selectedPart!)" />
          <template v-if="selectedPart.stroke">
            <input type="color" :value="selectedPart.stroke.color" @input="selectedPart!.stroke!.color = ($event.target as HTMLInputElement).value" @change="commit" />
            <input type="number" style="width: 48px" min="1" max="20" :value="selectedPart.stroke.width" @change="selectedPart!.stroke!.width = num($event); commit()" />
          </template>
        </div>
      </div>
      <div class="field">
        <label>Mirror pair</label>
        <input type="checkbox" :checked="selectedPart.mirror" @change="selectedPart!.mirror = !selectedPart!.mirror; commit()" />
      </div>
      <div class="field">
        <label>Clip to body</label>
        <input
          type="checkbox"
          :checked="!!selectedPart.clipToBody"
          title="Trim this shape at the body's edge — bands and stripes end exactly at the silhouette"
          @change="selectedPart!.clipToBody = !selectedPart!.clipToBody; commit()"
        />
      </div>
      <div class="field">
        <label>Layer</label>
        <select :value="bandOf(selectedPart)" @change="setLayer(selectedPart!, $event)">
          <option value="back">Behind body</option>
          <option value="mid">Above body</option>
          <option value="top">Above face</option>
        </select>
      </div>
      <div class="row" style="gap: 8px; margin-top: 10px">
        <button @click="duplicatePart(selectedPart!)">Duplicate (⌘D)</button>
        <button class="danger" @click="deletePart(selectedPart!)">Delete</button>
      </div>
      <p class="hint">Drag to move · handles resize (⇧ keeps ratio, ⌥ from centre) · arrows nudge (⇧ = 10px) · ⌘C/⌘V copy &amp; paste. Put ears, horns and tails behind the body so the join tucks in.</p>
    </template>

    <p v-else class="hint">Select the body, eyes, mouth or a shape to edit its properties. Drag shapes in from the palette below the canvas.</p>
  </div>
</template>

<style scoped>
.palette-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.palette-name {
  width: 76px;
  color: var(--text-dim);
  font-size: 11px;
}

.swatch {
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* 2×2 corner-radius inputs laid out like the corners they control. */
.corner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.corner-cell {
  display: flex;
  align-items: center;
  gap: 5px;
}

.corner-cell input {
  width: 100%;
}

.corner-glyph {
  flex: none;
  width: 10px;
  height: 10px;
  border: 0 solid var(--text-dim);
}

.corner-glyph.tl {
  border-top-width: 2px;
  border-left-width: 2px;
  border-top-left-radius: 6px;
}

.corner-glyph.tr {
  border-top-width: 2px;
  border-right-width: 2px;
  border-top-right-radius: 6px;
}

.corner-glyph.bl {
  border-bottom-width: 2px;
  border-left-width: 2px;
  border-bottom-left-radius: 6px;
}

.corner-glyph.br {
  border-bottom-width: 2px;
  border-right-width: 2px;
  border-bottom-right-radius: 6px;
}

.danger {
  color: var(--danger);
  border-color: var(--danger);
  background: transparent;
}

.hint {
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.5;
}
</style>
