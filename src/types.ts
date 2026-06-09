// Public types for glass-pulse-fx.
// `GlassSettings` is the framework-agnostic glass material config (shader-independent).
// `EffectParams` is the shader's own parameter set (panes / sonar, and any you add).

export type Theme = 'dark' | 'light';

export type FpsMode = 'default' | 15 | 30;

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

/** The glass material configuration. `fill` (surface color) is intentionally NOT here. */
export interface GlassSettings {
  bgBlur: number;
  frost: number;
  coreInset: number;
  coreBlur: number;
  /** opaque-core opacity, 0..1 (1 = fully hides the shader in the center) */
  coreOpacity: number;
  /** scale coreInset + coreBlur with the element size instead of using fixed px */
  coreProportional: boolean;
  saturate: number;
  borderWidth: number;
  borderOpacity: number;
  borderColor: string;
  innerBloom: BloomConfig;
  outerBloom: BloomConfig;
}

/**
 * Parameters for the base shaders. Adding a shader = adding any new fields here + an
 * EffectDef in src/engine/effects/.
 */
export interface EffectParams {
  /** up to 5 palette stops (hex). The first `paneCount` are used. */
  colors: string[];
  /** how many palette stops are in the colour gradient, 1..5 */
  paneCount: number;
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
  /** band speed at the start of the axis, 0.05..1 (velocity-graph left anchor) */
  velStart: number;
  /** band speed at the end of the axis, 0.05..1 (velocity-graph right anchor) */
  velEnd: number;
  /** start tangent handle (bezier control point 1): x 0..1, y 0.05..1 */
  c0x: number;
  c0y: number;
  /** end tangent handle (bezier control point 2): x 0..1, y 0.05..1 */
  c1x: number;
  c1y: number;
  /** band direction in degrees */
  angle: number;
  /** motion mode: 0 = linear, 1 = center (mirror about the axis; bands emanate from center) */
  motion: number;
  /** play direction: 0 = forward, 1 = reverse */
  reverse: number;
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
export interface VelGraphControl {
  kind: 'velgraph';
  label: string;
  /** EffectParams keys in order: [velStart, velEnd, c0x, c0y, c1x, c1y] */
  keys: string[];
}
export interface ToggleControl {
  kind: 'toggle';
  key: keyof EffectParams;
  label: string;
}
export type ControlSpec =
  | SliderControl
  | ColorsControl
  | SelectControl
  | VelGraphControl
  | ToggleControl;

export interface CreateGlassOptions {
  effect?: EffectId;
  effectParams?: Partial<EffectParams>;
  theme?: Theme;
  /** surface color; defaults per theme. Hex recommended. */
  fill?: string;
  /** border-radius override; number = px, '50%', '16px', etc. */
  radius?: number | string;
  kind?: Kind;
  /** animation frame rate. 'default' currently maps to the library default. */
  fps?: FpsMode;
  paused?: boolean;
  /** merged onto the active theme's defaults */
  settings?: Partial<GlassSettings>;
}

export interface GlassInstance {
  update(patch: Partial<GlassSettings>): void;
  setEffect(id: EffectId): void;
  setEffectParams(patch: Partial<EffectParams>): void;
  /** loads this theme's glass settings defaults (re-applies your creation overrides) */
  setTheme(t: Theme): void;
  setFill(color: string): void;
  setFps(fps: FpsMode): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}
