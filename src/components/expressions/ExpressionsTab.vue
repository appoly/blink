<script setup lang="ts">
import { computed, ref } from 'vue'
import AvatarSvg from '../AvatarSvg.vue'
import SidebarNav from '../SidebarNav.vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useAnimateStore } from '../../stores/animate'
import { avatarStylesheet } from '../../lib/animationCss'
import { useInjectedStyle } from '../../composables/useInjectedStyle'
import { type LoopMode } from '../../types/avatar'
import {
  addCustomExpression,
  allExpressionNames,
  duplicateExpression,
  expressionLabel,
  getExpressionDef,
  isCustomExpression,
  newCustomExpression,
  removeCustomExpression,
  STARTER_TEMPLATES,
  type StarterTemplate,
} from '../../lib/customExpressions'
import { renderExpressionGif } from '../../lib/gifExport'
import { componentName } from '../../lib/exporter'

const editor = useEditorStore()
const store = useProjectStore()
const animate = useAnimateStore()
const project = computed(() => store.project)

/** Presets, then the user's custom animations. */
const allNames = computed(() => allExpressionNames(project.value))

// Fall back to idle if the current expression vanished (e.g. undo of a
// custom-expression creation while it was selected).
const current = computed(() =>
  getExpressionDef(project.value, editor.currentExpression) && project.value.expressions[editor.currentExpression]
    ? editor.currentExpression
    : 'idle',
)
const settings = computed(() => project.value.expressions[current.value])

function labelOf(name: string): string {
  const def = getExpressionDef(project.value, name)
  return def ? expressionLabel(def) : name
}

/** Duration of one cycle at the current speed, in seconds. */
const cycleDuration = computed(() => getExpressionDef(project.value, current.value)!.duration / settings.value.speed)

// One stylesheet drives the big preview, another (all expressions at once)
// drives the thumbnail filmstrip — both from the same generator the export uses.
useInjectedStyle(computed(() => avatarStylesheet(project.value, '.expr-stage', 'pv', [current.value])))
useInjectedStyle(computed(() => avatarStylesheet(project.value, '.expr-thumb', 'th', allNames.value)))

const stageVars = computed(() => ({
  '--avatar-play': editor.playing ? 'running' : 'paused',
  '--avatar-seek': editor.playing ? '0s' : `${-editor.scrub}s`,
}))

function thumbVars(name: string) {
  const def = getExpressionDef(project.value, name)!
  const speed = project.value.expressions[name].speed
  const seek = (def.thumbOffset / 100) * (def.duration / speed)
  return { '--avatar-play': 'paused', '--avatar-seek': `${-seek.toFixed(3)}s` }
}

function pick(name: string) {
  editor.currentExpression = name
  editor.playing = true
  editor.scrub = 0
}

function openInAnimate(name: string) {
  animate.open(name)
  editor.tab = 'animate'
}

/** "Duplicate & edit" (presets and customs) — copy, register, open in Animate. */
function duplicateAndEdit(name: string) {
  menu.value = null
  const source = getExpressionDef(project.value, name)
  if (!source) return
  const copy = duplicateExpression(project.value, source)
  addCustomExpression(project.value, copy)
  store.commit()
  openInAnimate(copy.name)
}

// "+ New animation" opens a starter-template picker.
const newMenu = ref<{ x: number; y: number } | null>(null)

function openNewMenu(e: MouseEvent) {
  newMenu.value = {
    x: Math.min(e.clientX, window.innerWidth - 250),
    y: Math.min(e.clientY, window.innerHeight - (STARTER_TEMPLATES.length * 44 + 20)),
  }
}

function createNew(template: StarterTemplate) {
  newMenu.value = null
  const def = newCustomExpression(project.value, template)
  addCustomExpression(project.value, def)
  store.commit()
  openInAnimate(def.name)
}

function deleteCustom(name: string) {
  menu.value = null
  if (!confirm(`Delete "${labelOf(name)}"? You can undo this with ⌘Z.`)) return
  removeCustomExpression(project.value, name)
  if (editor.currentExpression === name) editor.currentExpression = 'idle'
  if (animate.editing === name) animate.close()
  store.commit()
}

function onScrub(e: Event) {
  editor.playing = false
  editor.scrub = Number((e.target as HTMLInputElement).value)
}

const loopChoice = computed(() => {
  const loop = settings.value.loop
  return typeof loop === 'number' ? 'count' : loop
})

function setLoop(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  settings.value.loop = (value === 'count' ? 3 : value) as LoopMode
  store.commit()
}

const num = (e: Event) => Number((e.target as HTMLInputElement).value)
const commit = () => store.commit()

function toggleInclude(name: string) {
  const s = project.value.expressions[name]
  s.include = !s.include
  store.commit()
}

// Right-click menu on an expression card: export inclusion + GIF export.
const menu = ref<{ name: string; x: number; y: number } | null>(null)

function openMenu(name: string, e: MouseEvent) {
  menu.value = {
    name,
    x: Math.min(e.clientX, window.innerWidth - 190),
    y: Math.min(e.clientY, window.innerHeight - 130),
  }
}

/** Per-card GIF export status ("GIF 42%" / "GIF failed"), shown on the thumbnail. */
const gifStatus = ref<{ name: string; text: string } | null>(null)

/** Render one cycle of an expression to a GIF and save it. */
async function exportGif(name: string) {
  menu.value = null
  gifStatus.value = { name, text: 'GIF…' }
  try {
    const bytes = await renderExpressionGif(project.value, name, (done, total) => {
      gifStatus.value = { name, text: `GIF ${Math.round((done / total) * 100)}%` }
    })
    const filename = `${componentName(project.value)}-${name}.gif`
    if ('__TAURI_INTERNALS__' in window) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({ defaultPath: filename })
      if (path) await writeFile(path, bytes)
    } else {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
    gifStatus.value = null
  } catch (err) {
    console.error('GIF export failed', err)
    gifStatus.value = { name, text: 'GIF failed' }
    setTimeout(() => {
      if (gifStatus.value?.name === name && gifStatus.value.text === 'GIF failed') gifStatus.value = null
    }, 4000)
  }
}
</script>

<template>
  <div class="expressions-tab">
    <!-- Left 70%: the avatar hero + transport/tweaks. -->
    <div class="stage-column">
      <section class="stage-area">
        <div :key="current + (editor.playing ? '-play' : '')" class="expr-stage" :class="`avatar-expr--${current}`" :style="stageVars">
          <AvatarSvg :project="project" id-prefix="pv" />
        </div>
        <div class="expr-name">{{ labelOf(current) }}</div>
      </section>

      <section class="controls-bar">
        <button class="play" @click="editor.playing = !editor.playing; editor.scrub = 0">
          {{ editor.playing ? '⏸' : '▶' }}
        </button>
        <input
          class="scrub"
          type="range"
          min="0"
          :max="cycleDuration.toFixed(2)"
          step="0.01"
          :value="editor.playing ? 0 : editor.scrub"
          @input="onScrub"
        />
        <span class="time">{{ cycleDuration.toFixed(2) }}s</span>

        <span class="divider" />

        <label>Speed</label>
        <input type="range" class="tweak" min="0.25" max="3" step="0.05" :value="settings.speed" @input="settings.speed = num($event)" @change="commit" />
        <span class="value">{{ settings.speed.toFixed(2) }}×</span>

        <label>Intensity</label>
        <input type="range" class="tweak" min="0" max="1.5" step="0.05" :value="settings.intensity" @input="settings.intensity = num($event)" @change="commit" />
        <span class="value">{{ Math.round(settings.intensity * 100) }}%</span>

        <label>Loop</label>
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
      </section>
    </div>

    <!-- Right 30%: preset grid, thumbnailed with the user's own avatar,
         with the view switcher pinned to the bottom. -->
    <aside class="sidebar">
      <section class="preset-grid">
        <button
          v-for="name in allNames"
          :key="name"
          class="card"
          :class="{ active: name === current, excluded: !project.expressions[name].include }"
          title="Right-click for export options"
          @click="pick(name)"
          @contextmenu.prevent="openMenu(name, $event)"
        >
          <div class="expr-thumb" :class="`avatar-expr--${name}`" :style="thumbVars(name)">
            <AvatarSvg :project="project" :id-prefix="`th-${name}`" />
            <span v-if="isCustomExpression(name)" class="custom-badge">custom</span>
            <span v-if="!project.expressions[name].include" class="excluded-badge">not exported</span>
            <span v-if="gifStatus?.name === name" class="gif-badge">{{ gifStatus.text }}</span>
            <span
              v-if="isCustomExpression(name)"
              class="edit-badge"
              title="Edit in Animate"
              @click.stop="openInAnimate(name)"
            >✎</span>
          </div>
          <span class="card-label">{{ labelOf(name) }}</span>
        </button>
        <button class="card new-card" @click="openNewMenu">
          <div class="new-thumb">＋</div>
          <span class="card-label">New animation</span>
        </button>
      </section>
      <SidebarNav />
    </aside>

    <template v-if="newMenu">
      <div class="ctx-backdrop" @click="newMenu = null" @contextmenu.prevent="newMenu = null" />
      <div class="ctx-menu template-menu" :style="{ left: `${newMenu.x}px`, top: `${newMenu.y}px` }">
        <button v-for="t in STARTER_TEMPLATES" :key="t.key" @click="createNew(t)">
          <span class="tpl-label">{{ t.label }}</span>
          <span class="tpl-desc">{{ t.description }}</span>
        </button>
      </div>
    </template>

    <template v-if="menu">
      <div class="ctx-backdrop" @click="menu = null" @contextmenu.prevent="menu = null" />
      <div class="ctx-menu" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }">
        <button v-if="menu.name === 'idle'" disabled title="Idle is always exported">Always exported</button>
        <button v-else @click="toggleInclude(menu.name); menu = null">
          {{ project.expressions[menu.name].include ? 'Remove from export' : 'Add to export' }}
        </button>
        <button :disabled="!!gifStatus" @click="exportGif(menu.name)">Export as GIF…</button>
        <button v-if="isCustomExpression(menu.name)" @click="openInAnimate(menu.name); menu = null">Edit animation</button>
        <button @click="duplicateAndEdit(menu.name)">Duplicate &amp; edit</button>
        <button v-if="isCustomExpression(menu.name)" class="danger" @click="deleteCustom(menu.name)">Delete…</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.expressions-tab {
  display: flex;
  min-height: 0;
}

.stage-column {
  flex: 0 0 70%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.stage-area {
  flex: 1;
  min-height: 0;
  position: relative;
  background-color: #edebe6;
  background-image: radial-gradient(circle, #d2cfc8 1px, transparent 1px);
  background-size: 24px 24px;
}

.expr-stage {
  position: absolute;
  inset: 28px;
}

.expr-stage :deep(svg) {
  width: 100%;
  height: 100%;
}

.expr-name {
  position: absolute;
  top: 14px;
  left: 18px;
  text-transform: capitalize;
  font-weight: 600;
  color: #8a877f;
  letter-spacing: 0.04em;
}

.controls-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: var(--panel);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.play {
  width: 44px;
  height: 34px;
}

.scrub {
  flex: 1;
  min-width: 120px;
}

.time,
.value {
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 6px;
}

.tweak {
  width: 90px;
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

.template-menu {
  min-width: 230px;
}

.template-menu button {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tpl-label {
  font-weight: 600;
}

.tpl-desc {
  font-size: 11px;
  color: var(--text-dim);
}

.template-menu button:hover .tpl-desc {
  color: inherit;
}

.sidebar {
  flex: 0 0 30%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-left: 1px solid var(--border);
}

.preset-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-content: start;
  padding: 12px;
  overflow-y: auto;
}

.card {
  padding: 8px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.card.excluded .expr-thumb :deep(svg) {
  opacity: 0.45;
  filter: grayscale(0.6);
}

.custom-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  padding: 1px 6px;
}

/* .expr-thumb blocks pointer events; the edit badge opts back in. */
.edit-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  pointer-events: auto;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  color: #6d6a63;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  padding: 3px 5px;
}

.edit-badge:hover {
  color: var(--accent);
}

.new-card {
  border-style: dashed;
}

.new-thumb {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  font-size: 34px;
  color: var(--text-dim);
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 7px;
}

.new-card:hover .new-thumb {
  color: var(--accent);
  border-color: var(--accent);
}

.ctx-menu button.danger:hover:not(:disabled) {
  background: rgba(214, 69, 69, 0.15);
  color: #e07070;
}

.excluded-badge {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6d6a63;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
}

.gif-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  padding: 1px 6px;
}

.expr-thumb {
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  pointer-events: none;
  background: #edebe6;
  border-radius: 7px;
}

/* Absolutely positioned so the svg's 100% width/height resolve against the
   chip (a percentage height inside an auto grid row falls back to intrinsic
   aspect sizing and overflows). Generous inset keeps the pose small. */
.expr-thumb :deep(svg) {
  position: absolute;
  inset: 12px;
  width: calc(100% - 24px) !important;
  height: calc(100% - 24px) !important;
}

.card-label {
  text-transform: capitalize;
  text-align: center;
  font-size: 12px;
}
</style>
