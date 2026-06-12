// Public types for glass-pulse-fx.
// `GlassSettings` is the framework-agnostic glass material config (shader-independent).
// `EffectParams` is the shader's own parameter set (panes, and any you add).

export type Theme = 'dark' | 'light';

export type FpsMode = 15 | 30 | 60;

/** Which base shader drives the lit material. Original shaders — no attribution needed. */
export type EffectId = 'panes';

/** Shape presets — drive the crop scale and default corner radius. */
export type Kind = 'pill' | 'circle' | 'rect' | 'tag' | 'card' | 'icon';

export interface BloomConfig {
  /** blur radius in px */
  size: number;
  /** opacity 0..1 */
  level: number;
}

/**
 * The glass material configuration — the preset-able "look of the light".
 * Component styling (`fill`, `border`, `radius`) is intentionally NOT here: those belong
 * to the component you wrap, not to a shareable preset.
 */
export interface GlassSettings {
  bgBlur: number;
  frost: number;
  /** frost veil inset from the edge in px — exposes a raw, un-veiled shader rim inside the silhouette */
  frostInset: number;
  coreInset: number;
  coreBlur: number;
  /** opaque-core opacity, 0..1 (1 = fully hides the shader in the center) */
  coreOpacity: number;
  /** scale coreInset + coreBlur with the element size instead of using fixed px */
  coreProportional: boolean;
  saturate: number;
  innerBloom: BloomConfig;
  outerBloom: BloomConfig;
}

/** The lit rim border — component styling, like `fill`; not part of GlassSettings/presets. */
export interface BorderConfig {
  width: number;
  /** 0..1 */
  opacity: number;
  color: string;
}

/**
 * Parameters for the base shaders. Adding a shader = adding any new fields here + an
 * EffectDef in src/engine/effects/.
 */
export interface EffectParams {
  /** 1–5 palette stops (hex) — the colour gradient cycles through all of them */
  colors: string[];
  /** colour gradient cycles along the motion axis (within/across a band) */
  colorSpread: number;
  /** colour gradient cycles across the perpendicular axis (the mesh dimension) */
  colorSkew: number;
  /** colour field drift over time */
  colorDrift: number;
  /** scroll speed; sign sets direction (left↔right linear, or out↔in for center motion) */
  speed: number;
  /** band density — how many bands span the element */
  scale: number;
  /** leading fade of each band, fraction of the band width */
  rampIn: number;
  /** trailing fade of each band, fraction of the band width */
  rampOut: number;
  /** transparent interval between bands (glass shows through), fraction of each pane+gap cycle */
  interval: number;
  /** overall brightness multiplier */
  bright: number;
  /** velocity preset index — how band speed varies across the axis (see VELOCITY_PRESETS) */
  velocity: number;
  /** band direction in degrees */
  angle: number;
  /** motion mode: 0 = linear sweep, 1 = center (mirrored), 2 = radial (rings), 3 = orbit (spokes) */
  motion: number;
}

/** A single tunable in the demo's effect panel. */
export interface SliderControl {
  kind: 'slider';
  key: keyof EffectParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}
export interface ColorsControl {
  kind: 'colors';
  label: string;
}
export interface SelectControl {
  kind: 'select';
  key: keyof EffectParams;
  label: string;
  options: { label: string; value: number }[];
}
export type ControlSpec =
  | SliderControl
  | ColorsControl
  | SelectControl;

export interface CreateGlassOptions {
  /** a shareable look, applied beneath the explicit options below (they win on conflict) */
  preset?: GlassPreset;
  effect?: EffectId;
  effectParams?: Partial<EffectParams>;
  theme?: Theme;
  /** surface color; defaults per theme. Hex recommended. */
  fill?: string;
  /** lit rim border overrides; defaults per theme */
  border?: Partial<BorderConfig>;
  /** border-radius override; number = px, '50%', '16px', etc. */
  radius?: number | string;
  kind?: Kind;
  /** animation paint rate. default 30. */
  fps?: FpsMode;
  paused?: boolean;
  /** merged onto the active theme's defaults */
  settings?: Partial<GlassSettings>;
}

/**
 * A shareable look: shader + params + glass material. One preset = one look — it applies
 * identically in dark and light mode, while anything it does NOT pin still adapts to the
 * theme defaults. Sites with a theme switch that want different looks per mode simply
 * pass a different preset per mode.
 * Deliberately excludes component styling (fill / border / radius / kind).
 * Usage (vanilla): `createGlass(el, { preset })`
 * Usage (React):   `<GlassFx preset={preset} />`
 */
export interface GlassPreset {
  name: string;
  /** preset schema version */
  version: 1;
  effect?: EffectId;
  effectParams?: Partial<EffectParams>;
  settings?: Partial<GlassSettings>;
}

export interface GlassInstance {
  update(patch: Partial<GlassSettings>): void;
  setEffect(id: EffectId): void;
  setEffectParams(patch: Partial<EffectParams>): void;
  /** loads this theme's glass-settings, border, and effect-param defaults (your explicit overrides are re-applied on top) */
  setTheme(t: Theme): void;
  setFill(color: string): void;
  setBorder(patch: Partial<BorderConfig>): void;
  setFps(fps: FpsMode): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}
