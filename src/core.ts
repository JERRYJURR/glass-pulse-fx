// Public vanilla API: createGlass(target, opts) -> GlassInstance.
// Wraps the shared renderer + per-instance compositor and wires up sizing
// (ResizeObserver), offscreen skipping (IntersectionObserver), and effect/theme/fill
// updates. This is `glass-pulse-fx/core` — usable with no framework.

import { acquireRenderer, releaseRenderer, type SharedRenderer } from './engine/renderer/context';
import { addRuntime, removeRuntime, markDirty, type Runtime } from './engine/renderer/loop';
import { createCompositor, type Compositor } from './engine/renderer/compositor';
import { EFFECTS, mergeEffectParams } from './engine/effects';
import { DEFAULT_SETTINGS, DEFAULT_FILL, DEFAULT_BORDER, mergeSettings, mergeBorder } from './engine/settings';
import { frameMsForFps } from './engine/perf';
import type {
  BorderConfig,
  CreateGlassOptions,
  EffectId,
  EffectParams,
  FpsMode,
  GlassInstance,
  GlassSettings,
  Kind,
  Theme,
} from './types';

export * from './types';
export { DEFAULT_SETTINGS, DEFAULT_FILL, DEFAULT_BORDER, mergeSettings, mergeBorder } from './engine/settings';
export { EFFECTS, EFFECT_IDS, VELOCITY_PRESETS, mergeEffectParams } from './engine/effects';

const keyFor = (id: EffectId, params: EffectParams) => id + ':' + JSON.stringify(params);

function inferKind(el: HTMLElement, radius?: number | string): Kind {
  if (radius === '50%') return 'circle';
  const br = getComputedStyle(el).borderRadius;
  if (br && br.includes('%') && parseFloat(br) >= 50) return 'circle';
  return 'rect';
}

// Combine two settings patches (b wins), deep-merging the bloom configs.
function combinePatches(
  a?: Partial<GlassSettings>,
  b?: Partial<GlassSettings>,
): Partial<GlassSettings> | undefined {
  if (!a || !b) return a ?? b;
  const out: Partial<GlassSettings> = { ...a, ...b };
  if (a.innerBloom && b.innerBloom) out.innerBloom = { ...a.innerBloom, ...b.innerBloom };
  if (a.outerBloom && b.outerBloom) out.outerBloom = { ...a.outerBloom, ...b.outerBloom };
  return out;
}

export function createGlass(target: HTMLElement, opts: CreateGlassOptions = {}): GlassInstance {
  const preset = opts.preset;
  let theme: Theme = opts.theme ?? 'dark';
  let effect: EffectId = opts.effect ?? preset?.effect ?? 'panes';

  // Explicit param overrides (incl. the preset's) accumulate here and stay constant
  // across themes; setTheme re-bases them onto the new theme's effect defaults, so
  // anything a preset doesn't pin still adapts per theme.
  let userParams: Partial<EffectParams> = {};
  function rememberParams(patch?: Partial<EffectParams>): void {
    if (!patch) return;
    userParams = { ...userParams, ...patch };
    if (patch.colors) userParams.colors = [...patch.colors];
  }
  rememberParams(preset?.effectParams);
  rememberParams(opts.effectParams);
  let params: EffectParams = mergeEffectParams(EFFECTS[effect].defaults[theme], userParams);

  const fillPinned = opts.fill != null;
  let fill = opts.fill ?? DEFAULT_FILL[theme];

  // creation-time overrides (preset's beneath explicit), re-applied on theme switch
  const basePatch = combinePatches(preset?.settings, opts.settings);
  let settings: GlassSettings = mergeSettings(DEFAULT_SETTINGS[theme], basePatch);

  // border overrides accumulate (like effect params) and re-base onto theme defaults
  let borderPatch: Partial<BorderConfig> = { ...opts.border };
  let border: BorderConfig = mergeBorder(DEFAULT_BORDER[theme], borderPatch);

  const kind: Kind = opts.kind ?? inferKind(target, opts.radius);

  let renderer: SharedRenderer | null = null;
  let degraded = false;
  try {
    renderer = acquireRenderer();
  } catch {
    degraded = true; // no WebGL -> flat fill + border fallback
  }

  const comp: Compositor = createCompositor(target, kind, { radius: opts.radius, degraded });
  comp.setSampling(EFFECTS[effect].sampling?.(params) === 'isotropic');
  comp.applyStyle(settings, fill, border);

  const rt: Runtime = {
    key: keyFor(effect, params),
    effectId: effect,
    params,
    frameMs: frameMsForFps(opts.fps),
    lastPaintMs: 0,
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
    comp.applyStyle(settings, fill, border);
    rt.needsPaint = true;
    markDirty();
  }
  function syncEffect(): void {
    rt.effectId = effect;
    rt.params = params;
    rt.key = keyFor(effect, params);
    comp.setSampling(EFFECTS[effect].sampling?.(params) === 'isotropic');
    rt.needsPaint = true;
    markDirty();
  }
  function setRuntimeFps(fps: FpsMode): void {
    rt.frameMs = frameMsForFps(fps);
    rt.lastPaintMs = 0;
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
      userParams = {};
      params = mergeEffectParams(EFFECTS[id].defaults[theme]);
      syncEffect();
    },
    setEffectParams(patch) {
      rememberParams(patch);
      params = mergeEffectParams(params, patch);
      syncEffect();
    },
    setTheme(t) {
      theme = t;
      settings = mergeSettings(DEFAULT_SETTINGS[theme], basePatch);
      if (!fillPinned) fill = DEFAULT_FILL[theme];
      border = mergeBorder(DEFAULT_BORDER[theme], borderPatch);
      params = mergeEffectParams(EFFECTS[effect].defaults[theme], userParams);
      syncEffect();
      restyle();
    },
    setFill(color) {
      fill = color;
      restyle();
    },
    setBorder(patch) {
      borderPatch = { ...borderPatch, ...patch };
      border = mergeBorder(border, patch);
      restyle();
    },
    setFps(fps) {
      setRuntimeFps(fps);
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
