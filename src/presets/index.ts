// Library presets: shareable looks (shader + params + glass material). One preset = one
// look — it applies identically in dark and light mode; anything it doesn't pin adapts
// to the theme defaults. A preset never carries component styling (fill / border).
//
//   import { GlassFx } from 'glass-pulse-fx';
//   import { bloom } from 'glass-pulse-fx/presets';
//   <GlassFx preset={bloom}>…</GlassFx>
//
// Vanilla: createGlass(el, { preset: bloom })

import type { GlassPreset } from '../types';
import { bloom } from './bloom';
import { halo } from './halo';
import { rush } from './rush';
import { comet } from './comet';
import { cinder } from './cinder';
import { plasma } from './plasma';
import { kaleido } from './kaleido';
import { nimbus } from './nimbus';
import { emerald } from './emerald';
import { glow } from './glow';
import { tide } from './tide';

export {
  bloom,
  halo,
  rush,
  comet,
  cinder,
  plasma,
  kaleido,
  nimbus,
  emerald,
  glow,
  tide,
};
export type { GlassPreset };

/** Every library preset, in display order — for galleries and the preset lab. */
export const LIBRARY_PRESETS: GlassPreset[] = [
  bloom,
  halo,
  rush,
  comet,
  cinder,
  plasma,
  kaleido,
  nimbus,
  emerald,
  glow,
  tide,
];
