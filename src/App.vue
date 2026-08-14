<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import TopBar from './components/TopBar.vue'
import PoseTab from './components/pose/PoseTab.vue'
import ExpressionsTab from './components/expressions/ExpressionsTab.vue'
import ExportDialog from './components/ExportDialog.vue'
import { useEditorStore } from './stores/editor'
import { useProjectStore } from './stores/project'

const editor = useEditorStore()
const project = useProjectStore()

function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

function onKeyDown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key.toLowerCase() === 'z') {
    if (isEditableTarget(e)) return
    e.preventDefault()
    e.shiftKey ? project.redo() : project.undo()
  } else if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault()
    project.save(e.shiftKey)
  } else if (mod && e.key.toLowerCase() === 'e') {
    e.preventDefault()
    editor.exportOpen = true
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div class="app">
    <TopBar />
    <main class="app-main">
      <PoseTab v-show="editor.tab === 'pose'" />
      <ExpressionsTab v-if="editor.tab === 'expressions'" />
    </main>
    <ExportDialog v-if="editor.exportOpen" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.app-main > * {
  flex: 1;
  min-width: 0;
}
</style>
