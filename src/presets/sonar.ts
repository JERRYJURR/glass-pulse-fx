import type { GlassPreset } from '../types';

// Radial pings: rings ripple outward from the center — the namesake pulse.
export const sonar: GlassPreset = {
  name: 'Sonar',
  version: 1,
  themes: {
    dark: {
      effectParams: { motion: 2, speed: 0.35, scale: 2, interval: 0.55, rampIn: 0.2, rampOut: 0.6 },
    },
    light: {
      effectParams: { motion: 2, speed: 0.35, scale: 2, interval: 0.55, rampIn: 0.2, rampOut: 0.6 },
    },
  },
};
