// Public vanilla API: createGlass(target, opts) -> GlassInstance.
// Wraps the shared renderer + per-instance compositor and wires up sizing
// (ResizeObserver), offscreen skipping (IntersectionObserver), and effect/theme/fill
// updates. This is `glass-pulse-fx/core` — usable with no framework.

import { acquireRenderer, releaseRenderer, type SharedRenderer } from './engine/renderer/context';
import { addRuntime, removeRuntime, markDirty, type Runtime } from './engine/renderer/loop';
import { createCompositor, type Compositor } from './engine/renderer/compositor';
import { EFFECTS, mergeEffectParams } from './engine/effects';
import { DEFAULT_SETTINGS, DEFAULT_FILL, DEFAULT_BORDER, mergeSettings, mergeBorder } from './engine/settings';
import { parseColor, compositeOver, rgbToHex, type RGBA } from './engine/color';
import { frameMsForFps } from './engine/perf';
import type {
  BorderConfig,
  CreateGlassOptions,
  EffectId,
  EffectParams,
  FpsMode,
  GlassInstance,
  GlassSettings,
  GlassSettingsPatch,
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

// The opaque color seen *through* an element — its ancestor backgrounds flattened
// (the eyedropper backdrop a translucent component surface sits on).
function backdropOf(el: HTMLElement): RGBA {
  const layers: RGBA[] = [];
  for (let n = el.parentElement; n; n = n.parentElement) {
    const c = parseColor(getComputedStyle(n).backgroundColor);
    if (c.a > 0) layers.push(c);
    if (c.a >= 1) break; // opaque ancestor — stop
  }
  let out: RGBA =
    layers.length && layers[layers.length - 1].a >= 1 ? layers.pop()! : { r: 0, g: 0, b: 0, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) out = compositeOver(layers[i], out);
  return out;
}

// The component GlassPulse wraps *is* the surface: read its own background and flatten
// any translucency against the backdrop, so the glass gets an opaque tint (and the
// frost/core opacity settings don't double-count the component's alpha). null when the
// host is transparent — caller falls back to the theme default.
function readHostFill(el: HTMLElement): string | null {
  const own = parseColor(getComputedStyle(el).backgroundColor);
  if (own.a <= 0) return null;
  if (own.a >= 1) return rgbToHex(own);
  return rgbToHex(compositeOver(own, backdropOf(el)));
}

// Combine two settings patches (b wins), deep-merging the bloom configs.
function combinePatches(
  a?: GlassSettingsPatch,
  b?: GlassSettingsPatch,
): GlassSettingsPatch | undefined {
  if (!a || !b) return a ?? b;
  const out: GlassSettingsPatch = { ...a, ...b };
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

  // The glass is painted ON TOP of the component — we never touch its background,
  // border, radius, or shadow. With no explicit fill we read the component's own
  // background and flatten it to an opaque tint for the frost/core (so their opacity
  // settings don't double-count the component's alpha); the component's surface stays
  // as the backdrop underneath.
  const fillPinned = opts.fill != null;
  let fill = opts.fill ?? readHostFill(target) ?? DEFAULT_FILL[theme];

  // creation-time overrides (preset's beneath explicit), re-applied on theme switch
  const basePatch = combinePatches(preset?.settings, opts.settings);
  let settings: GlassSettings = mergeSettings(DEFAULT_SETTINGS[theme], basePatch);

  // The component keeps its own CSS border. The glass only adds a lit rim when one is
  // explicitly requested via the `border` prop.
  const noRim: BorderConfig = { width: 0, opacity: 0, color: 'transparent' };
  let borderPatch: Partial<BorderConfig> = { ...opts.border };
  let border: BorderConfig = opts.border ? mergeBorder(DEFAULT_BORDER[theme], borderPatch) : noRim;

  const kind: Kind = opts.kind ?? inferKind(target, opts.radius);

  let renderer: SharedRenderer | null = null;
  let degraded = false;
  try {
    renderer = acquireRenderer();
  } catch {
    degraded = true; // no WebGL -> flat fill + border fallback
  }

  const comp: Compositor = createCompositor(target, kind, {
    radius: opts.radius,
    degraded,
    bloomClip: opts.bloomClip,
  });
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
      if (!fillPinned) fill = readHostFill(target) ?? DEFAULT_FILL[theme];
      border = opts.border ? mergeBorder(DEFAULT_BORDER[theme], borderPatch) : noRim;
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
    setBloomClip(clip) {
      comp.setBloomClip(clip);
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
