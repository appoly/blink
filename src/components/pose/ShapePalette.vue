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
        <path :d="shapePath(shape.kind, shape.kind === 'strip' ? 24 : 20, shape.kind === 'strip' ? 8 : 20, 4)" fill="currentColor" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.palette {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.hint {
  color: var(--text-dim);
  margin-right: 6px;
}

.shape {
  width: 34px;
  height: 30px;
  padding: 3px;
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
