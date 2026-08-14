<script setup lang="ts">
import { computed } from 'vue'
import { easeValue } from '../../lib/animationCss'

/** Tiny curve glyph for an easing preset (x: time, y: progress). */
const props = defineProps<{ ease: string }>()

const W = 26
const H = 16
const PAD = 2

const points = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const v = easeValue(props.ease, t)
    const x = PAD + t * (W - PAD * 2)
    // Springs overshoot past 1; leave headroom rather than clipping.
    const y = H - PAD - v * (H - PAD * 2) * 0.82
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})
</script>

<template>
  <svg class="ease-glyph" :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H">
    <polyline :points="points" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.ease-glyph {
  display: block;
  opacity: 0.85;
}
</style>
