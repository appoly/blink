<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useProjectStore } from '../stores/project'
import { buildGenerationPrompt, extractJson } from '../lib/promptTemplate'

const editor = useEditorStore()
const store = useProjectStore()

const description = ref('')
const personality = ref('')
const palette = ref('')
const notes = ref('')
const response = ref('')
const copied = ref(false)
const error = ref<string | null>(null)

const prompt = computed(() =>
  buildGenerationPrompt(description.value, {
    personality: personality.value,
    palette: palette.value,
    notes: notes.value,
  }),
)

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
          <label>Describe your idea <span class="required">Required</span></label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="e.g. a friendly little storm cloud who is trying its best"
          />
          <p class="hint">A sentence or a few rough words is enough. The AI will make the design decisions.</p>
          <details class="preferences">
            <summary>Add preferences <span>Optional</span></summary>
            <div class="preference-grid">
              <label>
                Personality
                <select v-model="personality">
                  <option value="">Choose for me</option>
                  <option>Cheerful and sunny</option>
                  <option>Cosy and gentle</option>
                  <option>Playful and energetic</option>
                  <option>Calm and thoughtful</option>
                  <option>Cheeky and mischievous</option>
                  <option>Bold and confident</option>
                  <option>Grumpy but lovable</option>
                </select>
              </label>
              <label>
                Colour mood
                <select v-model="palette">
                  <option value="">Choose for me</option>
                  <option>Soft pastels</option>
                  <option>Warm and sunny</option>
                  <option>Cool and calm</option>
                  <option>Bright and punchy</option>
                  <option>Earthy and natural</option>
                  <option>Dark and moody</option>
                </select>
              </label>
            </div>
            <label class="notes-label">
              Anything it must have—or avoid?
              <input v-model="notes" type="text" placeholder="e.g. must have tiny horns; no pink" />
            </label>
          </details>
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

.required,
.preferences summary span {
  margin-left: 5px;
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 400;
}

.hint {
  margin: 0;
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.4;
}

.preferences {
  width: 100%;
  margin-top: 2px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--panel-2) 55%, transparent);
  border: 1px solid var(--border);
  border-radius: 7px;
}

.preferences summary {
  color: var(--text);
  font-size: 11px;
  cursor: pointer;
}

.preference-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.preference-grid label,
.notes-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--text-dim);
}

.notes-label {
  margin-top: 10px;
}

.preference-grid select,
.notes-label input {
  width: 100%;
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

@media (max-width: 520px) {
  .preference-grid {
    grid-template-columns: 1fr;
  }
}
</style>
