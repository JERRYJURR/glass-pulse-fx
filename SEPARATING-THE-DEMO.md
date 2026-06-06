# Should the demo be its own repo?

Short answer: **not yet.** Keep it in this repo for now — it's already independently
deployable. Split it out only once it grows past "playground" into a real marketing/docs
site. Here's the reasoning and the migration path.

## Why keep it together now

- **The demo is a live integration test.** `demo/` imports straight from `../src`, so
  `npm run dev` exercises the actual library on every change. A separate repo would
  depend on a *published* (or linked) version and stop catching breakage early.
- **You can already deploy it separately.** Co-located ≠ co-deployed:
  - **Vercel:** New Project → this repo → set **Build Command** `npm run build:demo`
    and **Output Directory** `dist-demo`. Done — the demo deploys on its own URL while
    the library keeps living in the same repo. (Or `vercel.json` with those settings.)
  - **GitHub Pages:** `npm run build:demo` and publish `dist-demo/` (the `base: './'`
    in `vite.config.ts` already handles a subpath).
- **One source of truth.** Shipping a shader change and updating the demo that shows it
  off is a single PR, not a coordinated two-repo dance.

## When splitting *does* pay off

Move `demo/` to its own repo once any of these is true:

- it becomes a full **landing/docs site** (MDX, blog, multiple routes, its own design
  system) with a release cadence unrelated to the library;
- it needs **heavy deps** you don't want anywhere near the library's `devDependencies`;
- you want **non-library contributors** working on the site without touching `src/`;
- the site's deploy/build config starts fighting the library's tooling.

## You're set up to split painlessly

`demo/` is self-contained (its own `index.html`, `style.css`, `main.ts`) and touches
the library only through imports. To split later:

1. Create `glass-pulse-fx-demo`, copy `demo/` in as the root.
2. Change `import … from '../src/core'` → `import … from 'glass-pulse-fx'`, add it to
   `dependencies`. (Use `npm link` / a workspace for local dev against unreleased code.)
3. Point Vercel/Pages at the new repo; drop `build:demo` + `dist-demo` from this one.

Until then: one repo, two deploy targets.
