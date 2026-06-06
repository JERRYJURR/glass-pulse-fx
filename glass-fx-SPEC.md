# glass-fx — build & porting spec

> Working title: **`glass-fx`** (rename freely). A small, installable React + vanilla library that renders a frosted-glass surface lit by an animated liquid-metal plasma — the visual you tuned in the playground (`metal-fx-glass4-demo.html`). It is a sibling to [`metal-fx`](https://github.com/Jakubantalik/metal-fx) and reuses its plasma engine.

This document is the brief for turning the playground into a published package other people can `npm install`, clone, and fork. Hand it to Claude Code alongside `metal-fx-glass4-demo.html` and the cloned `metal-fx` repo.

---

## 1. What it is

A component that wraps any element (button, card, chip) and renders, behind/around it, a frosted-glass material whose edges catch animated metallic light. Concretely it composites, per element:

- a full-coverage **plasma** layer (the metal, generated once and shared),
- a **frost** layer that *background-blurs* the plasma and tints it (the glass body),
- an opaque, layer-blurred **core** so the metal bleeds inward but not all the way,
- a thin **border** at low opacity, and
- two **bloom** layers that spill metallic glow past the silhouette (one tight + bright, one wide + soft).

It supports dark and light themes, three metal palettes (chromatic / silver / gold), and a saturation-compensation control to counter the chroma the frost veil removes.

## 2. Relationship to metal-fx and attribution

The plasma **fragment shader** and the three **palette presets** (chromatic/silver/gold, with dark+light blocks) originate in `metal-fx` by Jakub Antalik. `glass-fx` is a derivative: it keeps that plasma engine and replaces metal-fx's single-canvas "punch a hole" compositing with a multi-layer glass compositor.

**Before publishing:**
- Read `metal-fx`'s `LICENSE`. If it's MIT (or similar permissive), you may fork/derive provided you retain the upstream copyright notice. Include that notice in your `LICENSE` (e.g. a "Portions derived from metal-fx, © Jakub Antalik" clause) and credit it in the README.
- If there is **no** license file, the default is "all rights reserved" — open an issue / ask the author for permission before publishing a derivative.
- Either vendor the engine (recommended, see §4) **with** attribution, or depend on `metal-fx` if it ever exposes the raw plasma layer (it currently does not).

## 3. Architecture

Two halves, exactly as in the playground:

### 3.1 Shared renderer (one per page)
A single offscreen WebGL canvas (96px² × capped DPR) compiles the plasma program once and renders one frame per tick on a single `requestAnimationFrame` loop. Every instance samples a crop of that one canvas — so N glass buttons cost one shader render plus N cheap copies, never N WebGL contexts. Released when the last instance unmounts; rebuilt on `webglcontextlost`/`restored`.

### 3.2 Per-instance layer stack (DOM + CSS)
The interior must move to real DOM layers because `backdrop-filter` (the frost) cannot be expressed in a 2D canvas. Bottom → top:

| z | Layer | Element | Role | Key technique |
|---|-------|---------|------|---------------|
| 0 | Outer bloom | `<canvas>` | wide, soft ambient glow, spills past edge | button-shaped plasma → CSS `filter: blur(large)`, low opacity |
| 1 | Inner bloom | `<canvas>` | tight, full-bright edge bleed | same, `blur(small)`, opacity 1 |
| 2 | Plasma | `<canvas>` | the metal, full coverage, shaped to the rounded rect | `drawImage` crop of shared GL canvas; `border-radius` clips |
| 3 | Frost (tint 1) | `<div>` | glass body: blurs + tints the plasma | `backdrop-filter: saturate(x) blur(y)`, `background: fill@frost` |
| 4 | Core (tint 2) | `<div>` inside an `overflow:hidden` clip | opaque center so metal doesn't reach the middle | inset box, `background: fill`, `filter: blur(coreBlur)`, clipped to shape |
| 5 | Border | `<div>` | crisp lit rim, theme-independent | `border: W solid color@opacity`, `border-radius` |
| 6 | Content | children | the actual button/label, fully interactive | normal flow; all effect layers are `pointer-events:none` |

The wrapper is `position:relative; isolation:isolate` (so `backdrop-filter` only sees the layers inside it) and is **not** `overflow:hidden` (the blooms must spill).

### 3.3 Compositing techniques (lift from the playground)
- **Frost** = `backdrop-filter` on tint 1 blurs whatever is painted behind it (the opaque plasma) and the element's own `background` tints it at `frost` opacity. This is Figma's *Background blur*.
- **Core** = `filter: blur()` on the inset tint 2 is Figma's *Layer blur*; it's wrapped in an `overflow:hidden` clip so the blur can't bleed past the shape.
- **Saturation compensation** = `saturate(>1)` is prepended to tint 1's `backdrop-filter`, boosting plasma chroma *before* the veil mutes it.
- **Blooms** = the same plasma crop is drawn button-shaped into a canvas larger than the button; a CSS blur turns the spill into the glow, so the blur radius *is* the falloff (no masks). Both blooms sample the **same crop** as the main plasma so the glow color continues the edge.
- **Resolution-independent crop**: `srcW = cssW * glW / 140 / shaderScale` (DPR cancels), `shaderScale` ≈ 1.6 pill / 1.3 circle. Reuse for main + both blooms.

Carry over from metal-fx unchanged: `ResizeObserver` (RAF-debounced) for sizing, `IntersectionObserver` to skip offscreen instances, pause on `visibilitychange`, context-loss recovery, SSR-safe mount (render a transparent placeholder, init WebGL after hydration).

## 4. Public API

Ship a framework-agnostic core plus a thin React wrapper so the package is easy to fork to other frameworks.

```ts
// types.ts
export type Preset = 'chromatic' | 'silver' | 'gold';
export type Theme  = 'dark' | 'light';

export interface BloomConfig { size: number; level: number; } // size = blur px, level = 0..1

export interface GlassSettings {
  bgBlur: number;        // px   — frost background-blur radius
  frost: number;         // 0..1 — frost tint opacity
  coreInset: number;     // px   — opaque core inset from edge
  coreBlur: number;      // px   — layer blur on the core
  saturate: number;      // >=1  — chroma compensation in the frost
  borderWidth: number;   // px
  borderOpacity: number; // 0..1
  borderColor: string;   // CSS color
  innerBloom: BloomConfig;
  outerBloom: BloomConfig;
}

// Built-in defaults, overridable. Button `fill` is intentionally NOT here — it's the
// surface color (a CSS background), supplied separately.
export const DEFAULT_SETTINGS: Record<Theme, GlassSettings>;
```

```ts
// React component
export interface GlassFxProps {
  children?: React.ReactNode;
  preset?: Preset;                 // default 'chromatic'
  theme?: Theme | 'auto';          // default 'auto' (prefers-color-scheme)
  fill?: string;                   // surface color; defaults per theme, also settable via --glassfx-fill
  radius?: number | string;        // optional border-radius override (else inferred from child)
  paused?: boolean;                // default false; also auto-pauses on prefers-reduced-motion / offscreen / hidden tab
  settings?: Partial<GlassSettings>;                                  // merged onto the active theme's defaults
  settingsByTheme?: Partial<Record<Theme, Partial<GlassSettings>>>;   // per-theme overrides
  className?: string;
  style?: React.CSSProperties;
}
export function GlassFx(props: GlassFxProps): JSX.Element;
```

```ts
// Vanilla core (the React component is a wrapper over this)
export interface GlassInstance {
  update(patch: Partial<GlassSettings>): void;
  setPreset(p: Preset): void;
  setTheme(t: Theme): void;
  setFill(color: string): void;
  destroy(): void;
}
export function createGlass(target: HTMLElement, opts?: {
  preset?: Preset; theme?: Theme; fill?: string; settings?: Partial<GlassSettings>;
}): GlassInstance;
```

Design intent matching the playground: **two preset tiers** — *effect presets* (the plasma palette, `preset`, varies by theme) and *settings presets* (the slider config, `DEFAULT_SETTINGS[theme]`, overridable). Switching `theme` loads that theme's palette **and** its settings defaults.

## 5. Default settings (dark = your spec; light = TBD)

```ts
export const DEFAULT_SETTINGS = {
  dark: {
    bgBlur: 6, frost: 0.66, coreInset: 8, coreBlur: 8, saturate: 1.3,
    borderWidth: 1, borderOpacity: 0.30, borderColor: 'hsl(0 0% 50%)',
    innerBloom: { size: 2,  level: 1.0  },
    outerBloom: { size: 16, level: 0.45 },
  },
  light: {
    // TODO: fill from your light-mode tuning. Light palettes are very pale,
    // so expect a higher `frost`/`saturate` and a darker `borderColor`.
    bgBlur: 6, frost: 0.66, coreInset: 8, coreBlur: 8, saturate: 1.3,
    borderWidth: 1, borderOpacity: 0.30, borderColor: 'hsl(0 0% 50%)',
    innerBloom: { size: 2,  level: 1.0  },
    outerBloom: { size: 16, level: 0.45 },
  },
} as const;

export const DEFAULT_FILL = { dark: '#0d0d12', light: '#eef0f3' } as const;
```

## 6. Parameter reference

| Param | Type | Range | Default (dark) | Notes |
|---|---|---|---|---|
| `bgBlur` | px | 0–20 | 6 | frost background-blur (Figma BG blur) |
| `frost` | 0–1 | 0.3–1 | 0.66 | frost tint opacity over plasma |
| `coreInset` | px | 0–28 | 8 | opaque core inset from edge |
| `coreBlur` | px | 0–32 | 8 | layer blur softening core→rim |
| `saturate` | × | 1–2 | 1.3 | chroma boost in frost backdrop-filter |
| `borderWidth` | px | 0–3 | 1 | |
| `borderOpacity` | 0–1 | 0–1 | 0.30 | |
| `borderColor` | CSS color | — | `hsl(0 0% 50%)` | |
| `innerBloom.size` | px | 0–24 | 2 | tight, sharp falloff |
| `innerBloom.level` | 0–1 | 0–1 | 1 | full brightness |
| `outerBloom.size` | px | 0–64 | 16 | wide, gradual |
| `outerBloom.level` | 0–1 | 0–0.9 | 0.45 | low opacity |
| `fill` | CSS color | — | `#0d0d12` / `#eef0f3` | surface; **not** a settings field |
| `preset` | enum | — | `chromatic` | plasma palette |
| `theme` | enum | — | `auto` | dark / light / auto |
| `paused` | bool | — | false | |

## 7. Repo structure

```
glass-fx/
├─ src/
│  ├─ index.ts                 # public exports (React + types)
│  ├─ core.ts                  # public vanilla exports (createGlass)
│  ├─ GlassFx.tsx              # React wrapper over the core
│  ├─ types.ts
│  ├─ styles.ts                # layer class names / inline style builders
│  └─ engine/
│     ├─ renderer/
│     │  ├─ context.ts         # shared WebGL context, program, instance registry, teardown
│     │  ├─ loop.ts            # shared RAF loop (+ visibility/reduced-motion gating)
│     │  └─ compositor.ts      # per-instance layer paint: blooms, plasma crop, tint styles
│     ├─ shaders.ts            # GLSL plasma (lift verbatim from metal-fx / playground)
│     ├─ presets.ts            # palette presets (chromatic/silver/gold × dark/light)
│     ├─ settings.ts           # DEFAULT_SETTINGS + DEFAULT_FILL
│     ├─ color.ts              # hexToRgb / hexToRgba
│     └─ perf.ts               # GL size, DPR cap, frame interval, crop constants
├─ demo/                       # the playground, now importing from ../src
│  ├─ index.html
│  └─ main.ts                  # the slider lab UI
├─ package.json
├─ tsconfig.json
├─ tsup.config.ts             # library build (ESM + CJS + d.ts)
├─ vite.config.ts             # demo dev/build
├─ README.md
├─ LICENSE                    # include metal-fx attribution
├─ CONTRIBUTING.md
└─ .github/workflows/
   ├─ ci.yml                  # typecheck + build on PR
   └─ release.yml             # npm publish on tag
```

This mirrors metal-fx's `src/engine/*` split so anyone familiar with the original can navigate it.

## 8. Build & packaging

Use **tsup** for the library (zero-config dual ESM/CJS + types) and **Vite** for the demo.

```jsonc
// package.json (skeleton)
{
  "name": "glass-fx",
  "version": "0.1.0",
  "description": "Frosted-glass UI surfaces lit by animated liquid-metal plasma. A sibling to metal-fx.",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".":      { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./core": { "types": "./dist/core.d.ts",  "import": "./dist/core.js",  "require": "./dist/core.cjs" }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "dev": "vite",                       // runs the demo
    "build": "tsup",                     // builds the lib
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": { "react": ">=18", "react-dom": ">=18" },
  "peerDependenciesMeta": { "react": { "optional": true }, "react-dom": { "optional": true } },
  "keywords": ["react","webgl","glassmorphism","frosted-glass","liquid-metal","shader","ui","backdrop-filter","metal-fx"],
  "license": "MIT",
  "repository": "github:<you>/glass-fx",
  "homepage": "https://glass-fx.<you>.dev"
}
```

Notes:
- `react` is a **peer** and marked optional so `glass-fx/core` can be used without React.
- `tsup` entry points: `src/index.ts` and `src/core.ts`, `format: ['esm','cjs']`, `dts: true`, `external: ['react','react-dom']`.
- Keep `sideEffects:false` for tree-shaking; the shared renderer must lazy-init on first `createGlass`/mount, not at import.

## 9. Requirements: performance, a11y, fallbacks

**Performance**
- One WebGL context, one program, one RAF loop for all instances; tear down on last unmount.
- Skip paint for offscreen instances (`IntersectionObserver`); pause the loop when the tab is hidden.
- Cap GL canvas to 96px² × min(2, DPR); render the loop at ~30fps (or 15 like metal-fx — make it a `perf.ts` constant).
- `backdrop-filter` is the heaviest part; document that many simultaneous glass instances are GPU-bound, and expose a way to disable the frost blur (set `bgBlur:0`).

**Accessibility**
- All effect layers `pointer-events:none`; never trap focus; the child stays the interactive element.
- Honor `prefers-reduced-motion: reduce` → freeze the plasma (still render one frame).
- `theme:'auto'` follows `prefers-color-scheme` and subscribes to changes.

**Graceful degradation / browser support**
- No WebGL → render a flat `fill` surface + border (no plasma/bloom).
- No `backdrop-filter` (feature-detect with `CSS.supports`) → frost falls back to a flat translucent `fill@frost` with no blur; everything else still works.
- Requires `ctx.roundRect` (all current evergreen browsers); polyfill if you need legacy.

## 10. Demo & docs

- The playground becomes `demo/` (Vite), importing from `../src` so it doubles as a live integration test while you develop (`npm run dev`).
- Deploy it to Vercel or GitHub Pages as the landing/docs page; record a short GIF for the README and npm.
- Include copy-paste examples: a primary button, an icon button (circle), a card, dark/light, and a custom `fill`.

## 11. Open-source scaffolding

- **README.md**: hero GIF → install → 30-second quickstart → props table (from §6) → "How it works" (link/condense §3) → presets → performance notes → **Credits** (metal-fx + author) → license.
- **LICENSE**: MIT (or match upstream), with the metal-fx attribution clause.
- **CONTRIBUTING.md**: dev setup (`npm i`, `npm run dev`), code layout (mirror §7), how to add a preset, PR/commit conventions.
- **CI**: typecheck + build on PRs; publish on tag (`npm publish --provenance` with an `NPM_TOKEN` secret). Consider [Changesets] for versioning.
- npm discoverability: the `keywords` above, a clear `description`, and the demo `homepage`.

## 12. Porting checklist for Claude Code

1. Scaffold the repo (§7), `package.json` (§8), `tsconfig`, `tsup.config.ts`, `vite.config.ts`, eslint.
2. **Engine, lifted from the playground / metal-fx:** `shaders.ts` (the GLSL string verbatim), `presets.ts` (the `PRESETS` object with dark+light 5-stop palettes), `settings.ts` (`DEFAULT_SETTINGS` + `DEFAULT_FILL` from §5), `color.ts`.
3. **Shared renderer:** move the WebGL setup + `uploadUniforms` + RAF loop from the playground into `renderer/context.ts` + `renderer/loop.ts`; add an instance registry and teardown; add visibility + reduced-motion gating.
4. **Compositor:** move `measure` / `layoutBloom` / `applyGlassStyle` / `applyBorder` / `cropForButton` / `paintBloom` / `paint` into `renderer/compositor.ts`, creating the 6 DOM layers per instance.
5. **Core API:** wrap the above as `createGlass(el, opts)` returning `GlassInstance` (`update`/`setPreset`/`setTheme`/`setFill`/`destroy`).
6. **React wrapper** `GlassFx.tsx`: `useLayoutEffect` to create the instance on the wrapper ref, props → `update`, theme `auto` via `matchMedia`, cleanup on unmount, SSR-safe (no WebGL until mounted).
7. **Demo:** port the slider lab to `demo/main.ts` importing from `../src`; keep the two preset tiers and the dark/light loader.
8. **Fallbacks** (§9), then **README/LICENSE/CONTRIBUTING/CI**, attribution included.
9. `npm run build`, smoke-test the demo, `npm publish` (after the license check in §2).

**Copy directly from `metal-fx-glass4-demo.html`:** the fragment shader, `PRESETS`, `SETTINGS`/`FILL`, the crop math, the layer CSS, and the whole compositor — it's all there and working; the job is mostly relocating it into modules and adding the React/vanilla surface + packaging.

## 13. Decisions to make first

- **Name** (`glass-fx`? something else) and npm availability.
- **Fork vs. standalone** — recommend standalone with a vendored, attributed engine (§2/§4) unless you want to co-maintain with upstream.
- **License** — confirm metal-fx's terms permit a derivative and pick yours accordingly.
- **Frame rate** (15 vs 30) and whether to expose it.
- Whether to ship the **lit-gradient border** option (brighter top edge) discussed earlier as a `borderStyle: 'solid' | 'lit'` from day one or post-1.0.
