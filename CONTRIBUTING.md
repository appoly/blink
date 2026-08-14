# Contributing to Blink

Thanks for taking an interest. Bug reports, small fixes and well-scoped features are all welcome — open an issue first for anything sizeable so we can agree the approach before you sink time into it.

## Getting set up

You'll need **Node 20+** and **Rust** ([rustup.rs](https://rustup.rs)) — Tauri compiles a native wrapper, so `cargo` has to be on your PATH. On macOS, install the Xcode command line tools too (`xcode-select --install`).

```sh
npm install
npm run tauri dev     # desktop app with hot reload
npm run dev           # browser-only dev (file dialogs fall back to download/upload)
```

## Before you open a PR

- `npx vue-tsc --noEmit` must pass.
- If your change affects what exports look like, run `npm run generate:sample` and commit the regenerated `samples/` output.
- Include a screenshot or GIF for anything visual.
- Keep PRs small and focused, and say what changed and why.

## How the codebase fits together

A few invariants worth knowing before you touch anything:

- **One geometry source.** `src/lib/render.ts` builds a plain-object SVG node tree. The editor renders it with Vue's `h()`, and the exporters and GIF encoder serialise the very same tree — that's what guarantees the export matches the editor. Never draw something in the editor that doesn't come from this tree.
- **Expressions are data.** Presets live in `src/lib/expressions.ts` as keyframed transform tracks; `src/lib/animationCss.ts` turns them into identical CSS for the editor preview, thumbnails and exports.
- **Exports stay dependency-free.** Exported components are self-contained SVG + CSS keyframes. Don't add runtime dependencies to anything that ends up in an export.
- **WebKit is the runtime.** The desktop app runs in WKWebView, which doesn't support the CSS `d` property — path morphs need a `@supports` fallback. Test visual changes in Safari or the Tauri app, not just Chromium.

## Reporting bugs

Open an issue with the steps to reproduce, what you expected, and what happened. If it's a rendering problem, attach the `.avatar` file — it's just JSON and makes the bug reproducible in seconds.

For security issues, please **don't** open a public issue — see [SECURITY.md](SECURITY.md).
