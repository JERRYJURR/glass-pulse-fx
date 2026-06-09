// The single shared RAF loop driving every glass instance.
//
// Cost model: one GL render per distinct (preset, theme) group per frame, plus one
// cheap canvas copy per visible instance. With all instances sharing a palette this
// collapses to the spec's "one shader render + N copies"; with mixed palettes it is
// "one render per distinct palette + N copies".
//
// Gating: pauses GL work when the tab is hidden, when prefers-reduced-motion is set
// (renders one frozen frame), and skips offscreen / paused instances.

import type { SharedRenderer } from './context';
import type { EffectId, EffectParams } from '../../types';

export interface Runtime {
  /** `${effectId}:${JSON(params)}` — the grouping key; core updates it on any change. */
  key: string;
  effectId: EffectId;
  params: EffectParams;
  /** minimum milliseconds between animated paints for this runtime */
  frameMs: number;
  /** last animated paint timestamp, in requestAnimationFrame time */
  lastPaintMs: number;
  paused: boolean;
  visible: boolean;
  /** set when geometry/style/effect changed so a frozen instance repaints once */
  needsPaint: boolean;
  /** copy the current shared frame into this instance's layers */
  paint(): void;
}

const registry = new Set<Runtime>();
let renderer: SharedRenderer | null = null;

let rafId = 0;
let dirty = false;

// Pausable animation clock (the shaders' u_time). It only advances while something is
// animating; while parked, frozen repaints reuse the same time and resuming (tab shown,
// reduced-motion lifted, unpause) continues where it left off instead of jumping by the
// wall-clock gap.
let clockSec = 0;
let lastClockMs = 0; // last RAF timestamp the clock advanced; 0 = parked

let motionAllowed = true;
let hidden = false;
let gatesBound = false;
let motionMql: MediaQueryList | null = null;

function advanceClock(now: number, animate: boolean): number {
  if (animate) {
    if (lastClockMs) clockSec += (now - lastClockMs) / 1000;
    lastClockMs = now;
  } else {
    lastClockMs = 0;
  }
  return clockSec;
}

export function markDirty(): void {
  dirty = true;
}

export function addRuntime(rt: Runtime, r: SharedRenderer): void {
  renderer = r;
  registry.add(rt);
  rt.needsPaint = true;
  dirty = true;
  ensureLoop();
}

export function removeRuntime(rt: Runtime): void {
  registry.delete(rt);
  if (registry.size === 0) stopLoop();
}

function shouldAnimate(): boolean {
  if (!motionAllowed || hidden) return false;
  for (const rt of registry) if (rt.visible && !rt.paused) return true;
  return false;
}

function ensureLoop(): void {
  if (rafId) return;
  bindGates();
  rafId = requestAnimationFrame(tick);
}

function stopLoop(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  lastClockMs = 0;
  unbindGates();
}

function tick(now: number): void {
  rafId = requestAnimationFrame(tick);

  const animate = shouldAnimate();
  const t = advanceClock(now, animate);
  let anyNeedsPaint = false;
  let anyDue = false;
  for (const rt of registry) {
    if (rt.needsPaint) anyNeedsPaint = true;
    if (animate && rt.visible && !rt.paused && (rt.lastPaintMs === 0 || now - rt.lastPaintMs >= rt.frameMs)) {
      anyDue = true;
    }
    if (anyNeedsPaint && anyDue) {
      break;
    }
  }
  if (!anyDue && !dirty && !anyNeedsPaint) return;

  // group visible instances by palette key
  const groups = new Map<string, Runtime[]>();
  for (const rt of registry) {
    if (!rt.visible) continue;
    const due =
      rt.needsPaint ||
      (animate && !rt.paused && (rt.lastPaintMs === 0 || now - rt.lastPaintMs >= rt.frameMs));
    if (!due) continue;
    let g = groups.get(rt.key);
    if (!g) groups.set(rt.key, (g = []));
    g.push(rt);
  }

  if (!groups.size) {
    dirty = false;
    return;
  }

  for (const group of groups.values()) {
    if (renderer) {
      renderer.renderEffect(group[0].effectId, group[0].params, t);
    }
    for (const rt of group) {
      rt.paint();
      rt.needsPaint = false;
      if (animate && !rt.paused) rt.lastPaintMs = now;
    }
  }
  dirty = false;
}

// ── gates ────────────────────────────────────────────────────────────────────

function onMotion(): void {
  motionAllowed = !(motionMql && motionMql.matches);
  dirty = true;
}
function onVisibility(): void {
  hidden = document.hidden;
  if (hidden) {
    // RAF stops firing while the tab is hidden, so park the clock here — the next
    // tick would otherwise fold the whole hidden interval into the animation time.
    lastClockMs = 0;
  } else {
    for (const rt of registry) rt.lastPaintMs = 0;
  }
  dirty = true;
}

function bindGates(): void {
  if (gatesBound || typeof window === 'undefined') return;
  gatesBound = true;
  motionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionAllowed = !motionMql.matches;
  motionMql.addEventListener('change', onMotion);
  hidden = document.hidden;
  document.addEventListener('visibilitychange', onVisibility);
}

function unbindGates(): void {
  if (!gatesBound) return;
  gatesBound = false;
  motionMql?.removeEventListener('change', onMotion);
  document.removeEventListener('visibilitychange', onVisibility);
  motionMql = null;
}
