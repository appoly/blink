<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useProjectStore } from '../stores/project'
import { buildGenerationPrompt, extractJson } from '../lib/promptTemplate'

const editor = useEditorStore()
const store = useProjectStore()

const description = ref('')
const response = ref('')
const copied = ref(false)
const error = ref<string | null>(null)

const prompt = computed(() => buildGenerationPrompt(description.value || '(no description given — invent a cute character)'))

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value)
  } catch {
    // Clipboard API can be unavailable in webviews — fall back to execCommand.
    const ta = document.createElement('textarea')
    ta.value = prompt.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function startBlank() {
  store.newProject()
  editor.select(null)
  editor.newDialogOpen = false
}

function importResponse() {
  error.value = null
  try {
    store.loadFromJson(extractJson(response.value), null)
    editor.select(null)
    editor.tab = 'pose'
    editor.newDialogOpen = false
  } catch (err) {
    error.value = `Couldn't import that: ${err instanceof Error ? err.message : err}`
  }
}
</script>

<template>
  <div class="overlay" @click.self="editor.newDialogOpen = false">
    <div class="dialog">
      <header>
        <h2>New avatar</h2>
        <button class="close" @click="editor.newDialogOpen = false">✕</button>
      </header>

      <button class="blank" @click="startBlank">Start blank</button>

      <div class="divider"><span>or describe it and let an AI draft it</span></div>

      <div class="step">
        <span class="step-num">1</span>
        <div class="step-body">
          <label>What do you want?</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="e.g. a rectangular avatar that looks like a package, with tape across the top and down the middle, and a postage stamp on the bottom right"
          />
        </div>
      </div>

      <div class="step">
        <span class="step-num">2</span>
        <div class="step-body">
          <label>Copy the prompt into your favourite AI (ChatGPT, Claude, …)</label>
          <button :disabled="!description.trim()" @click="copyPrompt">
            {{ copied ? 'Copied ✓' : 'Copy prompt' }}
          </button>
        </div>
      </div>

      <div class="step">
        <span class="step-num">3</span>
        <div class="step-body">
          <label>Paste its reply here</label>
          <textarea v-model="response" rows="4" placeholder="Paste the AI's JSON output…" />
          <p v-if="error" class="error">{{ error }}</p>
          <button class="primary" :disabled="!response.trim()" @click="importResponse">Import into builder</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 100;
}

.dialog {
  width: min(560px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
  font-size: 15px;
}

.close {
  border: none;
  background: transparent;
  color: var(--text-dim);
}

.blank {
  align-self: flex-start;
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-dim);
  font-size: 11px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.step {
  display: flex;
  gap: 10px;
}

.step-num {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
  margin-top: 1px;
}

.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.step-body label {
  font-size: 12px;
}

textarea {
  width: 100%;
  resize: vertical;
  font: inherit;
  color: var(--text);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 7px 9px;
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}
</style>
