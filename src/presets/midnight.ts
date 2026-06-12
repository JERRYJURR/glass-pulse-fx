import type { GlassPreset } from '../types';

// Understated deep blues behind a heavy veil — the quiet, professional one.
export const midnight: GlassPreset = {
  name: 'Midnight',
  version: 1,
  effectParams: {
    colors: ['#1d4ed8', '#0ea5e9', '#312e81'],
    speed: 0.1, interval: 0.5, rampIn: 0.6, rampOut: 0.8,
    colorSpread: 1.5, bright: 0.85,
  },
  settings: {
    frost: 0.75,
    innerBloom: { size: 2, level: 0.8 }, outerBloom: { size: 12, level: 0.3 },
  },
};
