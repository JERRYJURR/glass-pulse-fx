# Contributing

## Dev setup

```bash
npm install
npm run dev          # demo preset lab at http://localhost:5173 (imports ../src live)
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server for the demo (hot-reloads `src/`) |
| `npm run build` | tsup → `dist/` (ESM + CJS + `.d.ts`), the publishable library |
| `npm run build:demo` | Vite build → `dist-demo/` (the deployable playground) |
| `npm run typecheck` | `tsc --noEmit` over `src/` + `demo/` |
| `npm run lint` | ESLint |

## Code layout

```
src/
  index.ts            public exports (React + core)
  core.ts             createGlass() — the vanilla API
  GlassFx.tsx         React wrapper over the core
  types.ts            public types (GlassSettings, EffectParams, EffectId, …)
  styles.ts           layer class names + structural styles
  engine/
    effects/                      ← the pluggable shader layer
      common.ts       shared GLSL (paneColor) + uniform plumbing
      panes.ts        Panes EffectDef
      index.ts        EFFECTS registry + mergeEffectParams
    settings.ts       DEFAULT_SETTINGS + DEFAULT_FILL (glass material)
    color.ts          hex helpers
    perf.ts           GL size, DPR cap, frame rate, crop + per-kind scales
    renderer/
      context.ts      shared WebGL context, one program per effect, lifecycle
      loop.ts         shared RAF loop + grouping + visibility/reduced-motion gating
      compositor.ts   per-instance 6-layer stack: measure, paint, styles
demo/                 the preset lab (Vite app importing ../src)
```

## Adding a shader

1. Create `src/engine/effects/<name>.ts` exporting an `EffectDef`: GLSL `frag` (start
   from `COMMON_GLSL` in `common.ts` for the palette helpers), the full `uniforms` list,
   per-theme `defaults`, an `upload(gl, U, params)`, and demo `controls`.
2. Register it in `effects/index.ts` and add its id to the `EffectId` union in
   `types.ts`. Add any new params to `EffectParams` (and give them defaults in every
   effect, so the param object stays uniform).

The compositor and renderer are shader-agnostic — they only call
`renderEffect(id, params, time)`.

## Conventions

- TypeScript strict; keep `src/` framework-agnostic except `GlassFx.tsx`.
- No side effects at import — the shared renderer lazy-inits on first `createGlass`.
- Run `npm run typecheck` before opening a PR.
