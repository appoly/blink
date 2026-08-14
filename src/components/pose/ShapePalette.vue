<script setup lang="ts">
import { createPart, PALETTE_SHAPES } from '../../lib/parts'
import { shapePath } from '../../lib/shapes'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import type { PartKind } from '../../types/avatar'

const editor = useEditorStore()
const store = useProjectStore()

function onDragStart(e: DragEvent, kind: string) {
  e.dataTransfer?.setData('application/x-avatar-shape', kind)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}

/** Click-to-place fallback: drop the shape near the top of the body. */
function addShape(kind: PartKind) {
  const part = createPart(kind, 0, -store.project.body.height / 2 - 10)
  store.project.parts.push(part)
  editor.select({ kind: 'part', id: part.id })
  store.commit()
}
</script>

<template>
  <div class="palette">
    <span class="hint">Click or drag onto canvas:</span>
    <button
      v-for="shape in PALETTE_SHAPES"
      :key="shape.kind"
      class="shape"
      draggable="true"
      :title="shape.label"
      @dragstart="onDragStart($event, shape.kind)"
      @click="addShape(shape.kind)"
    >
      <svg viewBox="-14 -14 28 28">
        <path
          :d="shapePath(shape.kind, shape.kind === 'strip' || shape.kind === 'arc' ? 24 : 20, shape.kind === 'strip' ? 8 : shape.kind === 'arc' ? 7 : 20, 4, shape.kind === 'blob' ? 1 : 0, null, 0, 0.6)"
          fill="currentColor"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.palette {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--panel);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.hint {
  color: var(--text-dim);
  margin-right: 6px;
}

.shape {
  width: 44px;
  height: 40px;
  padding: 5px;
  color: var(--text-dim);
  display: grid;
  place-items: center;
  cursor: grab;
}

.shape:hover {
  color: var(--accent);
}

.shape svg {
  width: 100%;
  height: 100%;
}
</style>
