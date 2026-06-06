// glass-pulse-fx preset lab.
// A "preset" stores the full look — glass material + shader + shader params — for BOTH
// dark and light. The live "working" copy is what the controls edit; Save commits it.
// Everything persists to localStorage. Imports from ../src so the demo is a live test.

import {
  createGlass,
  DEFAULT_SETTINGS,
  DEFAULT_FILL,
  EFFECTS,
  mergeSettings,
  mergeEffectParams,
} from '../src/core';
import type {
  EffectId,
  EffectParams,
  GlassInstance,
  GlassSettings,
  Kind,
  Theme,
} from '../src/core';

// ── model ────────────────────────────────────────────────────────────────────

interface ThemeConfig {
  settings: GlassSettings;
  fill: string;
  effect: EffectId;
  effectParams: EffectParams;
}
interface DemoPreset {
  id: string;
  name: string;
  builtin?: boolean;
  themes: Record<Theme, ThemeConfig>;
}
interface DemoState {
  version: 2;
  presets: DemoPreset[];
  activeId: string;
  theme: Theme;
  working: Record<Theme, ThemeConfig>;
}

const KEY = 'glass-pulse-fx:demo:v2';
const BUILTIN_ID = 'builtin-default';
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
let idSeq = 0;
const newId = () => `p-${Date.now().toString(36)}-${idSeq++}`;

function builtinTheme(t: Theme): ThemeConfig {
  return {
    settings: clone(DEFAULT_SETTINGS[t]),
    fill: DEFAULT_FILL[t],
    effect: 'panes',
    effectParams: clone(EFFECTS.panes.defaults[t]),
  };
}
function builtinPreset(): DemoPreset {
  return {
    id: BUILTIN_ID,
    name: 'Default',
    builtin: true,
    themes: { dark: builtinTheme('dark'), light: builtinTheme('light') },
  };
}
function freshState(): DemoState {
  const b = builtinPreset();
  return {
    version: 2,
    presets: [],
    activeId: b.id,
    theme: 'dark',
    working: { dark: clone(b.themes.dark), light: clone(b.themes.light) },
  };
}
// backfill any newly-added settings/param fields onto presets saved by older builds
function normalizeTheme(tc: ThemeConfig, t: Theme): ThemeConfig {
  const effect: EffectId = 'panes';
  return {
    settings: mergeSettings(DEFAULT_SETTINGS[t], tc.settings),
    fill: tc.fill ?? DEFAULT_FILL[t],
    effect,
    effectParams: mergeEffectParams(EFFECTS[effect].defaults[t], tc.effectParams),
  };
}
function normalizePreset(p: DemoPreset): DemoPreset {
  return { ...p, themes: { dark: normalizeTheme(p.themes.dark, 'dark'), light: normalizeTheme(p.themes.light, 'light') } };
}
function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      if (s && s.version === 2 && s.working?.dark?.effectParams && s.working?.light?.effectParams) {
        s.working = { dark: normalizeTheme(s.working.dark, 'dark'), light: normalizeTheme(s.working.light, 'light') };
        s.presets = (s.presets ?? []).map(normalizePreset);
        return s;
      }
    }
  } catch {
    /* ignore */
  }
  return freshState();
}

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

const allPresets = (): DemoPreset[] => [builtinPreset(), ...state.presets];
const activePreset = (): DemoPreset =>
  allPresets().find((p) => p.id === state.activeId) ?? builtinPreset();
const working = (): ThemeConfig => state.working[state.theme];
const isDirty = (): boolean =>
  JSON.stringify(state.working) !== JSON.stringify(activePreset().themes);

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

// Velocity graph editor (AE-style): y = band speed, x = position across the element.
// Two anchor points (start/end) drag up/down to set the speed at each end; each carries a
// bezier tangent handle you drag in 2D to shape the speed curve between them.
// keys = [velStart, velEnd, c0x, c0y, c1x, c1y].
function velGraphCtl(label: string, keys: string[], onChange: () => void): Ctl {
  const [START, END, C0X, C0Y, C1X, C1Y] = keys;
  const ns = 'http://www.w3.org/2000/svg';
  const P = 16, W = 200, H = 140;
  const wsvg = W + P * 2, hsvg = H + P * 2;
  const VMIN = 0.05;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const el = div('ctl bezier');
  const lab = document.createElement('label');
  lab.className = 'bz-label';
  lab.textContent = label;
  el.appendChild(lab);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${wsvg} ${hsvg}`);
  svg.setAttribute('class', 'bz-svg');
  const mk = (tag: string, cls: string) => {
    const e = document.createElementNS(ns, tag);
    e.setAttribute('class', cls);
    return e;
  };
  const t1 = mk('text', 'bz-axis'); t1.textContent = 'fast'; t1.setAttribute('x', String(P + 3)); t1.setAttribute('y', String(P + 9));
  const t2 = mk('text', 'bz-axis'); t2.textContent = 'slow'; t2.setAttribute('x', String(P + 3)); t2.setAttribute('y', String(P + H - 3));
  const area = mk('path', 'bz-area');
  const curve = mk('path', 'bz-curve');
  const line0 = mk('line', 'bz-line'), line1 = mk('line', 'bz-line');
  const hand0 = mk('circle', 'bz-handle'), hand1 = mk('circle', 'bz-handle');
  hand0.setAttribute('r', '4'); hand1.setAttribute('r', '4');
  const aS = mk('circle', 'bz-anchor'), aE = mk('circle', 'bz-anchor');
  aS.setAttribute('r', '6'); aE.setAttribute('r', '6');
  svg.append(area, t1, t2, curve, line0, line1, hand0, hand1, aS, aE);
  el.appendChild(svg);

  const gx = (s: number) => P + s * W;
  const gy = (v: number) => P + (1 - v) * H;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ep = () => working().effectParams as any;
  const g = (k: string) => ep()[k] as number;
  const setC = (e: SVGElement, x: number, y: number) => { e.setAttribute('cx', String(x)); e.setAttribute('cy', String(y)); };
  const setL = (e: SVGElement, x1: number, y1: number, x2: number, y2: number) => {
    e.setAttribute('x1', String(x1)); e.setAttribute('y1', String(y1));
    e.setAttribute('x2', String(x2)); e.setAttribute('y2', String(y2));
  };
  // cubic bezier point at parameter t, from P0=(0,velStart) P1=(c0) P2=(c1) P3=(1,velEnd)
  function bez(t: number): [number, number] {
    const it = 1 - t;
    const x = 3 * it * it * t * g(C0X) + 3 * it * t * t * g(C1X) + t * t * t;
    const y = it * it * it * g(START) + 3 * it * it * t * g(C0Y) + 3 * it * t * t * g(C1Y) + t * t * t * g(END);
    return [x, y];
  }
  function render() {
    let d = '';
    for (let i = 0; i <= 32; i++) {
      const [x, y] = bez(i / 32);
      d += (i ? 'L' : 'M') + gx(x).toFixed(1) + ' ' + gy(y).toFixed(1) + ' ';
    }
    curve.setAttribute('d', d);
    area.setAttribute('d', d + `L ${gx(1)} ${gy(0)} L ${gx(0)} ${gy(0)} Z`);
    setL(line0, gx(0), gy(g(START)), gx(g(C0X)), gy(g(C0Y)));
    setL(line1, gx(1), gy(g(END)), gx(g(C1X)), gy(g(C1Y)));
    setC(hand0, gx(g(C0X)), gy(g(C0Y)));
    setC(hand1, gx(g(C1X)), gy(g(C1Y)));
    setC(aS, gx(0), gy(g(START)));
    setC(aE, gx(1), gy(g(END)));
  }
  let drag = -1;
  function pt(e: PointerEvent): [number, number] {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * wsvg;
    const sy = ((e.clientY - r.top) / r.height) * hsvg;
    return [clamp((sx - P) / W, 0, 1), clamp(1 - (sy - P) / H, VMIN, 1)];
  }
  function move(e: PointerEvent) {
    if (drag < 0) return;
    const [x, y] = pt(e);
    if (drag === 0) { const dy = y - g(START); ep()[START] = y; ep()[C0Y] = clamp(g(C0Y) + dy, VMIN, 1); }
    else if (drag === 1) { const dy = y - g(END); ep()[END] = y; ep()[C1Y] = clamp(g(C1Y) + dy, VMIN, 1); }
    else if (drag === 2) { ep()[C0X] = clamp(x, 0.05, 0.95); ep()[C0Y] = y; }
    else { ep()[C1X] = clamp(x, 0.05, 0.95); ep()[C1Y] = y; }
    render();
    onChange();
  }
  function startDrag(idx: number, e: PointerEvent) {
    drag = idx;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / unsupported pointer */
    }
    e.preventDefault();
  }
  const wire = (e: SVGElement, idx: number) => {
    e.addEventListener('pointerdown', (ev) => startDrag(idx, ev as PointerEvent));
    e.addEventListener('pointermove', (ev) => move(ev as PointerEvent));
    e.addEventListener('pointerup', () => (drag = -1));
  };
  wire(aS, 0); wire(aE, 1); wire(hand0, 2); wire(hand1, 3);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  render();
  return { el, sync: render };
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
  return createGlass($(t.id), {
    kind: t.kind,
    radius: t.radius,
    theme: state.theme,
    effect: w.effect,
    effectParams: w.effectParams,
    settings: w.settings,
    fill: w.fill,
  });
});

function pushGlass(): void {
  const w = working();
  for (const i of instances) {
    i.update(w.settings);
    i.setFill(w.fill);
  }
}
function pushEffectParams(): void {
  const w = working();
  for (const i of instances) i.setEffectParams(w.effectParams);
}
function applyAll(): void {
  document.body.classList.toggle('light', state.theme === 'light');
  const w = working();
  for (const i of instances) {
    i.setTheme(state.theme);
    i.setEffect(w.effect);
    i.setEffectParams(w.effectParams);
    i.update(w.settings);
    i.setFill(w.fill);
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

function buildStaticControls(): void {
  const glass = $('glassControls');
  glassSlider(glass, 'bgBlur', 'BG blur', 0, 20, 0.5, px1);
  glassSlider(glass, 'frost', 'Frost level', 0.3, 1, 0.02, f2);
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
  glassSlider(border, 'borderWidth', 'Width', 0, 3, 0.5, px1);
  glassSlider(border, 'borderOpacity', 'Opacity', 0, 1, 0.02, f2);

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
      const row = div('ctl color');
      const label = document.createElement('label');
      label.textContent = c.label;
      row.appendChild(label);
      host.appendChild(row);
      const set = div('colorset');
      const inputs: HTMLInputElement[] = [];
      for (let i = 0; i < 5; i++) {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.addEventListener('input', () => {
          working().effectParams.colors[i] = inp.value;
          onEffect();
        });
        inputs.push(inp);
        set.appendChild(inp);
      }
      host.appendChild(set);
      const syncColors = () => inputs.forEach((inp, i) => (inp.value = working().effectParams.colors[i]));
      syncColors();
      effectSyncers.push(syncColors);
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
    } else if (c.kind === 'velgraph') {
      const ctl = velGraphCtl(c.label, c.keys, onEffect);
      host.appendChild(ctl.el);
      effectSyncers.push(ctl.sync);
    } else if (c.kind === 'toggle') {
      const el = div('ctl color');
      const label = document.createElement('label');
      label.textContent = c.label;
      const btn = document.createElement('button');
      btn.className = 'toggle';
      const key = c.key;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ep = () => working().effectParams as any;
      const sync = () => {
        const on = ep()[key] > 0.5;
        btn.classList.toggle('on', on);
        btn.textContent = on ? 'On' : 'Off';
      };
      btn.addEventListener('click', () => {
        ep()[key] = ep()[key] > 0.5 ? 0 : 1;
        sync();
        onEffect();
      });
      el.append(label, btn);
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
  for (const p of allPresets()) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    presetSelect.appendChild(opt);
  }
  presetSelect.value = state.activeId;
}
function refreshDirty(): void {
  dirtyDot.hidden = !isDirty();
  $<HTMLButtonElement>('revertBtn').disabled = !isDirty();
}
function refreshAll(): void {
  staticSyncers.forEach((s) => s());
  buildEffectControls();
  borderColor.value = working().settings.borderColor;
  fillInput.value = working().fill;
  setSeg('shaderSeg', 'effect', working().effect);
  setSeg('themeSeg', 'theme', state.theme);
  rebuildSelect();
  const builtin = activePreset().builtin === true;
  $<HTMLButtonElement>('renameBtn').disabled = builtin;
  $<HTMLButtonElement>('deleteBtn').disabled = builtin;
  refreshDirty();
}

// ── preset operations ────────────────────────────────────────────────────────

function selectPreset(id: string): void {
  state.activeId = id;
  state.working = clone(activePreset().themes);
  applyAll();
  refreshAll();
  save();
}
function suggestName(): string {
  return `${activePreset().name.replace(/ copy.*$/i, '')} copy`;
}
function saveAs(): void {
  const name = window.prompt('Name this preset', suggestName())?.trim();
  if (!name) return;
  const preset: DemoPreset = { id: newId(), name, themes: clone(state.working) };
  state.presets.push(preset);
  state.activeId = preset.id;
  rebuildSelect();
  refreshDirty();
  save();
}
function commitSave(): void {
  if (activePreset().builtin) {
    saveAs();
    return;
  }
  const target = state.presets.find((p) => p.id === state.activeId);
  if (!target) return;
  target.themes = clone(state.working);
  refreshDirty();
  save();
}
function renamePreset(): void {
  const p = state.presets.find((x) => x.id === state.activeId);
  if (!p) return;
  const name = window.prompt('Rename preset', p.name)?.trim();
  if (!name) return;
  p.name = name;
  rebuildSelect();
  save();
}
function deletePreset(): void {
  const idx = state.presets.findIndex((x) => x.id === state.activeId);
  if (idx < 0) return;
  if (!window.confirm(`Delete preset "${state.presets[idx].name}"?`)) return;
  state.presets.splice(idx, 1);
  selectPreset(BUILTIN_ID);
}
function revert(): void {
  state.working = clone(activePreset().themes);
  applyAll();
  refreshAll();
  save();
}

// ── import / export ──────────────────────────────────────────────────────────

const ioText = $<HTMLTextAreaElement>('ioText');
const ioMsg = $('ioMsg');
const exportObject = () => ({ name: activePreset().name, themes: clone(state.working) });
function flash(m: string): void {
  ioMsg.textContent = m;
  window.setTimeout(() => (ioMsg.textContent = ''), 2200);
}
function loadFromText(): void {
  let obj: unknown;
  try {
    obj = JSON.parse(ioText.value);
  } catch {
    flash('Invalid JSON');
    return;
  }
  const o = obj as { name?: string; themes?: Record<Theme, ThemeConfig> };
  if (!o.themes?.dark?.effectParams || !o.themes?.light?.effectParams) {
    flash('Missing themes.dark / themes.light');
    return;
  }
  const preset: DemoPreset = { id: newId(), name: o.name || 'Imported', themes: clone(o.themes) };
  state.presets.push(preset);
  state.activeId = preset.id;
  state.working = clone(preset.themes);
  applyAll();
  refreshAll();
  save();
  flash('Imported');
}

// ── wiring ───────────────────────────────────────────────────────────────────

buildStaticControls();

borderColor.addEventListener('input', () => {
  working().settings.borderColor = borderColor.value;
  onGlass();
});
fillInput.addEventListener('input', () => {
  working().fill = fillInput.value;
  onGlass();
});

$('shaderSeg').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const id = btn.dataset.effect as EffectId;
  working().effect = id;
  working().effectParams = clone(EFFECTS[id].defaults[state.theme]);
  for (const i of instances) {
    i.setEffect(id);
    i.setEffectParams(working().effectParams);
  }
  setSeg('shaderSeg', 'effect', id);
  buildEffectControls();
  refreshDirty();
  save();
});

$('themeSeg').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  state.theme = btn.dataset.theme as Theme;
  applyAll();
  refreshAll();
  save();
});

$('saveBtn').addEventListener('click', commitSave);
$('saveAsBtn').addEventListener('click', saveAs);
$('renameBtn').addEventListener('click', renamePreset);
$('deleteBtn').addEventListener('click', deletePreset);
$('revertBtn').addEventListener('click', revert);
presetSelect.addEventListener('change', () => selectPreset(presetSelect.value));

$('ioToggle').addEventListener('click', () => {
  const row = $('ioRow');
  row.hidden = !row.hidden;
  if (!row.hidden) ioText.value = JSON.stringify(exportObject(), null, 2);
});
$('exportBtn').addEventListener('click', async () => {
  const text = JSON.stringify(exportObject(), null, 2);
  ioText.value = text;
  try {
    await navigator.clipboard.writeText(text);
    flash('Copied to clipboard');
  } catch {
    flash('Select + copy the text');
  }
});
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
