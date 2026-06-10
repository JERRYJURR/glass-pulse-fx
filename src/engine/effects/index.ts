// Effect registry. Add a shader by writing its EffectDef and listing it here.

import type { EffectId, EffectParams, Theme, ControlSpec } from '../../types';
import type { UniformMap } from './common';
import { panes } from './panes';

export { VELOCITY_PRESETS } from './panes';

/**
 * How the compositor crops the shared field for an instance:
 * 'banded' (default) — the wide CROP_W:CROP_H window, tuned for sweeping bands;
 * 'isotropic' — an aspect-true window, so circles and angles render screen-true.
 */
export type EffectSampling = 'banded' | 'isotropic';

export interface EffectDef {
  id: EffectId;
  label: string;
  /** fragment shader source (COMMON_GLSL + the effect's main) */
  frag: string;
  /** every uniform name the program declares */
  uniforms: string[];
  /** default params per theme */
  defaults: Record<Theme, EffectParams>;
  /** push params into the program's uniforms (resolution + time are set by the renderer) */
  upload(gl: WebGLRenderingContext, U: UniformMap, p: EffectParams): void;
  /** crop hint for the given params (absent = 'banded') */
  sampling?(p: EffectParams): EffectSampling;
  /** demo control metadata */
  controls: ControlSpec[];
}

export const EFFECTS: Record<EffectId, EffectDef> = { panes };

export const EFFECT_IDS = Object.keys(EFFECTS) as EffectId[];

/** Merge a partial patch onto base params, replacing the colors array wholesale. */
export function mergeEffectParams(
  base: EffectParams,
  patch?: Partial<EffectParams>,
): EffectParams {
  if (!patch) return { ...base, colors: [...base.colors] };
  return {
    ...base,
    ...patch,
    colors: patch.colors ? [...patch.colors] : [...base.colors],
  };
}
