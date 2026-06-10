// Library presets: shareable looks (shader + params + glass material, per theme).
// A preset never carries component styling (fill / border / radius) — that stays yours.
//
//   import { GlassFx } from 'glass-pulse-fx';
//   import { sonar } from 'glass-pulse-fx/presets';
//   <GlassFx preset={sonar}><button>…</button></GlassFx>
//
// Vanilla: createGlass(el, { theme: 'dark', ...sonar.themes.dark })

import type { GlassPreset } from '../types';
import { sonar } from './sonar';
import { beacon } from './beacon';

export { sonar, beacon };
export type { GlassPreset };

/** Every library preset, in display order — for galleries and the preset lab. */
export const LIBRARY_PRESETS: GlassPreset[] = [sonar, beacon];
