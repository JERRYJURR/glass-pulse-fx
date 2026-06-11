import type { GlassPreset } from '../types';

// Iridescent full-spectrum shimmer — the colour field does the work, bands barely move.
export const prism: GlassPreset = {
  name: 'Prism',
  version: 1,
  themes: {
    dark: {
      effectParams: {
        speed: 0.1, scale: 1, interval: 0.08,
        rampIn: 0.9, rampOut: 0.9,
        colorSpread: 3, colorSkew: 2.5, colorDrift: 0.08, velocity: 0,
      },
      settings: { frost: 0.55 },
    },
    light: {
      effectParams: {
        speed: 0.1, scale: 1, interval: 0.08,
        rampIn: 0.9, rampOut: 0.9,
        colorSpread: 3, colorSkew: 2.5, colorDrift: 0.08, velocity: 0,
      },
      settings: { frost: 0.38 },
    },
  },
};
