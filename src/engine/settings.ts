// Settings presets: the slider configuration per theme.
// These match the foundational material tokens from Paper.

import type { BorderConfig, GlassSettings, GlassSettingsPatch, Theme } from '../types';

export const DEFAULT_SETTINGS: Record<Theme, GlassSettings> = {
  dark: {
    bgBlur: 6,
    frost: 0.66,
    frostInset: 0,
    shaderInset: 0,
    coreInset: 8,
    coreBlur: 8,
    coreOpacity: 1,
    coreProportional: false,
    saturate: 1.3,
    innerBloom: { size: 2, level: 1.0 },
    outerBloom: { size: 16, level: 0.45 },
  },
  light: {
    bgBlur: 6,
    frost: 0.42,
    frostInset: 0,
    shaderInset: 0,
    coreInset: 8,
    coreBlur: 8,
    coreOpacity: 1,
    coreProportional: false,
    saturate: 1.55,
    innerBloom: { size: 2, level: 1.0 },
    outerBloom: { size: 18, level: 0.5 },
  },
};

/** Lit-rim border per theme — component styling (like DEFAULT_FILL), not part of presets. */
export const DEFAULT_BORDER: Record<Theme, BorderConfig> = {
  dark: { width: 1, opacity: 0.3, color: '#808080' }, // hsl(0 0% 50%)
  light: { width: 1, opacity: 0.3, color: '#6A6A72' },
};

export function mergeBorder(base: BorderConfig, patch?: Partial<BorderConfig>): BorderConfig {
  return patch ? { ...base, ...patch } : { ...base };
}

/** Surface color per theme — a CSS background the glass derives from, separate from settings. */
export const DEFAULT_FILL: Record<Theme, string> = {
  dark: '#0D0D12',
  light: '#EEF0F3',
};

/** Merge a partial patch onto a base, deep-merging the two bloom configs. */
export function mergeSettings(
  base: GlassSettings,
  patch?: GlassSettingsPatch,
): GlassSettings {
  if (!patch) {
    return {
      ...base,
      innerBloom: { ...base.innerBloom },
      outerBloom: { ...base.outerBloom },
    };
  }
  return {
    ...base,
    ...patch,
    innerBloom: { ...base.innerBloom, ...patch.innerBloom },
    outerBloom: { ...base.outerBloom, ...patch.outerBloom },
  };
}
