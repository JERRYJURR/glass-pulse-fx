// Library presets: shareable looks (shader + params + glass material). One preset = one
// look — it applies identically in dark and light mode; anything it doesn't pin adapts
// to the theme defaults. A preset never carries component styling (fill / border).
//
//   import { GlassFx } from 'glass-pulse-fx';
//   import { sonar } from 'glass-pulse-fx/presets';
//   <GlassFx preset={sonar}>…</GlassFx>
//
// Vanilla: createGlass(el, { preset: sonar })

import type { GlassPreset } from '../types';
import { auroraVeil } from './aurora-veil';
import { sonar } from './sonar';
import { beacon } from './beacon';
import { radar } from './radar';
import { neon } from './neon';
import { ember } from './ember';
import { solar } from './solar';
import { prism } from './prism';
import { bubblegum } from './bubblegum';
import { midnight } from './midnight';

export { auroraVeil, sonar, beacon, radar, neon, ember, solar, prism, bubblegum, midnight };
export type { GlassPreset };

/** Every library preset, in display order — for galleries and the preset lab. */
export const LIBRARY_PRESETS: GlassPreset[] = [
  auroraVeil,
  sonar,
  beacon,
  radar,
  neon,
  ember,
  solar,
  prism,
  bubblegum,
  midnight,
];
