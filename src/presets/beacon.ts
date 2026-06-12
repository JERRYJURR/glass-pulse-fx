import type { GlassPreset } from '../types';

// A single orbiting glint sweeping the rim, like a lighthouse.
export const beacon: GlassPreset = {
  name: 'Beacon',
  version: 1,
  effectParams: { motion: 3, speed: 0.2, scale: 1, interval: 0.65, rampIn: 0.35, rampOut: 0.35 },
};
