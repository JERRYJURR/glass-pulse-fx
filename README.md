# glass-pulse-fx

https://github.com/user-attachments/assets/ab078f4b-b51b-4b83-834e-a85bf3da4480

> Customizable UI library for illuminating components with an animated, pulsing backlight.

Wrap any element — button, chip, card — and `glass-pulse-fx` paints a frosted-glass
material **on top of it**: a shared animated shader, a `backdrop-filter` frost, an opaque
blurred core, an optional lit rim, and two bloom layers that spill glow past the
silhouette. It never replaces your element — it reads your element's own background and
frosts *that*, so the glass sits on your surface.

One shared WebGL context renders the effect for the whole page; every instance is a handful
of cheap canvas copies plus CSS layers. The base shader is original (no third-party
attribution required) and the shader layer is pluggable.

## Requirements

- **React 18+** for the `<GlassFx>` component — or skip React entirely with the
  framework-free `glass-pulse-fx/core` (`createGlass`).
- **WebGL** for the animated light. Without it the effect degrades to a flat fill + border;
  without `backdrop-filter`, to a flat translucent tint.

## Install

```bash
npm install glass-pulse-fx
```

## Quick start (React)

```tsx
import { GlassFx } from 'glass-pulse-fx';
import { bloom } from 'glass-pulse-fx/presets';

export default function Cta() {
  return (
    <GlassFx preset={bloom} radius={12}>
      <button className="your-button">Upgrade to Pro</button>
    </GlassFx>
  );
}
```

`<GlassFx>` wraps your component and overlays the glass. Style `.your-button` however you
like — its background becomes the frosted surface. `preset` is one ready-made look;
`radius` matches the glass corners to your component.

## Quick start (vanilla)

```ts
import { createGlass } from 'glass-pulse-fx/core';
import { comet } from 'glass-pulse-fx/presets';

const glass = createGlass(document.querySelector('#cta')!, {
  preset: comet,
  theme: 'dark',
});

// later — tweak live, then clean up
glass.update({ bgBlur: 10, frost: 0.5 });
glass.destroy();
```

## The overlay model

`glass-pulse-fx` paints **on top of** the element you wrap — it never touches its
background, border, radius, or shadow. The frost and core take their tint from your
element's own background (flattened to an opaque color over whatever sits behind it), so the
glass reads as *your* component's surface, frosted and lit — not a fill the library owns.

In short: style your component normally; the library reads it. `fill` and `border` (below)
are **optional overrides** — by default the surface tint comes from your element's
background and your element's own CSS border is the border.

## Presets

A `GlassPreset` is one shareable look — shader + params + glass material. It applies
identically in dark and light mode; anything it does **not** pin (palette, frost, …) still
adapts to the theme defaults. It carries **no component styling** (`fill` / `border` /
`radius`) — those belong to the component you wrap. Eleven presets ship — `bloom`, `halo`,
`rush`, `comet`, `cinder`, `plasma`, `kaleido`, `nimbus`, `emerald`, `glow`, `tide` (plus
`LIBRARY_PRESETS`, the full array):

```tsx
import { GlassFx } from 'glass-pulse-fx';
import { bloom } from 'glass-pulse-fx/presets';

<GlassFx preset={bloom}>
  <button className="your-button">Ping</button>
</GlassFx>
```

Want a *different* look per mode? One ternary:

```tsx
import { rush, tide } from 'glass-pulse-fx/presets';

<GlassFx preset={isDark ? tide : rush} theme={isDark ? 'dark' : 'light'}>
```

Vanilla — `preset` is a `createGlass` option:

```ts
import { comet } from 'glass-pulse-fx/presets';
const glass = createGlass(el, { preset: comet });
```

### Custom presets

A preset is just an object — the [demo playground](#demo--playground) serializes whatever
you tune into a ready-to-paste literal (it updates live as you drag the controls; copying it
**freezes that look** into your code — it's a snapshot, not a live link):

```ts
import type { GlassPreset } from 'glass-pulse-fx';

const mine: GlassPreset = {
  name: 'Mine',
  version: 1,
  effectParams: { speed: 0.4, colors: ['#ff2d9b', '#19c3ff', '#15e6a4'] },
  settings: { bgBlur: 10, frost: 0.5 },
};

<GlassFx preset={mine}>…</GlassFx>
```

## Props (React) / options (vanilla)

| Prop / option | Type | Default | Notes |
|---|---|---|---|
| `preset` | `GlassPreset` | — | a shareable look; explicit props below win over it |
| `effect` | `'panes'` | `panes` | base shader |
| `effectParams` | `Partial<EffectParams>` | — | merged onto the preset's params + the effect's theme defaults |
| `theme` | `'dark' \| 'light' \| 'auto'` | `auto` (React) / `dark` (vanilla) | `auto` follows `prefers-color-scheme` |
| `fill` | CSS color | your element's background | override the frosted surface tint |
| `border` | `Partial<BorderConfig>` | off | optional lit rim `{ width, opacity, color }` — off by default, your element's own border shows |
| `radius` | `number \| string` | inferred | sets the glass clip + your element's `border-radius` |
| `kind` | `'pill' \| 'circle' \| 'rect' \| 'tag' \| 'card' \| 'icon'` | inferred | crop scale + default corner radius |
| `fps` | `15 \| 30 \| 60` | `30` | animation paint rate |
| `paused` | `boolean` | `false` | also auto-pauses on reduced-motion / offscreen / hidden tab |
| `bloomClip` | `boolean` | `false` | clip the bloom to the rounded box instead of letting it spill |
| `settings` | `GlassSettingsPatch` | — | glass material, merged onto theme defaults |
| `settingsByTheme` | `Partial<Record<Theme, GlassSettingsPatch>>` | — | per-theme glass overrides (React) |

### `GlassSettings` (the glass material — effect-independent)

| Field | Range | Default (dark) | Meaning |
|---|---|---|---|
| `bgBlur` | 0–20 px | 6 | frost background-blur |
| `frost` | 0.3–1 | 0.66 | frost tint opacity over the shader |
| `frostInset` | 0–12 px | 0 | insets the frost veil, exposing a raw full-brightness shader rim at the edge |
| `shaderInset` | 0–28 px | 0 | insets the animated shader source/bloom from the outer edge |
| `coreInset` | 0–28 px | 8 | opaque core inset from edge |
| `coreBlur` | 0–32 px | 8 | layer blur softening core → rim |
| `coreOpacity` | 0–1 | 1 | core opacity (lower = shader shows through the center) |
| `coreProportional` | bool | `false` | scale `coreInset` + `coreBlur` with element size (ref 52px) |
| `saturate` | 1–2× | 1.3 | chroma boost in the frost (counters the veil) |
| `innerBloom` | `{ size 0–24, level 0–1 }` | `{2, 1}` | tight, full-bright edge bleed |
| `outerBloom` | `{ size 0–64, level 0–0.9 }` | `{16, 0.45}` | wide, soft ambient glow |

## How it works

Per instance, bottom → top: **outer bloom** · **inner bloom** · a shared rounded
**surface mask** containing the insettable **shader** crop, **frost** (`backdrop-filter:
saturate() blur()` over a tint taken from your element's background), and **core** (an
inset, layer-blurred opaque fill) · an optional **lit border** · then your content. The
wrapper is `position:relative; isolation:isolate` and is **not** `overflow:hidden` (the
blooms must spill, unless you set `bloomClip`). All effect layers are `pointer-events:none`,
and your element's own background, border, radius, and shadow are left untouched.

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

### Writing your own shader

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
- Offscreen instances are skipped (`IntersectionObserver`); the loop pauses when the tab is
  hidden and freezes on `prefers-reduced-motion: reduce`.
- `backdrop-filter` is the heaviest part — set `bgBlur: 0` to drop the frost blur.
- No WebGL → flat `fill` + border. No `backdrop-filter` → flat translucent tint.

## Demo / playground

```bash
npm run dev          # http://localhost:5173 — sidebar playground, save full-look presets
npm run build:demo   # static site -> dist-demo/
```

The playground docks all controls in a left sidebar, shows live mockups, and keeps your
presets in `localStorage` (library presets from [`src/presets/`](src/presets/) appear
read-only — Duplicate to riff on one). The **Install** tab generates ready-to-paste React or
vanilla code from whatever you've tuned. See [SEPARATING-THE-DEMO.md](SEPARATING-THE-DEMO.md)
for deploying it standalone.

## License

MIT © 2026 Jerry Kou. All shaders are original work.
