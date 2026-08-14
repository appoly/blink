<script setup lang="ts">
import CanvasStage from './CanvasStage.vue'
import InspectorPanel from './InspectorPanel.vue'
import LayersPanel from './LayersPanel.vue'
import ShapePalette from './ShapePalette.vue'
import SidebarNav from '../SidebarNav.vue'
</script>

<template>
  <div class="pose-tab">
    <!-- Left 70%: the avatar canvas + shape palette bar, mirroring the
         expressions view's stage + playback bar. -->
    <section class="stage-column">
      <CanvasStage />
      <ShapePalette />
    </section>

    <!-- Right 30%: tools, with the view switcher pinned to the bottom. -->
    <aside class="sidebar">
      <div class="panels">
        <div class="inspector-wrap">
          <InspectorPanel />
        </div>
        <div class="layers-wrap">
          <LayersPanel />
        </div>
      </div>
      <SidebarNav />
    </aside>
  </div>
</template>

<style scoped>
.pose-tab {
  display: flex;
  min-height: 0;
}

.stage-column {
  flex: 0 0 70%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.sidebar {
  flex: 0 0 30%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-left: 1px solid var(--border);
}

.panels {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Properties get the remaining height; layers scroll within their own
   capped section so properties stay reachable however many shapes exist. */
.inspector-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.layers-wrap {
  flex: none;
  max-height: 40%;
  overflow-y: auto;
  border-top: 1px solid var(--border);
}
</style>
