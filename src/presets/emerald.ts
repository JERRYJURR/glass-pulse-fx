import type { GlassPreset } from '../types';

// Layered emerald light breathing from the center beneath a deep frosted core.
export const emerald: GlassPreset = {
  name: 'Emerald',
  version: 1,
  effectParams: {
    colors: ['#1f7a2e', '#36ce4f', '#85ff99'],
    speed: 0.5,
    scale: 0.75,
    colorSpread: 3.5,
    colorSkew: 3,
    colorDrift: -0.23,
    velocity: 0,
    rampIn: 0.47,
    rampOut: 0.47,
    interval: 0,
    motion: 1,
  },
  settings: {
    bgBlur: 12,
    frost: 0.84,
    frostInset: 2.5,
    shaderInset: 1,
    coreInset: 24,
    coreBlur: 16,
    innerBloom: { size: 4, level: 0 },
    outerBloom: { level: 0.5 },
  },
};
