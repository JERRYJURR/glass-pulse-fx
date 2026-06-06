// The single shared RAF loop driving every glass instance.
//
// Cost model: one GL render per distinct (preset, theme) group per frame, plus one
// cheap canvas copy per visible instance. With all instances sharing a palette this
// collapses to the spec's "one shader render + N copies"; with mixed palettes it is
// "one render per distinct palette + N copies".
//
// Gating: pauses GL work when the tab is hidden, when prefers-reduced-motion is set
// (renders one frozen frame), and skips offscreen / paused instances.

import { FRAME_MS } from '../perf';
import type { SharedRenderer } from './context';
import type { EffectId, EffectParams } from '../../types';

export interface Runtime {
  /** `${effectId}:${JSON(params)}` — the grouping key; core updates it on any change. */
  key: string;
  effectId: EffectId;
  params: EffectParams;
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
let last = 0;
let dirty = false;
let startMs = 0;

let motionAllowed = true;
let hidden = false;
let gatesBound = false;
let motionMql: MediaQueryList | null = null;

function nowSec(): number {
  if (!startMs) startMs = performance.now();
  return (performance.now() - startMs) / 1000;
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
  last = 0;
  rafId = requestAnimationFrame(tick);
}

function stopLoop(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  unbindGates();
}

function tick(now: number): void {
  rafId = requestAnimationFrame(tick);
  if (now - last < FRAME_MS) return;
  last = now;

  const animate = shouldAnimate();
  let anyNeedsPaint = false;
  for (const rt of registry) {
    if (rt.needsPaint) {
      anyNeedsPaint = true;
      break;
    }
  }
  if (!animate && !dirty && !anyNeedsPaint) return;

  const t = nowSec();

  // group visible instances by palette key
  const groups = new Map<string, Runtime[]>();
  for (const rt of registry) {
    if (!rt.visible) continue;
    let g = groups.get(rt.key);
    if (!g) groups.set(rt.key, (g = []));
    g.push(rt);
  }

  for (const group of groups.values()) {
    const groupAnimates = animate && group.some((rt) => !rt.paused);
    const groupNeeds = group.some((rt) => rt.needsPaint);
    if (renderer && (groupAnimates || groupNeeds)) {
      renderer.renderEffect(group[0].effectId, group[0].params, t);
    }
    for (const rt of group) {
      if (groupAnimates || rt.needsPaint) {
        rt.paint();
        rt.needsPaint = false;
      }
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
  if (!hidden) last = 0;
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
