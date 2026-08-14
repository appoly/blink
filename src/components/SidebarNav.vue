<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const editor = useEditorStore()
</script>

<template>
  <nav class="sidebar-nav">
    <button :class="{ active: editor.tab === 'pose' }" @click="editor.tab = 'pose'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="10" height="10" rx="2.5" />
        <circle cx="16" cy="16" r="5" />
      </svg>
      <span>Pose</span>
    </button>
    <button :class="{ active: editor.tab === 'expressions' }" @click="editor.tab = 'expressions'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
        <circle cx="9" cy="9.5" r="0.6" fill="currentColor" />
        <circle cx="15" cy="9.5" r="0.6" fill="currentColor" />
      </svg>
      <span>Expressions</span>
    </button>
    <button class="soon" disabled title="Coming soon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 6v12M6 12h12" />
      </svg>
      <span>Soon</span>
    </button>
    <button class="soon" disabled title="Coming soon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 6v12M6 12h12" />
      </svg>
      <span>Soon</span>
    </button>
  </nav>
</template>

<style scoped>
.sidebar-nav {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px;
  border-top: 1px solid var(--border);
  background: var(--panel);
  justify-items: center;
}

.sidebar-nav button {
  width: min(84px, 100%);
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px;
  border-radius: 10px;
  color: var(--text-dim);
  font-size: 11px;
}

.sidebar-nav button span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-nav button svg {
  width: 24px;
  height: 24px;
  flex: none;
}

.sidebar-nav button.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.sidebar-nav button.soon {
  border-style: dashed;
  background: transparent;
  opacity: 0.45;
  cursor: default;
}
</style>
