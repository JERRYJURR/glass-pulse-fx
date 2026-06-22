import {
  DEFAULT_BORDER,
  DEFAULT_FILL,
  DEFAULT_SETTINGS,
  EFFECTS,
  mergeEffectParams,
  mergeSettings,
} from '../src/core';
import type {
  BorderConfig,
  EffectId,
  EffectParams,
  FpsMode,
  GlassPreset,
  GlassSettings,
  GlassSettingsPatch,
  Theme,
} from '../src/core';
import { LIBRARY_PRESETS } from '../src/presets';

export interface PaletteRow {
  color: string;
  on: boolean;
}

export interface WorkingLook {
  baseTheme: Theme;
  settings: GlassSettings;
  effect: EffectId;
  effectParams: EffectParams;
  palette: PaletteRow[];
}

export interface ComponentStyling {
  fill: string;
  border: BorderConfig;
}

export interface StoredPreset {
  id: string;
  data: GlassPreset;
  palette?: PaletteRow[];
}

export interface DemoPreset extends StoredPreset {
  readonly?: boolean;
}

export interface DemoState {
  version: 4;
  presets: StoredPreset[];
  activeId: string;
  theme: Theme;
  fps: FpsMode;
  bloomClip: boolean;
  styling: Record<Theme, ComponentStyling>;
  working: WorkingLook;
}

export const KEY = 'glass-pulse-fx:demo:v2';
export const DEFAULT_PRESET_ID = 'lib-bloom';

const LEGACY_PRESET_IDS: Record<string, string> = {
  'builtin-default': DEFAULT_PRESET_ID,
  'lib-chroma-bloom': DEFAULT_PRESET_ID,
  'lib-retrograde-halo': 'lib-halo',
  'lib-sorbet-rush': 'lib-rush',
  'lib-halo-sweep': 'lib-comet',
  'lib-cinderfall': 'lib-cinder',
  'lib-plasma-rift': 'lib-plasma',
  'lib-kaleidoscope': 'lib-kaleido',
  'lib-monochrome-orbit': 'lib-nimbus',
  'lib-verdant-pulse': 'lib-emerald',
  'lib-dark1': 'lib-glow',
  'lib-citrus-tide': 'lib-tide',
  'lib-abyssal-orbit': 'lib-tide',
};

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

let idSeq = 0;
export const newId = () => `p-${Date.now().toString(36)}-${idSeq++}`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const asRecord = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
const recordAt = (v: unknown, key: string): Record<string, unknown> => asRecord(asRecord(v)[key]);
const stringAt = (v: unknown, key: string): string | undefined => {
  const value = asRecord(v)[key];
  return typeof value === 'string' ? value : undefined;
};
const numberAt = (v: unknown, key: string, fallback: number): number => {
  const value = asRecord(v)[key];
  return typeof value === 'number' ? value : fallback;
};

export const normalizeFps = (v: unknown): FpsMode => (v === 15 || v === 30 || v === 60 ? v : 30);

function pickSettings(s: GlassSettings): GlassSettings {
  return {
    bgBlur: s.bgBlur,
    frost: s.frost,
    frostInset: s.frostInset,
    shaderInset: s.shaderInset,
    coreInset: s.coreInset,
    coreBlur: s.coreBlur,
    coreOpacity: s.coreOpacity,
    coreProportional: s.coreProportional,
    saturate: s.saturate,
    innerBloom: { size: s.innerBloom.size, level: s.innerBloom.level },
    outerBloom: { size: s.outerBloom.size, level: s.outerBloom.level },
  };
}

function pickParams(p: EffectParams, def: EffectParams): EffectParams {
  const out: Partial<Record<keyof EffectParams, unknown>> = {};
  for (const k of Object.keys(def) as (keyof EffectParams)[]) out[k] = p[k];
  return out as EffectParams;
}

export function normalizePalette(rows: unknown, colors: string[]): PaletteRow[] {
  const sourceRows = Array.isArray(rows) && rows.length
    ? rows
    : colors.map((color) => ({ color, on: true }));
  const palette = sourceRows
    .slice(0, 5)
    .map((row) => {
      const r = asRecord(row);
      return {
        color: typeof r.color === 'string' ? r.color : '#ffffff',
        on: r.on !== false,
      };
    });
  if (!palette.length) palette.push({ color: '#ffffff', on: true });
  if (!palette.some((row) => row.on)) palette[0].on = true;
  return palette;
}

export function lookFromPreset(p: GlassPreset | undefined, theme: Theme, palette?: PaletteRow[]): WorkingLook {
  const effect: EffectId = p?.effect ?? 'panes';
  const def = EFFECTS[effect].defaults[theme];
  const effectParams = pickParams(mergeEffectParams(def, p?.effectParams), def);
  const rows = normalizePalette(palette, effectParams.colors);
  effectParams.colors = rows.filter((row) => row.on).map((row) => row.color);
  return {
    baseTheme: theme,
    settings: pickSettings(mergeSettings(DEFAULT_SETTINGS[theme], p?.settings)),
    effect,
    effectParams,
    palette: rows,
  };
}

function diffParams(look: WorkingLook): Partial<EffectParams> | undefined {
  const def = EFFECTS[look.effect].defaults[look.baseTheme];
  const out: Partial<Record<keyof EffectParams, unknown>> = {};
  for (const k of Object.keys(def) as (keyof EffectParams)[]) {
    if (k === 'colors') {
      if (JSON.stringify(look.effectParams.colors) !== JSON.stringify(def.colors)) out.colors = [...look.effectParams.colors];
    } else if (look.effectParams[k] !== def[k]) {
      out[k] = look.effectParams[k];
    }
  }
  return Object.keys(out).length ? (out as Partial<EffectParams>) : undefined;
}

function diffSettings(look: WorkingLook): GlassSettingsPatch | undefined {
  const current = look.settings;
  const def = DEFAULT_SETTINGS[look.baseTheme];
  const out: GlassSettingsPatch = {};
  const scalarKeys = [
    'bgBlur',
    'frost',
    'frostInset',
    'shaderInset',
    'coreInset',
    'coreBlur',
    'coreOpacity',
    'coreProportional',
    'saturate',
  ] as const;
  const scalarOut = out as Partial<Record<(typeof scalarKeys)[number], unknown>>;
  for (const key of scalarKeys) {
    if (current[key] !== def[key]) scalarOut[key] = current[key];
  }
  for (const bloom of ['innerBloom', 'outerBloom'] as const) {
    const patch: Partial<GlassSettings['innerBloom']> = {};
    if (current[bloom].size !== def[bloom].size) patch.size = current[bloom].size;
    if (current[bloom].level !== def[bloom].level) patch.level = current[bloom].level;
    if (Object.keys(patch).length) {
      (out as Record<typeof bloom, Partial<GlassSettings['innerBloom']> | undefined>)[bloom] = patch;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function presetFromLook(look: WorkingLook, name: string): GlassPreset {
  const out: GlassPreset = { name, version: 1 };
  if (look.effect !== 'panes') out.effect = look.effect;
  const effectParams = diffParams(look);
  if (effectParams) out.effectParams = effectParams;
  const settings = diffSettings(look);
  if (settings) out.settings = settings;
  return out;
}

export const libPresets: DemoPreset[] = LIBRARY_PRESETS.map((preset) => ({
  id: 'lib-' + preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  data: preset,
  readonly: true,
}));

export const defaultPreset = libPresets.find((preset) => preset.id === DEFAULT_PRESET_ID) ?? libPresets[0];

export function normalizeActiveId(id: unknown, presets: StoredPreset[]): string {
  const raw = typeof id === 'string' ? id : DEFAULT_PRESET_ID;
  const migrated = LEGACY_PRESET_IDS[raw] ?? raw;
  return libPresets.some((preset) => preset.id === migrated) || presets.some((preset) => preset.id === migrated)
    ? migrated
    : DEFAULT_PRESET_ID;
}

export function freshStyling(): Record<Theme, ComponentStyling> {
  return {
    dark: { fill: DEFAULT_FILL.dark, border: { ...DEFAULT_BORDER.dark } },
    light: { fill: DEFAULT_FILL.light, border: { ...DEFAULT_BORDER.light } },
  };
}

export function freshState(): DemoState {
  return {
    version: 4,
    presets: [],
    activeId: DEFAULT_PRESET_ID,
    theme: 'dark',
    fps: 30,
    bloomClip: false,
    styling: freshStyling(),
    working: lookFromPreset(defaultPreset.data, 'dark'),
  };
}

function presetDataFrom(input: unknown, fallbackName: string): { data: GlassPreset; palette?: PaletteRow[] } {
  const root = asRecord(input);
  const darkTheme = recordAt(recordAt(root, 'themes'), 'dark');
  const src = Object.keys(darkTheme).length ? darkTheme : root;
  const name = typeof root.name === 'string' && root.name.trim() ? root.name : fallbackName;
  const raw: GlassPreset = {
    name,
    version: 1,
    ...(src.effect === 'panes' ? { effect: 'panes' as const } : {}),
    ...(isRecord(src.effectParams) ? { effectParams: src.effectParams as Partial<EffectParams> } : {}),
    ...(isRecord(src.settings) ? { settings: src.settings as GlassSettingsPatch } : {}),
  };
  const look = lookFromPreset(raw, 'dark', src.palette as PaletteRow[] | undefined);
  return { data: presetFromLook(look, raw.name), palette: look.palette };
}

function normalizeStyling(input: unknown): Record<Theme, ComponentStyling> {
  const fromTheme = (theme: Theme): ComponentStyling => {
    const styling = recordAt(recordAt(input, 'styling'), theme);
    const legacy = recordAt(recordAt(input, 'working'), theme);
    const legacySettings = recordAt(legacy, 'settings');
    const defaultBorder = DEFAULT_BORDER[theme];
    return {
      fill: stringAt(styling, 'fill') ?? stringAt(legacy, 'fill') ?? DEFAULT_FILL[theme],
      border: {
        width: numberAt(recordAt(styling, 'border'), 'width', numberAt(legacySettings, 'borderWidth', defaultBorder.width)),
        opacity: numberAt(recordAt(styling, 'border'), 'opacity', numberAt(legacySettings, 'borderOpacity', defaultBorder.opacity)),
        color: stringAt(recordAt(styling, 'border'), 'color') ?? stringAt(legacySettings, 'borderColor') ?? defaultBorder.color,
      },
    };
  };
  return { dark: fromTheme('dark'), light: fromTheme('light') };
}

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const source = JSON.parse(raw) as unknown;
    const root = asRecord(source);
    if (root.version === 4 && isRecord(recordAt(root, 'working').effectParams) && isRecord(recordAt(root, 'working').settings)) {
      const theme: Theme = root.theme === 'light' ? 'light' : 'dark';
      const workingRoot = recordAt(root, 'working');
      const baseTheme: Theme = workingRoot.baseTheme === 'light' ? 'light' : 'dark';
      const workingPreset = presetDataFrom(
        {
          name: 'w',
          effect: workingRoot.effect,
          effectParams: workingRoot.effectParams,
          settings: workingRoot.settings,
          palette: workingRoot.palette,
        },
        'w',
      );
      const presets: StoredPreset[] = [];
      const activeId = normalizeActiveId(root.activeId, presets);
      return {
        version: 4,
        presets,
        activeId,
        theme,
        fps: normalizeFps(root.fps),
        bloomClip: typeof root.bloomClip === 'boolean' ? root.bloomClip : false,
        styling: normalizeStyling(root),
        working: root.activeId === 'builtin-default'
          ? lookFromPreset(defaultPreset.data, baseTheme)
          : lookFromPreset(workingPreset.data, baseTheme, workingPreset.palette),
      };
    }
    if ((root.version === 2 || root.version === 3) && isRecord(recordAt(recordAt(root, 'working'), 'dark').effectParams)) {
      const theme: Theme = root.theme === 'light' ? 'light' : 'dark';
      const workingPreset = presetDataFrom({ name: 'w', ...recordAt(recordAt(root, 'working'), theme) }, 'w');
      const presets: StoredPreset[] = [];
      const activeId = normalizeActiveId(root.activeId, presets);
      return {
        version: 4,
        presets,
        activeId,
        theme,
        fps: normalizeFps(root.fps),
        bloomClip: typeof root.bloomClip === 'boolean' ? root.bloomClip : false,
        styling: normalizeStyling(root),
        working: lookFromPreset(workingPreset.data, theme, workingPreset.palette),
      };
    }
  } catch {
    return freshState();
  }
  return freshState();
}

export function saveState(state: DemoState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore persistence failures */
  }
}

export const allPresets = (state: DemoState): DemoPreset[] => [
  ...libPresets,
  ...state.presets,
];

export const activePreset = (state: DemoState): DemoPreset =>
  allPresets(state).find((preset) => preset.id === state.activeId) ?? defaultPreset;

export function isDirty(state: DemoState): boolean {
  const active = activePreset(state);
  const saved = lookFromPreset(active.data, state.working.baseTheme, active.palette);
  const current = JSON.stringify(presetFromLook(state.working, active.data.name));
  const baseline = JSON.stringify(presetFromLook(saved, active.data.name));
  return current !== baseline || JSON.stringify(state.working.palette) !== JSON.stringify(saved.palette);
}
