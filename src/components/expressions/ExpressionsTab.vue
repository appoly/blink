<script setup lang="ts">
import { computed } from 'vue'
import AvatarSvg from '../AvatarSvg.vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { EXPRESSIONS } from '../../lib/expressions'
import { avatarStylesheet } from '../../lib/animationCss'
import { useInjectedStyle } from '../../composables/useInjectedStyle'
import { EXPRESSION_NAMES, type ExpressionName, type LoopMode } from '../../types/avatar'

const editor = useEditorStore()
const store = useProjectStore()
const project = computed(() => store.project)

const current = computed(() => editor.currentExpression)
const settings = computed(() => project.value.expressions[current.value])

/** Duration of one cycle at the current speed, in seconds. */
const cycleDuration = computed(() => EXPRESSIONS[current.value].duration / settings.value.speed)

// One stylesheet drives the big preview, another (all expressions at once)
// drives the thumbnail filmstrip — both from the same generator the export uses.
useInjectedStyle(computed(() => avatarStylesheet(project.value, '.expr-stage', 'pv', [current.value])))
useInjectedStyle(computed(() => avatarStylesheet(project.value, '.expr-thumb', 'th', [...EXPRESSION_NAMES])))

const stageVars = computed(() => ({
  '--avatar-play': editor.playing ? 'running' : 'paused',
  '--avatar-seek': editor.playing ? '0s' : `${-editor.scrub}s`,
}))

function thumbVars(name: ExpressionName) {
  const def = EXPRESSIONS[name]
  const speed = project.value.expressions[name].speed
  const seek = (def.thumbOffset / 100) * (def.duration / speed)
  return { '--avatar-play': 'paused', '--avatar-seek': `${-seek.toFixed(3)}s` }
}

function pick(name: ExpressionName) {
  editor.currentExpression = name
  editor.playing = true
  editor.scrub = 0
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
</script>

<template>
  <div class="expressions-tab">
    <!-- Left 70%: the avatar hero + transport/tweaks. -->
    <div class="stage-column">
    <section class="stage-area">
      <div :key="current + (editor.playing ? '-play' : '')" class="expr-stage" :class="`avatar-expr--${current}`" :style="stageVars">
        <AvatarSvg :project="project" id-prefix="pv" />
      </div>
      <div class="expr-name">{{ current }}</div>
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

      <label class="include" :title="current === 'idle' ? 'Idle is always exported' : 'Ship this expression in the exported component'">
        <input
          type="checkbox"
          :checked="settings.include"
          :disabled="current === 'idle'"
          @change="settings.include = !settings.include; commit()"
        />
        Export
      </label>
    </section>
    </div>

    <!-- Right 30%: preset grid, thumbnailed with the user's own avatar. -->
    <section class="preset-sidebar">
      <button
        v-for="name in EXPRESSION_NAMES"
        :key="name"
        class="card"
        :class="{ active: name === current, excluded: !project.expressions[name].include }"
        @click="pick(name)"
      >
        <div class="expr-thumb" :class="`avatar-expr--${name}`" :style="thumbVars(name)">
          <AvatarSvg :project="project" :id-prefix="`th-${name}`" />
        </div>
        <span class="card-label">
          {{ name }}
          <span v-if="project.expressions[name].include" class="included" title="Included in export">●</span>
        </span>
      </button>
    </section>
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
  padding: 10px 16px;
  background: var(--panel);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.play {
  width: 36px;
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

.include {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text);
  margin-left: 6px;
}

.preset-sidebar {
  flex: 0 0 30%;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-content: start;
  padding: 12px;
  background: var(--panel);
  border-left: 1px solid var(--border);
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

.card.excluded {
  opacity: 0.6;
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
  display: flex;
  justify-content: center;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}

.included {
  color: var(--accent);
  font-size: 8px;
}
</style>
