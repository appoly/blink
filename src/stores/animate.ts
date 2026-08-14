import { defineStore } from 'pinia'
import type { ExpressionSettings } from '../types/avatar'
import type { ExpressionDef, TransformKeyframe } from '../lib/expressions'
import { useProjectStore } from './project'

/** A keyframe reference: a track index into def.tracks, or the morph row. */
export type KeyRef = { track: number | 'morph'; o: number }

let raf = 0

export const useAnimateStore = defineStore('animate', {
  state: () => ({
    /** Slug of the custom expression open in the Animate tab. */
    editing: null as string | null,
    /** Playhead in seconds (of the speed-adjusted cycle). */
    time: 0,
    playing: false,
    /** Time the current play run started from — the CSS seek offset. */
    seekBase: 0,
    /** Bumped per play to remount the stage so play-once runs restart. */
    replayKey: 0,
    /** Posing on the canvas writes keyframes at the playhead. */
    autoKey: true,
    loopPreview: true,
    /** Selected track row (index into def.tracks, or the morph row). */
    selectedTrack: null as number | 'morph' | null,
    selectedKeys: [] as KeyRef[],
    clipboard: [] as TransformKeyframe[],
  }),

  getters: {
    def(state): ExpressionDef | null {
      if (!state.editing) return null
      return useProjectStore().project.customExpressions.find((d) => d.name === state.editing) ?? null
    },
    settings(state): ExpressionSettings | undefined {
      return state.editing ? useProjectStore().project.expressions[state.editing] : undefined
    },
    /** One cycle at the current speed, in seconds. */
    cycleDuration(): number {
      if (!this.def || !this.settings) return 1
      return this.def.duration / this.settings.speed
    },
  },

  actions: {
    open(slug: string) {
      this.pause()
      this.editing = slug
      this.time = 0
      this.selectedTrack = null
      this.selectedKeys = []
    },

    close() {
      this.pause()
      this.editing = null
      this.selectedKeys = []
      this.selectedTrack = null
    },

    play() {
      if (this.playing || !this.def) return
      // A finished play-once run restarts from the top.
      if (!this.loopPreview && this.time >= this.cycleDuration - 0.001) this.time = 0
      this.seekBase = this.time
      this.replayKey += 1
      this.playing = true
      const t0 = performance.now()
      const from = this.time
      const tick = () => {
        if (!this.playing) return
        const elapsed = (performance.now() - t0) / 1000
        const dur = this.cycleDuration
        const t = from + elapsed
        if (!this.loopPreview && t >= dur) {
          this.time = dur
          this.playing = false
          return
        }
        this.time = t % dur
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    },

    pause() {
      cancelAnimationFrame(raf)
      this.playing = false
    },

    togglePlay() {
      this.playing ? this.pause() : this.play()
    },

    /** Jump the playhead (seconds); always pauses. */
    scrub(t: number) {
      this.pause()
      this.time = Math.min(this.cycleDuration, Math.max(0, t))
    },

    selectKey(ref: KeyRef, additive = false) {
      this.selectedTrack = ref.track
      const already = this.selectedKeys.some((k) => k.track === ref.track && k.o === ref.o)
      if (additive) {
        this.selectedKeys = already
          ? this.selectedKeys.filter((k) => !(k.track === ref.track && k.o === ref.o))
          : [...this.selectedKeys, ref]
      } else if (!already) {
        this.selectedKeys = [ref]
      }
    },

    clearKeySelection() {
      this.selectedKeys = []
    },
  },
})
