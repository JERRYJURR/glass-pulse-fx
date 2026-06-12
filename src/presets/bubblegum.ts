import type { GlassPreset } from '../types';

// Fast playful pastels with a bouncy fast-middle velocity — high energy.
export const bubblegum: GlassPreset = {
  name: 'Bubblegum',
  version: 1,
  effectParams: {
    colors: ['#ff7ad9', '#7afcff', '#c9a7ff', '#aaffa3'],
    speed: 0.4, scale: 2.4, interval: 0.3,
    rampIn: 0.3, rampOut: 0.4, velocity: 5, bright: 1.1,
  },
};
