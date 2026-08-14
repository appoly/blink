# Avatar Builder

A desktop app (Tauri + Vue 3) for designing cute animated 2D character avatars and exporting each one as a self-contained Vue 3 component — no runtime dependencies, SVG + CSS keyframes only.

## Workspaces

- **Pose** — build the character: one body shape (rounded rect, circle, ellipse, capsule, trapezoid, blob), decorative sub-shapes (drag from the palette; move/resize/rotate with Figma-style handles, snapping, mirror pairs), a linked pair of eyes and a morphable mouth. Eyes and mouth are permanent — restyle them, don't delete them.
- **Expressions** — 12 presets (idle, happy, curious, angry, confused, sad, surprised, sleepy, love, laughing, wink, dizzy), each previewed and thumbnailed **on your own avatar**. Tune speed, intensity and loop mode per expression and choose which ones ship.

The idle blink (randomised-feeling 3–6s interval) and optional pupil drift are baked into every export.

## Running

```sh
npm install
npm run tauri dev     # desktop app
npm run dev           # browser-only dev (file dialogs fall back to download/upload)
```

## Building

```sh
npm run tauri build
```

## Project files

Save/load as JSON with the `.avatar` extension (File buttons in the top bar, ⌘S to save).

## Export

⌘E or the Export button:

1. **Single-file component** — `MyAvatar.vue` with inline SVG, scoped keyframe CSS, and props `expression` / `size` / `paused` plus an `animation-end` emit for play-once expressions.
2. **Multi-file bundle** — component + `expressions.ts` + README.
3. **SVG / PNG snapshot** of the current pose.

The editor preview, thumbnails and exported component all render from the same geometry and CSS generators, so the export matches the editor exactly. See `samples/BoxBuddy.vue` for a generated example (`npm run generate:sample` regenerates it).

## Keyboard

- ⌘Z / ⇧⌘Z — undo/redo (50 steps)
- Arrows / ⇧+arrows — nudge 1px / 10px
- ⇧ while resizing — keep aspect; ⌥ — resize from centre; ⇧ while rotating — 15° steps
- Space+drag / middle-drag — pan; ⌘+scroll or pinch — zoom
- Delete — remove selected shape
