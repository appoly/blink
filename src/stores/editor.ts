import { defineStore } from 'pinia'
import type { ExpressionName, Part } from '../types/avatar'

/** What is currently selected on the canvas / in the layer list. */
export type Selection = { kind: 'body' } | { kind: 'eyes' } | { kind: 'mouth' } | { kind: 'part'; id: string } | null

export const useEditorStore = defineStore('editor', {
  state: () => ({
    tab: 'pose' as 'pose' | 'expressions',
    selection: null as Selection,
    zoom: 1.6,
    panX: 0,
    panY: 0,
    exportOpen: false,
    /** Session clipboard for copy/paste of shapes. */
    clipboard: null as Part | null,
    // Expressions tab
    currentExpression: 'idle' as ExpressionName,
    playing: true,
    /** Scrub position in seconds when paused. */
    scrub: 0,
  }),

  actions: {
    select(selection: Selection) {
      this.selection = selection
    },
    zoomBy(factor: number, cx = 0, cy = 0) {
      const next = Math.min(8, Math.max(0.2, this.zoom * factor))
      // Keep the point under the cursor fixed while zooming.
      this.panX = cx - ((cx - this.panX) * next) / this.zoom
      this.panY = cy - ((cy - this.panY) * next) / this.zoom
      this.zoom = next
    },
  },
})
