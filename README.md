<p align="center">
  <img src="docs/banner.png" alt="Blink" width="600" />
</p>

# Blink

A desktop app for designing cute animated 2D character avatars — then shipping them as self-contained Vue or React components (no runtime dependencies, just SVG and CSS keyframes), animated GIFs, or SVG/PNG snapshots. Built with Tauri and Vue 3.

## Install

Grab the latest `.dmg` from [Releases](https://github.com/appoly/blink/releases) — it's a signed, notarised universal macOS build. Nothing else to install; Node and Rust are only needed if you're [building from source](#building-from-source).

## How it works

The avatar is always front and centre, with tools in the sidebar on the right. The square buttons at the bottom of the sidebar switch between the three workspaces:

- **Pose** — build the character: one body shape (from rounded rects, circles and blobs to polygons, bursts and squircles), decorative sub-shapes (drag from the palette under the canvas; move/resize/rotate with Figma-style handles, snapping, mirror pairs, clip-to-body), a linked pair of eyes and a morphable mouth. Eyes and mouth are permanent, restyle them, don't delete them. Fills can be solid or gradient (linear at any angle, or radial); strokes can be solid, dashed or sketchy hand-drawn.
- **Expressions** — 12 presets (idle, happy, curious, angry, confused, sad, surprised, sleepy, love, laughing, wink, dizzy), each previewed and thumbnailed on your own avatar. Tune speed, intensity and loop mode per expression. Right-click a card to choose whether it ships in the export, save it as an animated GIF, or duplicate it into an editable copy.
- **Animate** — make your own expressions on a keyframe timeline: start from a template (bounce, breathe, nod, shake, float, or blank), scrub and pose the character directly on the canvas to auto-key, pick easing per keyframe (smooth, springy, anticipate, settle, drop, linear), and get a seam check so loops land cleanly. Custom animations join the presets everywhere — previews, exports, GIFs.

The idle blink (randomised-feeling 3-6s interval) and optional pupil drift are baked into every export.

Stuck for a design? The New dialog has six ready-made starters (from a one-shape sun to a layered robot), or it can build a copy-paste prompt for any AI chat (ChatGPT, Claude, ...) that returns a ready-to-import `.avatar` file. Bring your own AI, no API key or network access involved.

## Project files

Save/load as JSON with the `.avatar` extension (File buttons in the top bar, ⌘S to save). Your working project autosaves in the app after every change, so it's there when you reopen — explicit `.avatar` files are for backups and sharing.

## Export

⌘E or the Export button, with a Vue/React toggle for the component modes:

1. **Single-file component** — `MyAvatar.vue` or `MyAvatar.tsx` with inline SVG and scoped keyframe CSS. Props: `expression` / `size` / `paused`, plus an `animation-end` emit (Vue) or `onAnimationEnd` callback (React) for play-once expressions.
2. **Multi-file bundle** — component + a typed `expressions.ts` + README.
3. **SVG snapshot** of the current pose.
4. **PNG snapshot** of the current pose.

Animated GIFs (25fps, up to 480px, one full cycle) export per expression from the right-click menu on the Expressions tab.

The editor preview, thumbnails, GIFs and exported components all render from the same geometry and CSS generators, so what ships matches the editor exactly. See `samples/BoxBuddy.vue` and `samples/BoxBuddy.tsx` for generated examples (`npm run generate:sample` regenerates them).

## Keyboard

- ⌘Z / ⇧⌘Z — undo/redo (50 steps) · ⌘S / ⇧⌘S — save / save as · ⌘E — export
- ⌘D — duplicate · ⌘C / ⌘V — copy/paste · Delete — remove selected shape
- Arrows / ⇧+arrows — nudge 1px / 10px
- ⇧ while resizing — keep aspect; ⌥ — resize from centre; ⇧ while rotating — 15° steps
- Space+drag / middle-drag — pan; ⌘+scroll or pinch — zoom
- On the Animate tab: Space — play/pause; ⌘C / ⌘V — copy/paste keyframes; Delete — remove selected keyframes

## Building from source

For contributors. You'll need Node 20+ and Rust ([rustup.rs](https://rustup.rs)) — Tauri compiles a native wrapper, so `cargo` has to be on your PATH. On macOS, install the Xcode command line tools too (`xcode-select --install`).

```sh
npm install
npm run tauri dev     # desktop app
npm run dev           # browser-only dev (file dialogs fall back to download/upload)
npm run tauri build   # native build
```

## Contributing

Bug reports and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and a quick tour of how the codebase fits together. Security issues should go through [SECURITY.md](SECURITY.md), not public issues.

## License

[MIT](LICENSE) © Appoly Ltd

Blink is provided as-is, without warranty of any kind. See the [licence](LICENSE) for the full disclaimer.
