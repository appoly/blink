<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import SidebarNav from '../SidebarNav.vue'
import AnimateCanvas from './AnimateCanvas.vue'
import TimelinePanel from './TimelinePanel.vue'
import AnimateInspector from './AnimateInspector.vue'
import { baseAvatarCss, expressionCss } from '../../lib/animationCss'
import {
  addCustomExpression,
  expressionLabel,
  newCustomExpression,
  STARTER_TEMPLATES,
  type StarterTemplate,
} from '../../lib/customExpressions'
import { useInjectedStyle } from '../../composables/useInjectedStyle'
import { useAnimEdit } from './useAnimEdit'

const { animate, store, editor, project, def, settings, copySelectedKeys, pasteKeys, deleteSelectedKeys } = useAnimEdit()

// The canvas preview compiles the in-progress def with the exact generator
// the Expressions tab, thumbnails and export use — no second interpolator.
// Loop preview overrides the iteration count without touching the settings.
useInjectedStyle(
  computed(() => {
    if (!def.value || !settings.value) return ''
    const previewSettings = { ...settings.value, loop: animate.loopPreview ? ('infinite' as const) : ('once' as const) }
    return [
      baseAvatarCss(project.value, '.anim-stage', 'an'),
      expressionCss(project.value, def.value, previewSettings, `.anim-stage.avatar-expr--${def.value.name}`, 'an'),
    ].join('\n\n')
  }),
)

function createNew(template: StarterTemplate) {
  const created = newCustomExpression(project.value, template)
  addCustomExpression(project.value, created)
  store.commit()
  animate.open(created.name)
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

function onKeyDown(e: KeyboardEvent) {
  if (editor.tab !== 'animate' || !def.value || isEditableTarget(e)) return
  const mod = e.metaKey || e.ctrlKey
  if (e.code === 'Space') {
    e.preventDefault()
    animate.togglePlay()
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && animate.selectedKeys.length) {
    e.preventDefault()
    deleteSelectedKeys()
  } else if (mod && e.key.toLowerCase() === 'c' && animate.selectedKeys.length) {
    e.preventDefault()
    copySelectedKeys()
  } else if (mod && e.key.toLowerCase() === 'v' && animate.clipboard.length) {
    e.preventDefault()
    pasteKeys()
  } else if (e.key === 'Escape') {
    animate.clearKeySelection()
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  animate.pause()
})
</script>

<template>
  <div class="animate-tab">
    <template v-if="def">
      <!-- Left 70%: canvas over timeline, mirroring the other tabs' stage column. -->
      <section class="stage-column">
        <AnimateCanvas />
        <TimelinePanel />
      </section>

      <aside class="sidebar">
        <div class="inspector-wrap">
          <AnimateInspector />
        </div>
        <SidebarNav />
      </aside>
    </template>

    <template v-else>
      <section class="empty-stage">
        <div class="empty-card">
          <h2>Animate</h2>
          <p>Start from a template, or edit an animation you've made.</p>
          <div class="template-list">
            <button v-for="t in STARTER_TEMPLATES" :key="t.key" @click="createNew(t)">
              <span class="tpl-label">{{ t.key === 'blank' ? '＋ ' : '' }}{{ t.label }}</span>
              <span class="tpl-desc">{{ t.description }}</span>
            </button>
          </div>
          <div v-if="project.customExpressions.length" class="custom-list">
            <button v-for="d in project.customExpressions" :key="d.name" @click="animate.open(d.name)">
              {{ expressionLabel(d) }}
            </button>
          </div>
          <p class="hint">Tip: right-click any preset on the Expressions tab and choose “Duplicate &amp; edit”.</p>
        </div>
      </section>
      <aside class="sidebar">
        <div class="inspector-wrap" />
        <SidebarNav />
      </aside>
    </template>
  </div>
</template>

<style scoped>
.animate-tab {
  display: flex;
  min-height: 0;
}

.stage-column {
  flex: 0 0 70%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sidebar {
  flex: 0 0 30%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-left: 1px solid var(--border);
}

.inspector-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.empty-stage {
  flex: 0 0 70%;
  min-width: 0;
  display: grid;
  place-items: center;
  background-color: #edebe6;
  background-image: radial-gradient(circle, #d2cfc8 1px, transparent 1px);
  background-size: 24px 24px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 34px;
  max-width: 360px;
  text-align: center;
}

.empty-card h2 {
  margin: 0;
  font-size: 16px;
}

.empty-card p {
  margin: 0;
  color: var(--text-dim);
  font-size: 13px;
}

.template-list {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-list button {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: left;
  align-items: flex-start;
  padding: 7px 10px;
}

.template-list button:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.tpl-label {
  font-weight: 600;
  font-size: 12px;
}

.tpl-desc {
  font-size: 11px;
  color: var(--text-dim);
}

.custom-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  align-self: stretch;
}

.hint {
  font-size: 11px;
}
</style>
