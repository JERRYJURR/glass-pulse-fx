# glass-pulse-fx

> Frosted-glass UI surfaces lit by animated, original WebGL shaders.

Wrap any element (button, chip, card) and `glass-pulse-fx` renders, behind it, a
frosted-glass material whose edges catch animated light: a shared shader layer, a
`backdrop-filter` frost, an opaque blurred core, a thin lit rim, and two bloom layers
that spill glow past the silhouette.

One shared WebGL context renders the effect for the whole page; every instance is a
handful of cheap canvas copies plus CSS layers. The base shaders are original (no
third-party attribution required) and the shader layer is pluggable — bring your own.

## Shaders

One built-in base shader (the layer is pluggable — bring your own):

- **Panes** — discrete colored bands moving along a 1D coordinate: each fades in, holds,
  fades out (via alpha, so the glass shows through), then a transparent interval before the
  next. Knobs: `motion` (**Linear** sweep, **Center** — mirrored, bands emanate from the
  middle, **Radial** — concentric rings ripple outward, **Orbit** — spokes sweep around
  like a radar; `scale` rounds to the spoke count and the colour gradient snaps to whole
  cycles around the ring so it wraps seamlessly),
  `speed` (sign sets direction), a **velocity preset** (`velocity` — how band speed varies
  across the axis: uniform, ease in/out, slow/fast middle), `scale` (band density), `interval`
  (transparent spacing between bands), `rampIn` / `rampOut` (independent leading/trailing
  fade), `angle`, and a **colour field decoupled from the bands** — 1–5 palette stops
  sampled by `colorSpread` (along the motion), `colorSkew` (perpendicular → mesh) and
  `colorDrift` (over time), so colour can vary *within* a band, not just band-to-band.

## Install

```bash
npm install glass-pulse-fx
```

`react` / `react-dom` are optional peers — use `glass-pulse-fx/core` with no framework.

## Quickstart (React)

```tsx
import { GlassFx } from 'glass-pulse-fx';

export default function Cta() {
  return (
    <GlassFx effect="panes" theme="auto" radius={12}>
      <button style={{ all: 'unset', padding: '0 26px', height: 52, cursor: 'pointer' }}>
        Upgrade to Pro
      </button>
    </GlassFx>
  );
}
```

## Quickstart (vanilla)

```ts
import { createGlass } from 'glass-pulse-fx/core';

const glass = createGlass(document.querySelector('#cta')!, {
  kind: 'pill',
  effect: 'panes',
  theme: 'dark',
});

glass.setEffectParams({ motion: 1, speed: 0.4, colors: ['#ff2d9b', '#19c3ff', '#15e6a4'] });
glass.update({ bgBlur: 10, frost: 0.5 });
glass.destroy();
```

## Presets

A `GlassPreset` is one shareable look — shader + params + glass material. It applies
identically in dark and light mode; anything it does **not** pin (palette, frost, …)
still adapts to the theme defaults. It deliberately carries **no component styling**
(`fill` / `border` / `radius`): those belong to the component you wrap. Ten presets
ship with the package — `auroraVeil`, `sonar`, `beacon`, `radar`, `neon`, `ember`,
`solar`, `prism`, `bubblegum`, `midnight` (plus `LIBRARY_PRESETS`, the full list):

```tsx
import { GlassFx } from 'glass-pulse-fx';
import { sonar } from 'glass-pulse-fx/presets';

<GlassFx preset={sonar}>
  <button>Ping</button>
</GlassFx>
```

If your site has its own light/dark switch and you want a *different* look per mode,
pass a different preset per mode — it's one ternary:

```tsx
<GlassFx preset={isDark ? neon : midnight} theme={isDark ? 'dark' : 'light'}>
```

Vanilla — `preset` is a `createGlass` option:

```ts
import { sonar } from 'glass-pulse-fx/presets';

const glass = createGlass(el, { preset: sonar });
```

Preset files live in [`src/presets/`](src/presets/), one export per file. The preset
lab's **Export** button generates a ready-to-commit preset file — or React / vanilla
usage code — from whatever you tuned, containing only the values that differ from the
defaults.

## Props (React) / options (vanilla)

| Prop / option | Type | Default | Notes |
|---|---|---|---|
| `preset` | `GlassPreset` | — | a shareable look; explicit props below win over it |
| `effect` | `'panes'` | `panes` | base shader |
| `effectParams` | `Partial<EffectParams>` | — | merged onto the preset's params + the effect's theme defaults |
| `theme` | `'dark' \| 'light' \| 'auto'` | `auto` (React) | `auto` follows `prefers-color-scheme` |
| `fill` | CSS color | per theme | surface color — component styling, never in presets |
| `border` | `Partial<BorderConfig>` | per theme | the lit rim: `{ width, opacity, color }` — component styling |
| `radius` | `number \| string` | inferred | border-radius override |
| `kind` | `'pill' \| 'circle' \| 'rect' \| 'tag' \| 'card' \| 'icon'` | inferred | crop scale + default corner radius |
| `fps` | `15 \| 30 \| 60` | `30` | animation paint rate |
| `paused` | `boolean` | `false` | also auto-pauses on reduced-motion / offscreen / hidden tab |
| `settings` | `Partial<GlassSettings>` | — | glass material, merged onto theme defaults |
| `settingsByTheme` | `Partial<Record<Theme, Partial<GlassSettings>>>` | — | per-theme glass overrides (React) |

### `GlassSettings` (the glass material — shader-independent)

| Field | Range | Default (dark) | Meaning |
|---|---|---|---|
| `bgBlur` | 0–20 px | 6 | frost background-blur |
| `frost` | 0.3–1 | 0.66 | frost tint opacity over the shader |
| `frostInset` | 0–12 px | 0 | insets the frost veil, exposing a raw full-brightness shader rim at the edge |
| `coreInset` | 0–28 px | 8 | opaque core inset from edge |
| `coreBlur` | 0–32 px | 8 | layer blur softening core → rim |
| `coreOpacity` | 0–1 | 1 | core opacity (lower = shader shows through the center) |
| `coreProportional` | bool | `false` | scale `coreInset` + `coreBlur` with element size (ref 52px) |
| `saturate` | 1–2× | 1.3 | chroma boost in the frost (counters the veil) |
| `innerBloom` | `{ size 0–24, level 0–1 }` | `{2, 1}` | tight, full-bright edge bleed |
| `outerBloom` | `{ size 0–64, level 0–0.9 }` | `{16, 0.45}` | wide, soft ambient glow |

## How it works

Per instance, bottom → top: **outer bloom** · **inner bloom** · a shared rounded
**surface mask** containing the **shader** crop, **frost** (`backdrop-filter:
saturate() blur()` over a `fill@frost` tint), and **core** (an inset, layer-blurred
opaque fill) · **border** · then your content. The wrapper is `position:relative;
isolation:isolate` and is **not** `overflow:hidden` (the blooms must spill). All effect
layers are `pointer-events:none`.

## Writing your own shader

Effects are isolated to [`src/engine/effects/`](src/engine/effects/). To add one:

1. Write an `EffectDef` (GLSL `frag`, `uniforms`, per-theme `defaults`, an `upload`, and
   demo `controls`) — see [`panes.ts`](src/engine/effects/panes.ts). Reuse the shared
   `paneColor` helper + uniform plumbing in [`common.ts`](src/engine/effects/common.ts).
2. List it in [`effects/index.ts`](src/engine/effects/index.ts) and add its id to the
   `EffectId` union + any new fields to `EffectParams` in [`types.ts`](src/types.ts).

The renderer and compositor never reference uniform names — they only call
`renderEffect(id, params, time)`.

## Performance & accessibility

- One WebGL context, one program per effect, one RAF loop (~30 fps), torn down on last
  unmount. Cost is one shader render per distinct (effect, params) group + N cheap copies.
- Offscreen instances are skipped (`IntersectionObserver`); the loop pauses when the tab
  is hidden and freezes on `prefers-reduced-motion: reduce`.
- `backdrop-filter` is the heaviest part — set `bgBlur: 0` to drop the frost blur.
- No WebGL → flat `fill` + border. No `backdrop-filter` → flat translucent tint.

## Demo / preset lab

```bash
npm run dev          # http://localhost:5173 — sidebar lab, save full-look presets
npm run build:demo   # static site -> dist-demo/
```

The lab docks all controls in a left sidebar (independently scrollable), shows six shape
mockups, and keeps your presets in `localStorage` (library presets from
[`src/presets/`](src/presets/) appear read-only — Duplicate to riff on one). A preset
captures the shader, its params, and the glass material as one look — flipping the
lab's theme shows how that same look reads on the other mode; component styling
(fill / border) stays out, as session state. **Export** emits ready-to-paste
React or vanilla code, or a preset file to commit. See
[SEPARATING-THE-DEMO.md](SEPARATING-THE-DEMO.md) for deploying it standalone.

## License

MIT © 2026 Jerry Kou. All shaders are original work.
