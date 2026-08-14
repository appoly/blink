<script setup lang="ts">
import LayersPanel from './LayersPanel.vue'
import CanvasStage from './CanvasStage.vue'
import InspectorPanel from './InspectorPanel.vue'
import ShapePalette from './ShapePalette.vue'
</script>

<template>
  <div class="pose-tab">
    <aside class="left">
      <LayersPanel />
    </aside>
    <section class="center">
      <ShapePalette />
      <CanvasStage />
    </section>
    <aside class="right">
      <InspectorPanel />
    </aside>
  </div>
</template>

<style scoped>
.pose-tab {
  display: flex;
  min-height: 0;
}

.left,
.right {
  width: 240px;
  flex: none;
  background: var(--panel);
  overflow-y: auto;
}

.left {
  border-right: 1px solid var(--border);
}

.right {
  width: 280px;
  border-left: 1px solid var(--border);
  padding: 12px;
}

.center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
</style>
