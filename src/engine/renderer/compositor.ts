// Per-instance layer stack + painting. Builds the 6 DOM layers behind the content,
// measures geometry, applies the frost/core/border styles, and copies crops of the
// shared GL canvas into the shader + bloom canvases each frame.
//
// In degraded mode (no WebGL) the shader + bloom canvases are skipped: the frost
// becomes a flat translucent fill and only the core + border render.

import { DPR, CROP_W, CROP_H, SHADER_SCALE, BLOOM_MAX } from '../perf';
import { withAlpha } from '../color';
import { CLASS, STRUCT, assign } from '../../styles';
import type { GlassSettings, Kind } from '../../types';

const supportsBackdrop =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  (CSS.supports('backdrop-filter', 'blur(1px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));

interface Crop {
  sx: number;
  sy: number;
  srcW: number;
  srcH: number;
}

interface Bloom {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  spread: number;
  scale: number;
}

export interface Compositor {
  measure(): void;
  applyStyle(settings: GlassSettings, fill: string): void;
  paint(glCanvas: HTMLCanvasElement): void;
  destroy(): void;
}

export interface CompositorOptions {
  radius?: number | string;
  degraded?: boolean;
}

function mk<K extends keyof typeof CLASS>(
  tag: string,
  key: K,
): HTMLElement {
  const e = document.createElement(tag);
  e.className = CLASS[key];
  assign(e, STRUCT[key]);
  return e;
}

export function createCompositor(
  el: HTMLElement,
  kind: Kind,
  opts: CompositorOptions = {},
): Compositor {
  const degraded = !!opts.degraded;
  const shaderScale = SHADER_SCALE[kind];

  // wrapper baseline: contained backdrop-filter, positioned, blooms may overflow
  const cs = getComputedStyle(el);
  if (cs.position === 'static') el.style.position = 'relative';
  el.style.isolation = 'isolate';

  const frost = mk('div', 'frost');
  const coreClip = mk('div', 'coreClip');
  const core = mk('div', 'core');
  coreClip.appendChild(core);
  const border = mk('div', 'border');

  let plasma: HTMLCanvasElement | null = null;
  let pctx: CanvasRenderingContext2D | null = null;
  let bIn: Bloom | null = null;
  let bOut: Bloom | null = null;

  const nodes: HTMLElement[] = [];
  if (!degraded) {
    const bloomOut = mk('canvas', 'bloomOut') as HTMLCanvasElement;
    const bloomIn = mk('canvas', 'bloomIn') as HTMLCanvasElement;
    plasma = mk('canvas', 'shader') as HTMLCanvasElement;
    pctx = plasma.getContext('2d');
    bOut = { el: bloomOut, ctx: bloomOut.getContext('2d')!, spread: 0, scale: 1 };
    bIn = { el: bloomIn, ctx: bloomIn.getContext('2d')!, spread: 0, scale: 1 };
    nodes.push(bloomOut, bloomIn, plasma);
  }
  nodes.push(frost, coreClip, border);

  const first = el.firstChild;
  for (const n of nodes) el.insertBefore(n, first);

  let cssW = 1;
  let cssH = 1;
  let cornerRadius = 0;
  let settings: GlassSettings | null = null;
  let fill = '#000000';

  function resolveRadius(): number {
    const min = Math.min(cssW, cssH);
    const r = opts.radius;
    if (r != null) {
      if (typeof r === 'number') return Math.min(r, cssH / 2);
      const s = r.trim();
      if (s === '50%') return min / 2;
      if (s.endsWith('%')) return (min * parseFloat(s)) / 100;
      const px = parseFloat(s);
      if (!Number.isNaN(px)) return Math.min(px, cssH / 2);
    }
    return kind === 'circle' ? min / 2 : cssH / 2;
  }

  function layoutBloom(b: Bloom, size: number, level: number): void {
    const spread = Math.ceil(size * 2.2) + 5;
    const cw = cssW + spread * 2;
    const ch = cssH + spread * 2;
    assign(b.el, {
      left: -spread + 'px',
      top: -spread + 'px',
      width: cw + 'px',
      height: ch + 'px',
      filter: `blur(${size}px)`,
      opacity: String(level),
    });
    const scale = Math.min(DPR, BLOOM_MAX / Math.max(cw, ch));
    b.el.width = Math.max(1, Math.round(cw * scale));
    b.el.height = Math.max(1, Math.round(ch * scale));
    b.spread = spread;
    b.scale = scale;
  }

  function applyGlassStyle(): void {
    if (!settings) return;
    frost.style.background = withAlpha(fill, settings.frost);
    if (supportsBackdrop && !degraded) {
      const bf = `saturate(${settings.saturate}) blur(${settings.bgBlur}px)`;
      frost.style.backdropFilter = bf;
      (frost.style as unknown as Record<string, string>).webkitBackdropFilter = bf;
    }
    // optionally scale inset + blur with element size (reference = 52px button height)
    const k = settings.coreProportional ? Math.min(cssW, cssH) / 52 : 1;
    const inset = settings.coreInset * k;
    core.style.inset = inset + 'px';
    core.style.borderRadius = Math.max(0, cornerRadius - inset) + 'px';
    core.style.background = fill;
    core.style.filter = `blur(${settings.coreBlur * k}px)`;
    core.style.opacity = String(settings.coreOpacity);
  }

  function applyBorder(): void {
    if (!settings) return;
    border.style.borderRadius = cornerRadius + 'px';
    border.style.border = `${settings.borderWidth}px solid ${withAlpha(
      settings.borderColor,
      settings.borderOpacity,
    )}`;
  }

  function measure(): void {
    const r = el.getBoundingClientRect();
    cssW = Math.max(1, Math.round(r.width));
    cssH = Math.max(1, Math.round(r.height));
    cornerRadius = resolveRadius();

    if (plasma) {
      plasma.width = Math.round(cssW * DPR);
      plasma.height = Math.round(cssH * DPR);
      plasma.style.borderRadius = cornerRadius + 'px';
    }
    frost.style.borderRadius = cornerRadius + 'px';
    coreClip.style.borderRadius = cornerRadius + 'px';

    if (!settings) return;
    if (bOut) layoutBloom(bOut, settings.outerBloom.size, settings.outerBloom.level);
    if (bIn) layoutBloom(bIn, settings.innerBloom.size, settings.innerBloom.level);
    applyGlassStyle();
    applyBorder();
  }

  function cropForButton(glCanvas: HTMLCanvasElement): Crop {
    const cw = glCanvas.width;
    const ch = glCanvas.height;
    let srcW = (cssW * cw) / CROP_W / shaderScale;
    let srcH = (cssH * ch) / CROP_H / shaderScale;
    if (srcW > cw) srcW = cw;
    if (srcH > ch) srcH = ch;
    return { sx: Math.max(0, (cw - srcW) / 2), sy: Math.max(0, (ch - srcH) / 2), srcW, srcH };
  }

  function paintBloom(b: Bloom, crop: Crop, glCanvas: HTMLCanvasElement): void {
    const ctx = b.ctx;
    const s = b.scale;
    const sp = b.spread;
    ctx.clearRect(0, 0, b.el.width, b.el.height);
    const dx = sp * s;
    const dy = sp * s;
    const dW = cssW * s;
    const dH = cssH * s;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(dx, dy, dW, dH, cornerRadius * s);
    ctx.clip();
    ctx.drawImage(glCanvas, crop.sx, crop.sy, crop.srcW, crop.srcH, dx, dy, dW, dH);
    ctx.restore();
  }

  function paint(glCanvas: HTMLCanvasElement): void {
    if (!plasma || !pctx) return;
    const crop = cropForButton(glCanvas);
    if (bOut) paintBloom(bOut, crop, glCanvas);
    if (bIn) paintBloom(bIn, crop, glCanvas);
    const dw = plasma.width;
    const dh = plasma.height;
    if (dw < 1 || dh < 1) return;
    pctx.clearRect(0, 0, dw, dh);
    pctx.drawImage(glCanvas, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, dw, dh);
  }

  return {
    measure,
    applyStyle(s, f) {
      settings = s;
      fill = f;
      measure();
    },
    paint,
    destroy() {
      for (const n of nodes) n.remove();
    },
  };
}
