import { computed } from 'vue'
import { useAnimateStore, type KeyRef } from '../../stores/animate'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { sampleTrack } from '../../lib/animationCss'
import { keyframeValues, renameCustomExpression, type RowDef } from '../../lib/customExpressions'
import type { MorphKeyframe, Track, TrackTarget, TransformKeyframe } from '../../lib/expressions'

/**
 * Shared editing operations for the Animate tab. The edited ExpressionDef
 * lives inside the project (customExpressions), so every mutation here is
 * plain project state + a history commit — undo/redo comes for free.
 */
export function useAnimEdit() {
  const animate = useAnimateStore()
  const store = useProjectStore()
  const editor = useEditorStore()

  const project = computed(() => store.project)
  const def = computed(() => animate.def)
  const settings = computed(() => animate.settings)
  const cycleDuration = computed(() => animate.cycleDuration)

  /** Playhead as a keyframe offset, snapped to 1%. */
  const playheadOffset = computed(() => snapOffset((animate.time / cycleDuration.value) * 100))

  const commit = () => store.commit()

  function snapOffset(o: number): number {
    return Math.min(100, Math.max(0, Math.round(o)))
  }

  function track(index: number): Track | undefined {
    return def.value?.tracks[index]
  }

  function sortKeyframes(t: Track) {
    t.keyframes.sort((a, b) => a.o - b.o)
  }

  /** Linear opacity between the surrounding keyframes (brow fades). */
  function sampleOpacity(t: Track, o: number): number | undefined {
    const withOpacity = t.keyframes.filter((k) => k.opacity !== undefined)
    if (!withOpacity.length) return undefined
    const before = [...withOpacity].reverse().find((k) => k.o <= o)
    const after = withOpacity.find((k) => k.o >= o)
    if (!before) return after!.opacity
    if (!after || after.o === before.o) return before.opacity
    const t01 = (o - before.o) / (after.o - before.o)
    return before.opacity! + (after.opacity! - before.opacity!) * t01
  }

  const round3 = (n: number) => Number(n.toFixed(3))

  /** Get-or-create a keyframe at offset o, seeded from the sampled pose. */
  function ensureKeyframe(trackIndex: number, o: number): TransformKeyframe {
    const t = track(trackIndex)!
    const existing = t.keyframes.find((k) => k.o === o)
    if (existing) return existing
    const sampled = sampleTrack(t, o)
    const kf: TransformKeyframe = {
      o,
      tx: round3(sampled.tx),
      ty: round3(sampled.ty),
      r: round3(sampled.r),
      sx: round3(sampled.sx),
      sy: round3(sampled.sy),
    }
    const opacity = sampleOpacity(t, o)
    if (opacity !== undefined) kf.opacity = round3(opacity)
    t.keyframes.push(kf)
    sortKeyframes(t)
    return kf
  }

  function ensureMorphKeyframe(o: number): MorphKeyframe {
    const morph = def.value!.morph!
    const existing = morph.find((k) => k.o === o)
    if (existing) return existing
    const curvature = sampleMorph(o)
    const kf: MorphKeyframe = { o, curvature: round3(curvature) }
    morph.push(kf)
    morph.sort((a, b) => a.o - b.o)
    return kf
  }

  /** Curvature at offset o (linear between morph keyframes). */
  function sampleMorph(o: number): number {
    const morph = def.value?.morph
    if (!morph?.length) return 0
    const before = [...morph].reverse().find((k) => k.o <= o)
    const after = morph.find((k) => k.o >= o)
    if (!before) return after!.curvature
    if (!after || after.o === before.o) return before.curvature
    const t01 = (o - before.o) / (after.o - before.o)
    return before.curvature + (after.curvature - before.curvature) * t01
  }

  function keyframeAt(ref: KeyRef): TransformKeyframe | MorphKeyframe | undefined {
    if (ref.track === 'morph') return def.value?.morph?.find((k) => k.o === ref.o)
    return track(ref.track)?.keyframes.find((k) => k.o === ref.o)
  }

  /**
   * Move a keyframe along its row. If the target offset is taken, it slides
   * to the nearest free slot toward the pointer (hugging the neighbour)
   * instead of freezing in place.
   */
  function moveKeyframe(ref: KeyRef, newO: number): KeyRef {
    let o = snapOffset(newO)
    if (o === ref.o) return ref
    const list: { o: number }[] | undefined = ref.track === 'morph' ? def.value?.morph : track(ref.track)?.keyframes
    if (!list) return ref
    const dir = Math.sign(o - ref.o)
    while (o !== ref.o && list.some((k) => k.o === o)) o -= dir
    if (o === ref.o) return ref
    const kf = list.find((k) => k.o === ref.o)
    if (!kf) return ref
    kf.o = o
    list.sort((a, b) => a.o - b.o)
    const next = { track: ref.track, o }
    animate.selectedKeys = animate.selectedKeys.map((k) => (k.track === ref.track && k.o === ref.o ? next : k))
    return next
  }

  /** A transform track must keep ≥2 keyframes; morph rows can empty out. */
  function canDeleteKey(ref: KeyRef): boolean {
    if (ref.track === 'morph') return (def.value?.morph?.length ?? 0) > 2
    return (track(ref.track)?.keyframes.length ?? 0) > 2
  }

  function deleteSelectedKeys() {
    const deletable = animate.selectedKeys.filter(canDeleteKey)
    if (!deletable.length) return
    for (const ref of deletable) {
      if (ref.track === 'morph') {
        def.value!.morph = def.value!.morph!.filter((k) => k.o !== ref.o)
      } else {
        const t = track(ref.track)
        if (t) t.keyframes = t.keyframes.filter((k) => k.o !== ref.o)
      }
    }
    animate.selectedKeys = []
    commit()
  }

  function duplicateKey(ref: KeyRef) {
    const kf = keyframeAt(ref)
    if (!kf) return
    const list: { o: number }[] | undefined = ref.track === 'morph' ? def.value?.morph : track(ref.track)?.keyframes
    if (!list) return
    let o = ref.o
    do o = snapOffset(o + 5)
    while (list.some((k) => k.o === o) && o < 100)
    if (list.some((k) => k.o === o)) return
    list.push({ ...JSON.parse(JSON.stringify(kf)), o })
    list.sort((a, b) => a.o - b.o)
    animate.selectedKeys = [{ track: ref.track, o }]
    commit()
  }

  /** Reset a keyframe to all-identity values (keeps offset and ease). */
  function setKeyToNeutral(ref: KeyRef) {
    const kf = keyframeAt(ref)
    if (!kf) return
    if (ref.track === 'morph') {
      ;(kf as MorphKeyframe).curvature = 0
    } else {
      Object.assign(kf, { tx: 0, ty: 0, r: 0, sx: 1, sy: 1, ...('opacity' in kf ? { opacity: 1 } : {}) })
    }
    commit()
  }

  function copySelectedKeys() {
    const kfs = animate.selectedKeys
      .filter((ref) => ref.track !== 'morph')
      .map((ref) => keyframeAt(ref) as TransformKeyframe | undefined)
      .filter((k): k is TransformKeyframe => !!k)
    if (kfs.length) animate.clipboard = JSON.parse(JSON.stringify(kfs))
  }

  /** Paste copied keyframes into the selected track, anchored at the playhead. */
  function pasteKeys() {
    if (!animate.clipboard.length || typeof animate.selectedTrack !== 'number') return
    const t = track(animate.selectedTrack)
    if (!t) return
    const base = Math.min(...animate.clipboard.map((k) => k.o))
    const pasted: KeyRef[] = []
    for (const kf of animate.clipboard) {
      const o = snapOffset(playheadOffset.value + (kf.o - base))
      t.keyframes = t.keyframes.filter((k) => k.o !== o)
      t.keyframes.push({ ...JSON.parse(JSON.stringify(kf)), o })
      pasted.push({ track: animate.selectedTrack, o })
    }
    sortKeyframes(t)
    animate.selectedKeys = pasted
    commit()
  }

  // ---- tracks --------------------------------------------------------------

  function trackIndexByTarget(target: TrackTarget): number {
    return def.value?.tracks.findIndex((t) => t.target === target) ?? -1
  }

  function removeTrack(index: number) {
    const t = track(index)
    if (!t || !def.value) return
    if (def.value.tracks.length <= 1) return
    if (t.keyframes.length > 2 && !confirm('Remove this track and its keyframes?')) return
    def.value.tracks.splice(index, 1)
    animate.selectedTrack = null
    animate.selectedKeys = []
    commit()
  }

  /**
   * Both ⇄ Left/Right on eyes/brows rows. Splitting copies the unified track
   * to both sides; merging keeps the left side's keyframes.
   */
  function setSplit(row: RowDef, split: boolean) {
    if (!row.split || !def.value) return
    const tracks = def.value.tracks
    const both = trackIndexByTarget(row.target)
    const [l, r] = row.split
    if (split && both >= 0) {
      const source = tracks[both]
      const left: Track = { ...JSON.parse(JSON.stringify(source)), target: l }
      const right: Track = { ...JSON.parse(JSON.stringify(source)), target: r }
      tracks.splice(both, 1, left, right)
    } else if (!split) {
      const li = trackIndexByTarget(l)
      const ri = trackIndexByTarget(r)
      if (li < 0 && ri < 0) return
      const source = tracks[li >= 0 ? li : ri]
      const merged: Track = { ...JSON.parse(JSON.stringify(source)), target: row.target }
      def.value.tracks = tracks.filter((t) => t.target !== l && t.target !== r)
      def.value.tracks.splice(Math.min(li >= 0 ? li : ri, def.value.tracks.length), 0, merged)
    }
    animate.selectedTrack = null
    animate.selectedKeys = []
    commit()
  }

  function rename(label: string): boolean {
    // Hold the def object: the store getter resolves by slug, which the
    // rename is about to change.
    const d = def.value
    if (!d || !animate.editing) return false
    const oldName = d.name
    renameCustomExpression(project.value, d, label)
    if (editor.currentExpression === oldName) editor.currentExpression = d.name
    animate.editing = d.name
    commit()
    return true
  }

  return {
    animate,
    store,
    editor,
    project,
    def,
    settings,
    cycleDuration,
    playheadOffset,
    commit,
    snapOffset,
    track,
    sortKeyframes,
    ensureKeyframe,
    ensureMorphKeyframe,
    sampleMorph,
    keyframeAt,
    moveKeyframe,
    canDeleteKey,
    deleteSelectedKeys,
    duplicateKey,
    setKeyToNeutral,
    copySelectedKeys,
    pasteKeys,
    trackIndexByTarget,
    removeTrack,
    setSplit,
    rename,
  }
}

/** keyframeValues re-exported for template convenience. */
export { keyframeValues }
