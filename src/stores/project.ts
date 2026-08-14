import { defineStore } from 'pinia'
import { defaultProject, type AvatarProject, type ExpressionSettings } from '../types/avatar'

const HISTORY_LIMIT = 51 // current state + 50 undo steps

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const useProjectStore = defineStore('project', {
  state: () => {
    const project = defaultProject()
    return {
      project,
      filePath: null as string | null,
      dirty: false,
      history: [JSON.stringify(project)],
      historyIndex: 0,
    }
  },

  getters: {
    canUndo: (s) => s.historyIndex > 0,
    canRedo: (s) => s.historyIndex < s.history.length - 1,
  },

  actions: {
    /** Push the current state onto the history stack. Call once per user gesture. */
    commit() {
      const snap = JSON.stringify(this.project)
      if (snap === this.history[this.historyIndex]) return
      this.history = this.history.slice(0, this.historyIndex + 1)
      this.history.push(snap)
      if (this.history.length > HISTORY_LIMIT) this.history.shift()
      this.historyIndex = this.history.length - 1
      this.dirty = true
    },

    undo() {
      if (!this.canUndo) return
      this.historyIndex -= 1
      this.project = JSON.parse(this.history[this.historyIndex])
      this.dirty = true
    },

    redo() {
      if (!this.canRedo) return
      this.historyIndex += 1
      this.project = JSON.parse(this.history[this.historyIndex])
      this.dirty = true
    },

    replaceProject(project: AvatarProject, filePath: string | null) {
      this.project = project
      this.filePath = filePath
      this.dirty = false
      this.history = [JSON.stringify(project)]
      this.historyIndex = 0
    },

    newProject() {
      this.replaceProject(defaultProject(), null)
    },

    async save(as = false) {
      if (!isTauri()) {
        downloadFile(`${this.project.name}.avatar`, JSON.stringify(this.project, null, 2))
        this.dirty = false
        return
      }
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      let path = this.filePath
      if (as || !path) {
        path = await save({
          defaultPath: `${this.project.name}.avatar`,
          filters: [{ name: 'Avatar project', extensions: ['avatar'] }],
        })
        if (!path) return
      }
      await writeTextFile(path, JSON.stringify(this.project, null, 2))
      this.filePath = path
      this.dirty = false
    },

    async open() {
      if (!isTauri()) {
        const text = await pickFileInBrowser()
        if (text) this.loadFromJson(text, null)
        return
      }
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile } = await import('@tauri-apps/plugin-fs')
      const path = await open({
        multiple: false,
        filters: [{ name: 'Avatar project', extensions: ['avatar'] }],
      })
      if (typeof path !== 'string') return
      this.loadFromJson(await readTextFile(path), path)
    },

    loadFromJson(text: string, filePath: string | null) {
      const parsed = JSON.parse(text) as AvatarProject
      if (![1, 2].includes(parsed.version) || !parsed.body || !parsed.eyes || !parsed.mouth) {
        throw new Error('Not a valid .avatar project file')
      }
      // Merge over defaults so older files (and AI-generated ones with
      // partial expression settings) pick up newly added fields. Settings for
      // custom expressions have no preset defaults and pass through as-is.
      const base = defaultProject()
      const expressions = { ...base.expressions }
      for (const [name, settings] of Object.entries(parsed.expressions ?? {})) {
        expressions[name] = { ...(expressions[name] ?? {}), ...settings } as ExpressionSettings
      }
      // v1 files predate custom expressions; default to none.
      const customExpressions = Array.isArray(parsed.customExpressions) ? parsed.customExpressions : []
      for (const def of customExpressions) {
        if (!expressions[def.name]) expressions[def.name] = { speed: 1, intensity: 1, loop: 'infinite', include: true }
      }
      this.replaceProject({ ...base, ...parsed, version: 2, customExpressions, expressions }, filePath)
    },
  },
})

function downloadFile(name: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function pickFileInBrowser(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.avatar,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      file.text().then(resolve)
    }
    input.click()
  })
}
