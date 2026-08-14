<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useProjectStore } from '../stores/project'
import {
  componentName,
  generateComponent,
  generateExpressionsTs,
  generateReadme,
  generateSvgSnapshot,
  includedExpressions,
} from '../lib/exporter'
import { generateReactComponent, generateReactReadme } from '../lib/reactExporter'

const editor = useEditorStore()
const store = useProjectStore()
const project = computed(() => store.project)

type Mode = 'sfc' | 'bundle' | 'svg' | 'png'
type Framework = 'vue' | 'react'
const mode = ref<Mode>('sfc')
const framework = ref<Framework>('vue')
const busy = ref(false)
const done = ref<string | null>(null)

const name = computed(() => componentName(project.value))
const included = computed(() => includedExpressions(project.value))
const isReact = computed(() => framework.value === 'react')
/** Modes that emit a component — the only ones the framework choice applies to. */
const emitsComponent = computed(() => mode.value === 'sfc' || mode.value === 'bundle')
const componentExt = computed(() => (isReact.value ? 'tsx' : 'vue'))
const componentFile = computed(() => `${name.value}.${componentExt.value}`)
const code = computed(() => (isReact.value ? generateReactComponent(project.value) : generateComponent(project.value)))
const readme = computed(() => (isReact.value ? generateReactReadme(project.value) : generateReadme(project.value)))

const isTauri = () => '__TAURI_INTERNALS__' in window

async function renderPng(): Promise<Uint8Array<ArrayBuffer>> {
  const svg = generateSvgSnapshot(project.value)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
    )
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

function browserDownload(filename: string, contents: string | Uint8Array<ArrayBuffer>) {
  const url = URL.createObjectURL(new Blob([contents]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function doExport() {
  busy.value = true
  done.value = null
  try {
    if (!isTauri()) {
      if (mode.value === 'sfc') browserDownload(componentFile.value, code.value)
      else if (mode.value === 'svg') browserDownload(`${name.value}.svg`, generateSvgSnapshot(project.value))
      else if (mode.value === 'png') browserDownload(`${name.value}.png`, await renderPng())
      else {
        browserDownload(componentFile.value, code.value)
        browserDownload('expressions.ts', generateExpressionsTs(project.value))
        browserDownload('README.md', readme.value)
      }
      done.value = 'Downloaded.'
      return
    }

    const { save, open } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile, writeFile } = await import('@tauri-apps/plugin-fs')

    if (mode.value === 'bundle') {
      const dir = await open({ directory: true, title: 'Choose a folder for the component bundle' })
      if (typeof dir !== 'string') return
      await writeTextFile(`${dir}/${componentFile.value}`, code.value)
      await writeTextFile(`${dir}/expressions.ts`, generateExpressionsTs(project.value))
      await writeTextFile(`${dir}/README.md`, readme.value)
      done.value = `Wrote 3 files to ${dir}`
      return
    }

    const ext = mode.value === 'sfc' ? componentExt.value : mode.value
    const path = await save({ defaultPath: `${name.value}.${ext}` })
    if (!path) return
    if (mode.value === 'sfc') await writeTextFile(path, code.value)
    else if (mode.value === 'svg') await writeTextFile(path, generateSvgSnapshot(project.value))
    else await writeFile(path, await renderPng())
    done.value = `Saved ${path}`
  } catch (err) {
    done.value = `Export failed: ${err}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="overlay" @click.self="editor.exportOpen = false">
    <div class="dialog">
      <header>
        <h2>Export {{ name }}</h2>
        <button class="close" @click="editor.exportOpen = false">✕</button>
      </header>

      <div class="options">
        <label><input v-model="mode" type="radio" value="sfc" /> Single-file component — <code>{{ componentFile }}</code>, zero dependencies</label>
        <label><input v-model="mode" type="radio" value="bundle" /> Multi-file bundle — component + <code>expressions.ts</code> + README</label>
        <label><input v-model="mode" type="radio" value="svg" /> SVG snapshot of the current pose</label>
        <label><input v-model="mode" type="radio" value="png" /> PNG snapshot of the current pose</label>
      </div>

      <div v-if="emitsComponent" class="framework">
        <span class="dim">Framework</span>
        <button :class="{ active: framework === 'vue' }" @click="framework = 'vue'">Vue</button>
        <button :class="{ active: framework === 'react' }" @click="framework = 'react'">React</button>
      </div>

      <p class="included">
        Included expressions: <strong>{{ included.join(', ') }}</strong>
        <span class="dim"> — pick which ones ship on the Expressions tab.</span>
      </p>

      <pre v-if="emitsComponent" class="code-preview">{{ code }}</pre>

      <footer>
        <span class="status">{{ done }}</span>
        <button class="primary" :disabled="busy" @click="doExport">{{ busy ? 'Exporting…' : 'Export' }}</button>
      </footer>
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
  width: min(720px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  gap: 12px;
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

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.options label {
  color: var(--text);
  cursor: pointer;
}

.framework {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.framework button {
  padding: 4px 12px;
  font-size: 11px;
  color: var(--text-dim);
}

.framework button.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.included {
  margin: 0;
  font-size: 12px;
}

.dim {
  color: var(--text-dim);
}

.code-preview {
  flex: 1;
  min-height: 120px;
  margin: 0;
  overflow: auto;
  background: #14151a;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #c8cede;
  user-select: text;
}

footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.status {
  color: var(--text-dim);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
