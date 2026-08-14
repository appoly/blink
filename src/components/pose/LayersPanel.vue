<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { bandOf, setBand, type Band } from '../../lib/parts'
import type { Part } from '../../types/avatar'

const editor = useEditorStore()
const store = useProjectStore()

interface Row {
  key: string
  label: string
  part?: Part
  select: () => void
  selected: boolean
}

// Top of the list = frontmost. Parts render in array order within their
// group, so the display order reverses each group.
const rows = computed<Row[]>(() => {
  const sel = editor.selection
  const partRow = (part: Part): Row => ({
    key: part.id,
    label: part.name,
    part,
    select: () => editor.select({ kind: 'part', id: part.id }),
    selected: sel?.kind === 'part' && sel.id === part.id,
  })
  const inBand = (band: Band) => store.project.parts.filter((p) => bandOf(p) === band)
  return [
    ...inBand('top').reverse().map(partRow),
    { key: 'mouth', label: 'Mouth', select: () => editor.select({ kind: 'mouth' }), selected: sel?.kind === 'mouth' },
    { key: 'eyes', label: 'Eyes', select: () => editor.select({ kind: 'eyes' }), selected: sel?.kind === 'eyes' },
    ...inBand('mid').reverse().map(partRow),
    { key: 'body', label: 'Body', select: () => editor.select({ kind: 'body' }), selected: sel?.kind === 'body' },
    ...inBand('back').reverse().map(partRow),
  ]
})

const BAND_ORDER: Band[] = ['back', 'mid', 'top']

/** Move a part one step toward the front (+1) or back (-1) in z-order. */
function move(part: Part, dir: 1 | -1) {
  const parts = store.project.parts
  const band = bandOf(part)
  const group = parts.filter((p) => bandOf(p) === band)
  const gi = group.indexOf(part)
  const atBandEdge = dir === 1 ? gi === group.length - 1 : gi === 0

  if (atBandEdge) {
    // Cross into the neighbouring band (over the body or the face).
    const nextBand = BAND_ORDER[BAND_ORDER.indexOf(band) + dir]
    if (!nextBand) return
    parts.splice(parts.indexOf(part), 1)
    setBand(part, nextBand)
    const nextGroupIndices = parts.flatMap((p, i) => (bandOf(p) === nextBand ? [i] : []))
    if (dir === 1) {
      // Backmost slot of the band above: before its first member.
      parts.splice(nextGroupIndices.length ? nextGroupIndices[0] : parts.length, 0, part)
    } else {
      // Frontmost slot of the band below: after its last member.
      parts.splice(nextGroupIndices.length ? nextGroupIndices[nextGroupIndices.length - 1] + 1 : 0, 0, part)
    }
  } else {
    const neighbour = group[gi + dir]
    const a = parts.indexOf(part)
    const b = parts.indexOf(neighbour)
    parts[a] = neighbour
    parts[b] = part
  }
  store.commit()
}

function toggle(part: Part, field: 'hidden' | 'locked' | 'mirror') {
  part[field] = !part[field]
  store.commit()
}

const renamingId = ref<string | null>(null)
// Inside v-for a string ref collects into an array; only one rename input
// exists at a time, so [0] is always the active one.
const renameInput = ref<HTMLInputElement[]>([])

async function startRename(part: Part) {
  renamingId.value = part.id
  await nextTick()
  renameInput.value[0]?.select()
}

function finishRename(part: Part, e: Event) {
  const value = (e.target as HTMLInputElement).value.trim()
  if (value && value !== part.name) {
    part.name = value
    store.commit()
  }
  renamingId.value = null
}
</script>

<template>
  <div class="layers">
    <div class="section-title" style="padding: 10px 12px 0">Layers</div>
    <ul>
      <li
        v-for="row in rows"
        :key="row.key"
        :class="{ selected: row.selected, hidden: row.part?.hidden }"
        @click="row.select()"
      >
        <template v-if="row.part">
          <button class="icon" :title="row.part.hidden ? 'Show' : 'Hide'" @click.stop="toggle(row.part!, 'hidden')">
            {{ row.part.hidden ? '◌' : '👁' }}
          </button>
          <button class="icon" :title="row.part.locked ? 'Unlock' : 'Lock'" @click.stop="toggle(row.part!, 'locked')">
            {{ row.part.locked ? '🔒' : '🔓' }}
          </button>
          <input
            v-if="renamingId === row.part.id"
            ref="renameInput"
            class="rename"
            :value="row.part.name"
            @click.stop
            @keydown.enter="finishRename(row.part!, $event)"
            @blur="finishRename(row.part!, $event)"
          />
          <span v-else class="name" @dblclick.stop="startRename(row.part!)">
            {{ row.label }}<span v-if="row.part.mirror" class="tag">⇋</span>
          </span>
          <span class="spacer" />
          <button class="icon" title="Bring forward" @click.stop="move(row.part!, 1)">▲</button>
          <button class="icon" title="Send backward" @click.stop="move(row.part!, -1)">▼</button>
        </template>
        <template v-else>
          <span class="fixed-dot">•</span>
          <span class="name core">{{ row.label }}</span>
        </template>
      </li>
    </ul>
    <p class="hint">Eyes, mouth and body are permanent. Double-click a shape to rename it.</p>
  </div>
</template>

<style scoped>
ul {
  list-style: none;
  margin: 8px 0;
  padding: 0;
}

li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  cursor: default;
}

li.selected {
  background: var(--accent-soft);
}

li.hidden .name {
  opacity: 0.45;
}

.icon {
  border: none;
  background: transparent;
  padding: 1px 3px;
  font-size: 11px;
  color: var(--text-dim);
}

.icon:hover {
  color: var(--text);
  background: transparent;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name.core {
  color: var(--text-dim);
}

.tag {
  color: var(--accent);
  margin-left: 4px;
}

.fixed-dot {
  color: var(--text-dim);
  padding: 0 8px 0 5px;
}

.spacer {
  flex: 1;
}

.rename {
  flex: 1;
  padding: 1px 4px;
}

.hint {
  color: var(--text-dim);
  font-size: 11px;
  padding: 0 12px;
}
</style>
