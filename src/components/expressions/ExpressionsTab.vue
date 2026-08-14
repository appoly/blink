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
// drives the thumbnail grid — both from the same generator the export uses.
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
    <section class="preview-pane">
      <div :key="current + (editor.playing ? '-play' : '')" class="expr-stage" :class="`avatar-expr--${current}`" :style="stageVars">
        <AvatarSvg :project="project" id-prefix="pv" />
      </div>

      <div class="transport">
        <button @click="editor.playing = !editor.playing; editor.scrub = 0">
          {{ editor.playing ? '⏸ Pause' : '▶ Play' }}
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
      </div>

      <div class="tweaks">
        <div class="section-title">{{ current }} settings</div>
        <div class="field">
          <label>Speed</label>
          <div class="row">
            <input type="range" min="0.25" max="3" step="0.05" :value="settings.speed" @input="settings.speed = num($event)" @change="commit" />
            <span class="value">{{ settings.speed.toFixed(2) }}×</span>
          </div>
        </div>
        <div class="field">
          <label>Intensity</label>
          <div class="row">
            <input type="range" min="0" max="1.5" step="0.05" :value="settings.intensity" @input="settings.intensity = num($event)" @change="commit" />
            <span class="value">{{ Math.round(settings.intensity * 100) }}%</span>
          </div>
        </div>
        <div class="field">
          <label>Loop</label>
          <div class="row">
            <select :value="loopChoice" @change="setLoop">
              <option value="infinite">Loop forever</option>
              <option value="once">Play once</option>
              <option value="count">Play N times</option>
            </select>
            <input
              v-if="loopChoice === 'count'"
              type="number"
              style="width: 52px"
              min="1"
              max="99"
              :value="settings.loop"
              @change="settings.loop = Math.max(1, num($event)); commit()"
            />
          </div>
        </div>
        <div class="field">
          <label>Include in export</label>
          <input
            type="checkbox"
            :checked="settings.include"
            :disabled="current === 'idle'"
            @change="settings.include = !settings.include; commit()"
          />
        </div>
        <p v-if="current === 'idle'" class="hint">Idle (blink + pupil drift) is baked into every avatar and always exported.</p>
      </div>
    </section>

    <section class="grid-pane">
      <div class="section-title">Expression presets</div>
      <div class="grid">
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
      </div>
    </section>
  </div>
</template>

<style scoped>
.expressions-tab {
  display: flex;
  min-height: 0;
}

.preview-pane {
  width: 380px;
  flex: none;
  border-right: 1px solid var(--border);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
}

.expr-stage {
  height: 300px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle, #2e313a 1px, transparent 1px);
  background-size: 24px 24px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
}

.expr-stage :deep(svg) {
  max-height: 100%;
}

.transport {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}

.scrub {
  flex: 1;
}

.time {
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.value {
  color: var(--text-dim);
  width: 44px;
  text-align: right;
}

.grid-pane {
  flex: 1;
  min-width: 0;
  padding: 16px;
  overflow-y: auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.card {
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.card.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.card.excluded {
  opacity: 0.65;
}

.expr-thumb {
  height: 110px;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.card-label {
  text-transform: capitalize;
  display: flex;
  justify-content: center;
  gap: 6px;
  align-items: center;
}

.included {
  color: var(--accent);
  font-size: 9px;
}

.hint {
  color: var(--text-dim);
  font-size: 11px;
}
</style>
