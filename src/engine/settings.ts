// Settings presets: the slider configuration per theme.
// dark = the spec values; light = a placeholder to fill in from your own tuning
// (the demo's preset lab + JSON export exists to produce these).

import type { GlassSettings, Theme } from '../types';

export const DEFAULT_SETTINGS: Record<Theme, GlassSettings> = {
  dark: {
    bgBlur: 6,
    frost: 0.66,
    frostInset: 0,
    coreInset: 8,
    coreBlur: 8,
    coreOpacity: 1,
    coreProportional: false,
    saturate: 1.3,
    borderWidth: 1,
    borderOpacity: 0.3,
    borderColor: '#808080', // hsl(0 0% 50%)
    innerBloom: { size: 2, level: 1.0, offset: 0 },
    outerBloom: { size: 16, level: 0.45, offset: 0 },
  },
  light: {
    // Tuned for vibrant light-theme palettes: a lighter frost veil + extra
    // saturation so the colour reads through the glass on a light surface.
    bgBlur: 6,
    frost: 0.42,
    frostInset: 0,
    coreInset: 8,
    coreBlur: 8,
    coreOpacity: 1,
    coreProportional: false,
    saturate: 1.55,
    borderWidth: 1,
    borderOpacity: 0.3,
    borderColor: '#6a6a72',
    innerBloom: { size: 2, level: 1.0, offset: 0 },
    outerBloom: { size: 18, level: 0.5, offset: 0 },
  },
};

/** Surface color per theme — a CSS background the glass derives from, separate from settings. */
export const DEFAULT_FILL: Record<Theme, string> = {
  dark: '#0d0d12',
  light: '#eef0f3',
};

/** Merge a partial patch onto a base, deep-merging the two bloom configs. */
export function mergeSettings(
  base: GlassSettings,
  patch?: Partial<GlassSettings>,
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
