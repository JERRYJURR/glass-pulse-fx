import type { GlassPreset } from '../types';

// Hot pink / cyan duo, fast crisp bands, raw rim — loud, electric.
export const neon: GlassPreset = {
  name: 'Neon',
  version: 1,
  effectParams: {
    colors: ['#ff2d9b', '#19c3ff'],
    speed: 0.45, scale: 2.2, interval: 0.55,
    rampIn: 0.08, rampOut: 0.2, colorSpread: 1, velocity: 2,
  },
  settings: {
    frostInset: 1.5, saturate: 1.5,
    innerBloom: { size: 4, level: 1 }, outerBloom: { size: 26, level: 0.6 },
  },
};
