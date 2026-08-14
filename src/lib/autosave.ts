// Autosave of the working project so the app reopens where you left off.
// Desktop: <app-data>/autosave.avatar. Browser dev: localStorage.
// Explicit .avatar files (Save/Open) remain for backups and sharing.

const STORAGE_KEY = 'avatar-builder:autosave'
const FILE_NAME = 'autosave.avatar'

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export async function saveAutosave(json: string): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(STORAGE_KEY, json)
    return
  }
  const { appDataDir } = await import('@tauri-apps/api/path')
  const { mkdir, writeTextFile, exists } = await import('@tauri-apps/plugin-fs')
  const dir = await appDataDir()
  if (!(await exists(dir))) await mkdir(dir, { recursive: true })
  await writeTextFile(`${dir}/${FILE_NAME}`, json)
}

export async function loadAutosave(): Promise<string | null> {
  if (!isTauri()) {
    return localStorage.getItem(STORAGE_KEY)
  }
  const { appDataDir } = await import('@tauri-apps/api/path')
  const { readTextFile, exists } = await import('@tauri-apps/plugin-fs')
  const path = `${await appDataDir()}/${FILE_NAME}`
  if (!(await exists(path))) return null
  return readTextFile(path)
}
