// Public vanilla API: createGlass(target, opts) -> GlassInstance.
// Wraps the shared renderer + per-instance compositor and wires up sizing
// (ResizeObserver), offscreen skipping (IntersectionObserver), and effect/theme/fill
// updates. This is `glass-pulse-fx/core` — usable with no framework.

import { acquireRenderer, releaseRenderer, type SharedRenderer } from './engine/renderer/context';
import { addRuntime, removeRuntime, markDirty, type Runtime } from './engine/renderer/loop';
import { createCompositor, type Compositor } from './engine/renderer/compositor';
import { EFFECTS, mergeEffectParams } from './engine/effects';
import { DEFAULT_SETTINGS, DEFAULT_FILL, mergeSettings } from './engine/settings';
import type {
  CreateGlassOptions,
  EffectId,
  EffectParams,
  GlassInstance,
  GlassSettings,
  Kind,
  Theme,
} from './types';

export * from './types';
export { DEFAULT_SETTINGS, DEFAULT_FILL, mergeSettings } from './engine/settings';
export { EFFECTS, EFFECT_IDS, mergeEffectParams } from './engine/effects';

const keyFor = (id: EffectId, params: EffectParams) => id + ':' + JSON.stringify(params);

function inferKind(el: HTMLElement, radius?: number | string): Kind {
  if (radius === '50%') return 'circle';
  const br = getComputedStyle(el).borderRadius;
  if (br && br.includes('%') && parseFloat(br) >= 50) return 'circle';
  return 'rect';
}

export function createGlass(target: HTMLElement, opts: CreateGlassOptions = {}): GlassInstance {
  let theme: Theme = opts.theme ?? 'dark';
  let effect: EffectId = opts.effect ?? 'panes';
  let params: EffectParams = mergeEffectParams(EFFECTS[effect].defaults[theme], opts.effectParams);

  const fillPinned = opts.fill != null;
  let fill = opts.fill ?? DEFAULT_FILL[theme];

  const basePatch = opts.settings; // creation-time overrides, re-applied on theme switch
  let settings: GlassSettings = mergeSettings(DEFAULT_SETTINGS[theme], basePatch);

  const kind: Kind = opts.kind ?? inferKind(target, opts.radius);

  let renderer: SharedRenderer | null = null;
  let degraded = false;
  try {
    renderer = acquireRenderer();
  } catch {
    degraded = true; // no WebGL -> flat fill + border fallback
  }

  const comp: Compositor = createCompositor(target, kind, { radius: opts.radius, degraded });
  comp.applyStyle(settings, fill);

  const rt: Runtime = {
    key: keyFor(effect, params),
    effectId: effect,
    params,
    paused: opts.paused ?? false,
    visible: true,
    needsPaint: true,
    paint() {
      if (renderer) comp.paint(renderer.glCanvas);
    },
  };

  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;

  if (!degraded && renderer) {
    addRuntime(rt, renderer);
    let rafScheduled = false;
    ro = new ResizeObserver(() => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        comp.measure();
        rt.needsPaint = true;
        markDirty();
      });
    });
    ro.observe(target);
    io = new IntersectionObserver((entries) => {
      for (const e of entries) rt.visible = e.isIntersecting;
      markDirty();
    });
    io.observe(target);
  }

  function restyle(): void {
    comp.applyStyle(settings, fill);
    rt.needsPaint = true;
    markDirty();
  }
  function syncEffect(): void {
    rt.effectId = effect;
    rt.params = params;
    rt.key = keyFor(effect, params);
    rt.needsPaint = true;
    markDirty();
  }

  return {
    update(patch) {
      settings = mergeSettings(settings, patch);
      restyle();
    },
    setEffect(id) {
      effect = id;
      params = mergeEffectParams(EFFECTS[id].defaults[theme]);
      syncEffect();
    },
    setEffectParams(patch) {
      params = mergeEffectParams(params, patch);
      syncEffect();
    },
    setTheme(t) {
      theme = t;
      settings = mergeSettings(DEFAULT_SETTINGS[theme], basePatch);
      if (!fillPinned) fill = DEFAULT_FILL[theme];
      restyle();
    },
    setFill(color) {
      fill = color;
      restyle();
    },
    setPaused(paused) {
      rt.paused = paused;
      rt.needsPaint = true;
      markDirty();
    },
    destroy() {
      ro?.disconnect();
      io?.disconnect();
      removeRuntime(rt);
      comp.destroy();
      if (!degraded) releaseRenderer();
    },
  };
}
