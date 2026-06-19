// glass-pulse-fx preset lab.
// A "preset" is one shareable look: shader + params + glass material. It applies
// identically in dark and light mode — anything it doesn't pin adapts to the theme
// defaults, which the lab's theme toggle demonstrates live. Component styling
// (fill / border) is NOT part of presets; the lab keeps it as separate session state.
// Library presets come from src/presets/ (read-only here); your presets live in
// localStorage and export as ready-to-commit code. Imports from ../src = live test.

import {
  createGlass,
  DEFAULT_SETTINGS,
  DEFAULT_FILL,
  DEFAULT_BORDER,
  EFFECTS,
  mergeSettings,
  mergeEffectParams,
} from '../src/core';
import type {
  BorderConfig,
  EffectId,
  EffectParams,
  FpsMode,
  GlassInstance,
  GlassPreset,
  GlassSettings,
  GlassSettingsPatch,
  Kind,
  Theme,
} from '../src/core';
import { LIBRARY_PRESETS } from '../src/presets';

// ── model ────────────────────────────────────────────────────────────────────

interface PaletteRow {
  color: string;
  /** muted rows keep their colour but are excluded from the gradient */
  on: boolean;
}
// the fully-expanded look the controls edit
interface WorkingLook {
  /** which theme's defaults this look was expanded against (the diff baseline) */
  baseTheme: Theme;
  settings: GlassSettings;
  effect: EffectId;
  effectParams: EffectParams;
  /** all palette rows incl. muted ones; effectParams.colors holds just the enabled colours */
  palette: PaletteRow[];
}
interface ComponentStyling {
  fill: string;
  border: BorderConfig;
}
// presets are stored as minimal diffs (the GlassPreset itself); palette keeps muted rows
interface StoredPreset {
  id: string;
  data: GlassPreset;
  palette?: PaletteRow[];
}
interface DemoPreset extends StoredPreset {
  /** factory default + library presets: selectable, not saveable */
  readonly?: boolean;
}
interface DemoState {
  version: 4;
  presets: StoredPreset[];
  activeId: string;
  theme: Theme;
  fps: FpsMode;
  /** the mockups' own styling — not part of presets */
  styling: Record<Theme, ComponentStyling>;
  working: WorkingLook;
}

const KEY = 'glass-pulse-fx:demo:v2';
const DEFAULT_PRESET_ID = 'lib-bloom';
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
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
let idSeq = 0;
const newId = () => `p-${Date.now().toString(36)}-${idSeq++}`;
const normalizeFps = (v: unknown): FpsMode => (v === 15 || v === 30 || v === 60 ? v : 30);

// rebuild settings with known keys only, dropping junk left behind by older schemas
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
// rebuild params with the effect's known keys only, dropping junk from older schemas
function pickParams(p: EffectParams, def: EffectParams): EffectParams {
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(def)) out[k] = (p as unknown as Record<string, unknown>)[k];
  return out as unknown as EffectParams;
}
function normalizePalette(rows: unknown, colors: string[]): PaletteRow[] {
  const src = Array.isArray(rows) && rows.length
    ? (rows as PaletteRow[])
    : colors.map((c) => ({ color: c, on: true }));
  const palette = src
    .slice(0, 5)
    .map((r) => ({ color: typeof r.color === 'string' ? r.color : '#ffffff', on: r.on !== false }));
  if (!palette.some((r) => r.on)) palette[0].on = true;
  return palette;
}

// expand a preset's diffs onto a theme's defaults — the inverse of presetFromLook
function lookFromPreset(p: GlassPreset | undefined, t: Theme, palette?: PaletteRow[]): WorkingLook {
  const effect: EffectId = p?.effect ?? 'panes';
  const def = EFFECTS[effect].defaults[t];
  const effectParams = pickParams(mergeEffectParams(def, p?.effectParams), def);
  const rows = normalizePalette(palette, effectParams.colors);
  effectParams.colors = rows.filter((r) => r.on).map((r) => r.color);
  return {
    baseTheme: t,
    settings: pickSettings(mergeSettings(DEFAULT_SETTINGS[t], p?.settings)),
    effect,
    effectParams,
    palette: rows,
  };
}

// diff the working look against its baseline defaults -> minimal GlassPreset
function diffParams(look: WorkingLook): Partial<EffectParams> | undefined {
  const def = EFFECTS[look.effect].defaults[look.baseTheme];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const out: any = {};
  for (const k of Object.keys(def) as (keyof EffectParams)[]) {
    if (k === 'colors') {
      if (JSON.stringify(look.effectParams.colors) !== JSON.stringify(def.colors)) out.colors = [...look.effectParams.colors];
    } else if (look.effectParams[k] !== def[k]) {
      out[k] = look.effectParams[k];
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return Object.keys(out).length ? (out as Partial<EffectParams>) : undefined;
}
function diffSettings(look: WorkingLook): GlassSettingsPatch | undefined {
  const s = look.settings;
  const def = DEFAULT_SETTINGS[look.baseTheme];
  const out: GlassSettingsPatch = {};
  for (const k of ['bgBlur', 'frost', 'frostInset', 'shaderInset', 'coreInset', 'coreBlur', 'coreOpacity', 'coreProportional', 'saturate'] as const) {
    if (s[k] !== def[k]) (out as Record<string, unknown>)[k] = s[k];
  }
  for (const b of ['innerBloom', 'outerBloom'] as const) {
    const d: Partial<GlassSettings['innerBloom']> = {};
    if (s[b].size !== def[b].size) d.size = s[b].size;
    if (s[b].level !== def[b].level) d.level = s[b].level;
    if (Object.keys(d).length) (out as Record<string, unknown>)[b] = d;
  }
  return Object.keys(out).length ? out : undefined;
}
function presetFromLook(look: WorkingLook, name: string): GlassPreset {
  const out: GlassPreset = { name, version: 1 };
  if (look.effect !== 'panes') out.effect = look.effect;
  const ep = diffParams(look);
  if (ep) out.effectParams = ep;
  const st = diffSettings(look);
  if (st) out.settings = st;
  return out;
}

const libPresets: DemoPreset[] = LIBRARY_PRESETS.map((p) => ({
  id: 'lib-' + p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  data: p,
  readonly: true,
}));
const defaultPreset = libPresets.find((p) => p.id === DEFAULT_PRESET_ID) ?? libPresets[0];

function normalizeActiveId(id: unknown, presets: StoredPreset[]): string {
  const raw = typeof id === 'string' ? id : DEFAULT_PRESET_ID;
  const migrated = LEGACY_PRESET_IDS[raw] ?? raw;
  return libPresets.some((p) => p.id === migrated) || presets.some((p) => p.id === migrated)
    ? migrated
    : DEFAULT_PRESET_ID;
}

function freshStyling(): Record<Theme, ComponentStyling> {
  return {
    dark: { fill: DEFAULT_FILL.dark, border: { ...DEFAULT_BORDER.dark } },
    light: { fill: DEFAULT_FILL.light, border: { ...DEFAULT_BORDER.light } },
  };
}
function freshState(): DemoState {
  return {
    version: 4,
    presets: [],
    activeId: DEFAULT_PRESET_ID,
    theme: 'dark',
    fps: 30,
    styling: freshStyling(),
    working: lookFromPreset(defaultPreset.data, 'dark'),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// accept a flattened GlassPreset, or the legacy two-theme shape (take the dark slice),
// or a fully-expanded legacy theme config — everything funnels through expansion+diff
function presetDataFrom(d: any, fallbackName: string): { data: GlassPreset; palette?: PaletteRow[] } {
  const src = d?.themes?.dark ?? d ?? {};
  const raw: GlassPreset = {
    name: typeof d?.name === 'string' && d.name.trim() ? d.name : fallbackName,
    version: 1,
    ...(src.effect === 'panes' ? { effect: 'panes' as const } : {}),
    ...(src.effectParams && typeof src.effectParams === 'object' ? { effectParams: src.effectParams } : {}),
    ...(src.settings && typeof src.settings === 'object' ? { settings: src.settings } : {}),
  };
  // expand against dark and re-diff so stored data is clean and canonical
  const look = lookFromPreset(raw, 'dark', src.palette);
  return { data: presetFromLook(look, raw.name), palette: look.palette };
}

// v2/v3 kept fill on theme configs and border inside settings — lift them out
function normalizeStyling(s: any): Record<Theme, ComponentStyling> {
  const forTheme = (t: Theme): ComponentStyling => {
    const st = s?.styling?.[t];
    const legacy = s?.working?.[t];
    return {
      fill:
        typeof st?.fill === 'string' ? st.fill
        : typeof legacy?.fill === 'string' ? legacy.fill
        : DEFAULT_FILL[t],
      border: {
        width:
          typeof st?.border?.width === 'number' ? st.border.width
          : typeof legacy?.settings?.borderWidth === 'number' ? legacy.settings.borderWidth
          : DEFAULT_BORDER[t].width,
        opacity:
          typeof st?.border?.opacity === 'number' ? st.border.opacity
          : typeof legacy?.settings?.borderOpacity === 'number' ? legacy.settings.borderOpacity
          : DEFAULT_BORDER[t].opacity,
        color:
          typeof st?.border?.color === 'string' ? st.border.color
          : typeof legacy?.settings?.borderColor === 'string' ? legacy.settings.borderColor
          : DEFAULT_BORDER[t].color,
      },
    };
  };
  return { dark: forTheme('dark'), light: forTheme('light') };
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as any;
      if (s?.version === 4 && s.working?.effectParams && s.working?.settings) {
        const theme: Theme = s.theme === 'light' ? 'light' : 'dark';
        const baseTheme: Theme = s.working.baseTheme === 'light' ? 'light' : 'dark';
        const wp = presetDataFrom(
          { name: 'w', effect: s.working.effect, effectParams: s.working.effectParams, settings: s.working.settings, palette: s.working.palette },
          'w',
        );
        const presets = ((s.presets ?? []) as any[]).map((p) => ({
          id: typeof p.id === 'string' ? p.id : newId(),
          ...presetDataFrom(p.data ?? p, 'Untitled'),
        }));
        const activeId = normalizeActiveId(s.activeId, presets);
        const working = s.activeId === 'builtin-default'
          ? lookFromPreset(defaultPreset.data, baseTheme)
          : lookFromPreset(wp.data, baseTheme, wp.palette);
        return {
          version: 4,
          presets,
          activeId,
          theme,
          fps: normalizeFps(s.fps),
          styling: normalizeStyling(s),
          working,
        };
      }
      if ((s?.version === 2 || s?.version === 3) && s.working?.dark?.effectParams) {
        const theme: Theme = s.theme === 'light' ? 'light' : 'dark';
        const w = presetDataFrom({ name: 'w', ...s.working[theme] }, 'w');
        const presets = ((s.presets ?? []) as any[]).map((p) => ({
          id: typeof p.id === 'string' ? p.id : newId(),
          ...presetDataFrom({ name: p.name, themes: p.themes }, 'Untitled'),
        }));
        const activeId = normalizeActiveId(s.activeId, presets);
        return {
          version: 4,
          presets,
          activeId,
          theme,
          fps: normalizeFps(s.fps),
          styling: normalizeStyling(s),
          working: lookFromPreset(w.data, theme, w.palette),
        };
      }
    }
  } catch {
    /* ignore */
  }
  return freshState();
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const state = loadState();

let saveTimer = 0;
function save(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, 150);
}

const allPresets = (): DemoPreset[] => [
  ...libPresets,
  ...state.presets,
];
const activePreset = (): DemoPreset =>
  allPresets().find((p) => p.id === state.activeId) ?? defaultPreset;
const working = (): WorkingLook => state.working;
const styling = (): ComponentStyling => state.styling[state.theme];

function isDirty(): boolean {
  const a = activePreset();
  const saved = lookFromPreset(a.data, state.working.baseTheme, a.palette);
  const current = JSON.stringify(presetFromLook(state.working, a.data.name));
  const baseline = JSON.stringify(presetFromLook(saved, a.data.name));
  if (current !== baseline) return true;
  return JSON.stringify(state.working.palette) !== JSON.stringify(saved.palette);
}

// ── dom helpers ──────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const div = (cls: string) => {
  const e = document.createElement('div');
  e.className = cls;
  return e;
};
/* eslint-disable @typescript-eslint/no-explicit-any */
const getPath = (o: any, path: string): number => path.split('.').reduce((a, k) => a[k], o);
const setPath = (o: any, path: string, v: number): void => {
  const parts = path.split('.');
  let t = o;
  for (let i = 0; i < parts.length - 1; i++) t = t[parts[i]];
  t[parts[parts.length - 1]] = v;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Ctl {
  el: HTMLElement;
  sync: () => void;
}
interface SliderDef {
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (v: number) => void;
  fmt: (v: number) => string;
  onChange: () => void;
}
function sliderCtl(d: SliderDef): Ctl {
  const el = div('ctl');
  const top = div('top');
  const label = document.createElement('label');
  label.textContent = d.label;
  const val = document.createElement('span');
  val.className = 'val';
  top.append(label, val);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(d.min);
  input.max = String(d.max);
  input.step = String(d.step);
  input.addEventListener('input', () => {
    const v = +input.value;
    d.set(v);
    val.textContent = d.fmt(v);
    d.onChange();
  });
  el.append(top, input);
  const sync = () => {
    const v = d.get();
    input.value = String(v);
    val.textContent = d.fmt(v);
  };
  sync();
  return { el, sync };
}

function toggleCtl(label: string, get: () => boolean, set: (v: boolean) => void, onChange: () => void): Ctl {
  const el = div('ctl color');
  const lab = document.createElement('label');
  lab.textContent = label;
  const btn = document.createElement('button');
  btn.className = 'toggle';
  const sync = () => {
    const on = get();
    btn.classList.toggle('on', on);
    btn.textContent = on ? 'On' : 'Off';
  };
  btn.addEventListener('click', () => {
    set(!get());
    sync();
    onChange();
  });
  el.append(lab, btn);
  sync();
  return { el, sync };
}

const px0 = (v: number) => v.toFixed(0) + 'px';
const px1 = (v: number) => v.toFixed(1) + 'px';
const f2 = (v: number) => v.toFixed(2);
const fmtFor = (step: number, unit?: string) => (v: number) => {
  const s = step < 1 ? v.toFixed(2) : v.toFixed(0);
  return unit ? s + unit : s;
};

// ── instances ────────────────────────────────────────────────────────────────

const targets: { id: string; kind: Kind; radius?: number }[] = [
  { id: 'b1', kind: 'pill' },
  { id: 'b2', kind: 'circle' },
  { id: 'b3', kind: 'rect' },
  { id: 'b4', kind: 'tag' },
  { id: 'b6', kind: 'icon' },
  { id: 'b5', kind: 'card' },
];
const instances: GlassInstance[] = targets.map((t) => {
  const w = working();
  const st = styling();
  return createGlass($(t.id), {
    kind: t.kind,
    radius: t.radius,
    theme: state.theme,
    effect: w.effect,
    effectParams: w.effectParams,
    settings: w.settings,
    fill: st.fill,
    border: st.border,
    fps: state.fps,
  });
});

function pushGlass(): void {
  const w = working();
  for (const i of instances) i.update(w.settings);
}
function pushStyling(): void {
  const st = styling();
  for (const i of instances) {
    i.setFill(st.fill);
    i.setBorder(st.border);
  }
}
function pushEffectParams(): void {
  const w = working();
  for (const i of instances) i.setEffectParams(w.effectParams);
}
// derive effectParams.colors from the enabled palette rows, then push
function pushPalette(): void {
  const w = working();
  const on = w.palette.filter((r) => r.on);
  w.effectParams.colors = (on.length ? on : [w.palette[0]]).map((r) => r.color);
  onEffect();
}
function pushFps(): void {
  for (const i of instances) i.setFps(state.fps);
}
function applyAll(): void {
  document.body.classList.toggle('light', state.theme === 'light');
  const w = working();
  const st = styling();
  for (const i of instances) {
    i.setTheme(state.theme);
    i.setEffect(w.effect);
    i.setEffectParams(w.effectParams);
    i.update(w.settings);
    i.setFill(st.fill);
    i.setBorder(st.border);
    i.setFps(state.fps);
  }
}

// ── control panels ─────────────────────────────────────────────────────────────

const borderColor = $<HTMLInputElement>('borderColor');
const fillInput = $<HTMLInputElement>('fill');
const effectLabel = $('effectLabel');
const presetSelect = $<HTMLSelectElement>('presetSelect');
const dirtyDot = $('dirtyDot');

const staticSyncers: (() => void)[] = [];
let effectSyncers: (() => void)[] = [];

const onGlass = () => {
  pushGlass();
  refreshDirty();
  save();
};
const onEffect = () => {
  pushEffectParams();
  refreshDirty();
  save();
};
// styling is session state, not preset state — push + persist, no dirty flag
const onStyling = () => {
  pushStyling();
  save();
};

function glassSlider(host: HTMLElement, path: string, label: string, min: number, max: number, step: number, fmt: (v: number) => string) {
  const c = sliderCtl({
    label, min, max, step, fmt,
    get: () => getPath(working().settings, path),
    set: (v) => setPath(working().settings, path, v),
    onChange: onGlass,
  });
  host.appendChild(c.el);
  staticSyncers.push(c.sync);
}

function stylingSlider(host: HTMLElement, path: string, label: string, min: number, max: number, step: number, fmt: (v: number) => string) {
  const c = sliderCtl({
    label, min, max, step, fmt,
    get: () => getPath(styling(), path),
    set: (v) => setPath(styling(), path, v),
    onChange: onStyling,
  });
  host.appendChild(c.el);
  staticSyncers.push(c.sync);
}

function buildStaticControls(): void {
  const glass = $('glassControls');
  glassSlider(glass, 'bgBlur', 'BG blur', 0, 20, 0.5, px1);
  glassSlider(glass, 'frost', 'Frost level', 0.3, 1, 0.02, f2);
  glassSlider(glass, 'frostInset', 'Frost inset', 0, 12, 0.5, px1);
  glassSlider(glass, 'shaderInset', 'Shader inset', 0, 28, 1, px0);
  glassSlider(glass, 'coreInset', 'Core inset', 0, 28, 1, px0);
  glassSlider(glass, 'coreBlur', 'Core blur', 0, 32, 1, px0);
  glassSlider(glass, 'coreOpacity', 'Core opacity', 0, 1, 0.02, f2);
  const propToggle = toggleCtl(
    'Core ∝ size',
    () => working().settings.coreProportional,
    (v) => (working().settings.coreProportional = v),
    onGlass,
  );
  glass.appendChild(propToggle.el);
  staticSyncers.push(propToggle.sync);
  glassSlider(glass, 'saturate', 'Saturate', 1, 2, 0.05, (v) => v.toFixed(2) + 'x');

  const border = $('borderControls');
  stylingSlider(border, 'border.width', 'Border width', 0, 3, 0.5, px1);
  stylingSlider(border, 'border.opacity', 'Border opacity', 0, 1, 0.02, f2);

  const inner = $('innerControls');
  glassSlider(inner, 'innerBloom.size', 'Size', 0, 24, 1, px0);
  glassSlider(inner, 'innerBloom.level', 'Level', 0, 1, 0.05, f2);

  const outer = $('outerControls');
  glassSlider(outer, 'outerBloom.size', 'Size', 0, 64, 1, px0);
  glassSlider(outer, 'outerBloom.level', 'Level', 0, 0.9, 0.05, f2);
}

function buildEffectControls(): void {
  const host = $('effectControls');
  host.innerHTML = '';
  effectSyncers = [];
  const def = EFFECTS[working().effect];
  effectLabel.textContent = def.label + ' parameters';

  for (const c of def.controls) {
    if (c.kind === 'colors') {
      const head = div('ctl color');
      const label = document.createElement('label');
      label.textContent = c.label;
      const addBtn = document.createElement('button');
      addBtn.className = 'palette-add';
      addBtn.textContent = '+ Add';
      head.append(label, addBtn);
      host.appendChild(head);
      const list = div('palette');
      host.appendChild(list);

      const enabledCount = () => working().palette.filter((r) => r.on).length;
      const render = () => {
        const pal = working().palette;
        addBtn.disabled = pal.length >= 5;
        list.innerHTML = '';
        pal.forEach((row, i) => {
          const r = div('palette-row' + (row.on ? '' : ' off'));
          const inp = document.createElement('input');
          inp.type = 'color';
          inp.value = row.color;
          inp.addEventListener('input', () => {
            row.color = inp.value;
            pushPalette();
          });
          const tog = document.createElement('button');
          tog.className = 'toggle' + (row.on ? ' on' : '');
          tog.textContent = row.on ? 'On' : 'Off';
          tog.addEventListener('click', () => {
            if (row.on && enabledCount() === 1) return; // keep at least one stop lit
            row.on = !row.on;
            render();
            pushPalette();
          });
          const del = document.createElement('button');
          del.className = 'row-del';
          del.textContent = '×';
          del.title = 'Remove color';
          del.disabled = pal.length === 1 || (row.on && enabledCount() === 1);
          del.addEventListener('click', () => {
            pal.splice(i, 1);
            render();
            pushPalette();
          });
          r.append(inp, tog, del);
          list.appendChild(r);
        });
      };
      addBtn.addEventListener('click', () => {
        const pal = working().palette;
        if (pal.length >= 5) return;
        pal.push({ color: pal[pal.length - 1].color, on: true });
        render();
        pushPalette();
      });
      render();
      effectSyncers.push(render);
    } else if (c.kind === 'select' && c.options.length > 3) {
      // too many options for a segmented row — render a dropdown
      const el = div('ctl');
      const top = div('top');
      const label = document.createElement('label');
      label.textContent = c.label;
      top.appendChild(label);
      el.appendChild(top);
      const sel = document.createElement('select');
      sel.style.marginTop = '8px';
      for (const o of c.options) {
        const opt = document.createElement('option');
        opt.value = String(o.value);
        opt.textContent = o.label;
        sel.appendChild(opt);
      }
      const key = c.key;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sync = () => (sel.value = String((working().effectParams as any)[key]));
      sel.addEventListener('change', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (working().effectParams as any)[key] = Number(sel.value);
        onEffect();
      });
      el.appendChild(sel);
      host.appendChild(el);
      sync();
      effectSyncers.push(sync);
    } else if (c.kind === 'select') {
      const el = div('ctl');
      const top = div('top');
      const label = document.createElement('label');
      label.textContent = c.label;
      top.appendChild(label);
      el.appendChild(top);
      const seg = div('segmented');
      seg.style.marginTop = '8px';
      const key = c.key;
      const buttons: HTMLButtonElement[] = [];
      const sync = () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buttons.forEach((b, i) => b.classList.toggle('on', c.options[i].value === (working().effectParams as any)[key]));
      for (const o of c.options) {
        const b = document.createElement('button');
        b.textContent = o.label;
        b.addEventListener('click', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (working().effectParams as any)[key] = o.value;
          sync();
          onEffect();
        });
        seg.appendChild(b);
        buttons.push(b);
      }
      el.appendChild(seg);
      host.appendChild(el);
      sync();
      effectSyncers.push(sync);
    } else {
      const key = c.key;
      const ctl = sliderCtl({
        label: c.label, min: c.min, max: c.max, step: c.step, fmt: fmtFor(c.step, c.unit),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: () => (working().effectParams as any)[key],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (v) => ((working().effectParams as any)[key] = v),
        onChange: onEffect,
      });
      host.appendChild(ctl.el);
      effectSyncers.push(ctl.sync);
    }
  }
}

// ── ui sync ──────────────────────────────────────────────────────────────────

function setSeg(id: string, attr: string, value: string): void {
  for (const b of Array.from($(id).querySelectorAll<HTMLButtonElement>('button')))
    b.classList.toggle('on', b.dataset[attr] === value);
}
function rebuildSelect(): void {
  presetSelect.innerHTML = '';
  const group = (label: string, list: DemoPreset[]) => {
    if (!list.length) return;
    const g = document.createElement('optgroup');
    g.label = label;
    for (const p of list) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.data.name;
      g.appendChild(opt);
    }
    presetSelect.appendChild(g);
  };
  group('Library', libPresets);
  group('My presets', state.presets);
  presetSelect.value = state.activeId;
}
function refreshDirty(): void {
  dirtyDot.hidden = !isDirty();
  $<HTMLButtonElement>('revertBtn').disabled = !isDirty();
}
function refreshAll(): void {
  staticSyncers.forEach((s) => s());
  buildEffectControls();
  borderColor.value = styling().border.color;
  fillInput.value = styling().fill;
  setSeg('shaderSeg', 'effect', working().effect);
  setSeg('themeSeg', 'theme', state.theme);
  setSeg('fpsSeg', 'fps', String(state.fps));
  rebuildSelect();
  const ro = activePreset().readonly === true;
  $<HTMLButtonElement>('saveBtn').disabled = ro;
  $<HTMLButtonElement>('renameBtn').disabled = ro;
  $<HTMLButtonElement>('deleteBtn').disabled = ro;
  refreshDirty();
}

// ── preset operations ────────────────────────────────────────────────────────

function selectPreset(id: string): void {
  state.activeId = id;
  const p = activePreset();
  state.working = lookFromPreset(p.data, state.theme, p.palette);
  applyAll();
  refreshAll();
  save();
}
function suggestName(): string {
  return `${activePreset().data.name.replace(/ copy.*$/i, '')} copy`;
}
function duplicatePreset(): void {
  const name = window.prompt('Name this preset', suggestName())?.trim();
  if (!name) return;
  const stored: StoredPreset = {
    id: newId(),
    data: presetFromLook(state.working, name),
    palette: clone(state.working.palette),
  };
  state.presets.push(stored);
  state.activeId = stored.id;
  refreshAll();
  save();
}
function commitSave(): void {
  if (activePreset().readonly) {
    duplicatePreset();
    return;
  }
  const target = state.presets.find((p) => p.id === state.activeId);
  if (!target) return;
  target.data = presetFromLook(state.working, target.data.name);
  target.palette = clone(state.working.palette);
  refreshDirty();
  save();
}
function renamePreset(): void {
  const p = state.presets.find((x) => x.id === state.activeId);
  if (!p) return;
  const name = window.prompt('Rename preset', p.data.name)?.trim();
  if (!name) return;
  p.data = { ...p.data, name };
  rebuildSelect();
  save();
}
function deletePreset(): void {
  const idx = state.presets.findIndex((x) => x.id === state.activeId);
  if (idx < 0) return;
  if (!window.confirm(`Delete preset "${state.presets[idx].data.name}"?`)) return;
  state.presets.splice(idx, 1);
  selectPreset(DEFAULT_PRESET_ID);
}
function revert(): void {
  const p = activePreset();
  state.working = lookFromPreset(p.data, state.working.baseTheme, p.palette);
  applyAll();
  refreshAll();
  save();
}

// ── code export ──────────────────────────────────────────────────────────────
// The lab's real output: a GlassPreset (only the values that differ from the baseline
// theme's defaults) plus ready-to-paste usage code. Component styling is excluded.

const tsLiteral = (v: unknown): string =>
  JSON.stringify(v, null, 2)
    .replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, '$1:')
    .replace(/"/g, "'");
function presetIdent(): string {
  const raw = activePreset().data.name
    .replace(/[^A-Za-z0-9]+([A-Za-z0-9])/g, (_, c: string) => c.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, '');
  const ident = raw.charAt(0).toLowerCase() + raw.slice(1);
  return /^[a-z]/.test(ident) && ident !== 'default' ? ident : 'myLook';
}
function currentPresetObject(): GlassPreset {
  return presetFromLook(state.working, activePreset().data.name);
}
function reactCode(): string {
  const ident = presetIdent();
  return `import { GlassFx } from 'glass-pulse-fx';
import type { GlassPreset } from 'glass-pulse-fx';

const ${ident}: GlassPreset = ${tsLiteral(currentPresetObject())};

export function Example() {
  return (
    <GlassFx preset={${ident}} radius={12}>
      <button style={{ all: 'unset', padding: '0 26px', height: 52, cursor: 'pointer' }}>
        Your component
      </button>
    </GlassFx>
  );
}
`;
}
function vanillaCode(): string {
  const ident = presetIdent();
  return `import { createGlass } from 'glass-pulse-fx/core';
import type { GlassPreset } from 'glass-pulse-fx/core';

const ${ident}: GlassPreset = ${tsLiteral(currentPresetObject())};

const glass = createGlass(document.querySelector('#target')!, {
  preset: ${ident},
  theme: 'dark', // or 'light'
});
`;
}
function presetFileCode(): string {
  const ident = presetIdent();
  return `// ${ident}.ts — exported from the glass-pulse-fx preset lab
import type { GlassPreset } from 'glass-pulse-fx';

export const ${ident}: GlassPreset = ${tsLiteral(currentPresetObject())};
`;
}

// ── import / export ──────────────────────────────────────────────────────────

const ioText = $<HTMLTextAreaElement>('ioText');
const ioMsg = $('ioMsg');
function flash(m: string): void {
  ioMsg.textContent = m;
  window.setTimeout(() => (ioMsg.textContent = ''), 2200);
}
async function copyCode(text: string): Promise<void> {
  $('ioRow').hidden = false;
  ioText.value = text;
  try {
    await navigator.clipboard.writeText(text);
    flash('Copied to clipboard');
  } catch {
    flash('Select + copy the text');
  }
}
function loadFromText(): void {
  let obj: unknown;
  try {
    obj = JSON.parse(ioText.value);
  } catch {
    flash('Invalid JSON — paste a GlassPreset');
    return;
  }
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const o = obj as any;
  if (!o || typeof o !== 'object' || (!o.effectParams && !o.settings && !o.effect && !o.themes)) {
    flash('Not a GlassPreset');
    return;
  }
  const stored: StoredPreset = { id: newId(), ...presetDataFrom(o, 'Imported') };
  state.presets.push(stored);
  state.activeId = stored.id;
  state.working = lookFromPreset(stored.data, state.theme, stored.palette);
  applyAll();
  refreshAll();
  save();
  flash('Imported');
}

// ── wiring ───────────────────────────────────────────────────────────────────

buildStaticControls();

borderColor.addEventListener('input', () => {
  styling().border.color = borderColor.value;
  onStyling();
});
fillInput.addEventListener('input', () => {
  styling().fill = fillInput.value;
  onStyling();
});

$('shaderSeg').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const id = btn.dataset.effect as EffectId;
  const w = working();
  w.effect = id;
  w.effectParams = clone(EFFECTS[id].defaults[w.baseTheme]);
  w.palette = w.effectParams.colors.map((c) => ({ color: c, on: true }));
  for (const i of instances) {
    i.setEffect(id);
    i.setEffectParams(w.effectParams);
  }
  setSeg('shaderSeg', 'effect', id);
  buildEffectControls();
  refreshDirty();
  save();
});

$('themeSeg').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  // the look stays constant — only the page, theme defaults underneath, and the
  // component styling change. This mirrors how presets behave in real apps.
  state.theme = btn.dataset.theme as Theme;
  applyAll();
  refreshAll();
  save();
});

$('fpsSeg').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  state.fps = normalizeFps(Number(btn.dataset.fps));
  pushFps();
  setSeg('fpsSeg', 'fps', String(state.fps));
  save();
});

$('saveBtn').addEventListener('click', commitSave);
$('saveAsBtn').addEventListener('click', duplicatePreset);
$('renameBtn').addEventListener('click', renamePreset);
$('deleteBtn').addEventListener('click', deletePreset);
$('revertBtn').addEventListener('click', revert);
presetSelect.addEventListener('change', () => selectPreset(presetSelect.value));

$('ioToggle').addEventListener('click', () => {
  const row = $('ioRow');
  row.hidden = !row.hidden;
  if (!row.hidden) ioText.value = presetFileCode();
});
$('reactBtn').addEventListener('click', () => void copyCode(reactCode()));
$('vanillaBtn').addEventListener('click', () => void copyCode(vanillaCode()));
$('presetBtn').addEventListener('click', () => void copyCode(presetFileCode()));
$('loadBtn').addEventListener('click', loadFromText);

let paused = false;
const pauseBtn = $<HTMLButtonElement>('pauseBtn');
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  for (const i of instances) i.setPaused(paused);
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

// ── init ─────────────────────────────────────────────────────────────────────

applyAll();
refreshAll();
