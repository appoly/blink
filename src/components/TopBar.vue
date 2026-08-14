<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
import { useProjectStore } from '../stores/project'

const editor = useEditorStore()
const project = useProjectStore()

function rename(e: Event) {
  project.project.name = (e.target as HTMLInputElement).value || 'MyAvatar'
  project.commit()
}
</script>

<template>
  <header class="topbar">
    <div class="group">
      <input class="project-name" :value="project.project.name" spellcheck="false" @change="rename" />
      <span
        v-if="project.dirty"
        class="dirty"
        title="Autosaved in the app — not yet written to a .avatar file"
      >●</span>
    </div>

    <nav class="tabs">
      <button :class="{ active: editor.tab === 'pose' }" @click="editor.tab = 'pose'">Pose</button>
      <button :class="{ active: editor.tab === 'expressions' }" @click="editor.tab = 'expressions'">
        Expressions
      </button>
    </nav>

    <div class="group">
      <button :disabled="!project.canUndo" title="Undo (⌘Z)" @click="project.undo()">↩</button>
      <button :disabled="!project.canRedo" title="Redo (⇧⌘Z)" @click="project.redo()">↪</button>
      <span class="sep" />
      <button @click="project.newProject()">New</button>
      <button @click="project.open()">Open</button>
      <button title="Save (⌘S)" @click="project.save()">Save</button>
      <span class="sep" />
      <button class="primary" title="Export (⌘E)" @click="editor.exportOpen = true">Export</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.project-name {
  font-weight: 600;
  width: 160px;
  background: transparent;
  border-color: transparent;
}

.project-name:hover,
.project-name:focus {
  border-color: var(--border);
  background: var(--panel-2);
}

.dirty {
  color: var(--accent);
  font-size: 10px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--panel-2);
  border-radius: 8px;
  padding: 3px;
}

.tabs button {
  border: none;
  background: transparent;
  padding: 5px 16px;
}

.tabs button.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 6px;
}

.sep {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 4px;
}
</style>
