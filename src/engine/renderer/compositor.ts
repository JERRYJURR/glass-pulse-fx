// Per-instance layer stack + painting. Builds the 6 DOM layers behind the content,
// measures geometry, applies the frost/core/border styles, and copies crops of the
// shared GL canvas into the shader + bloom canvases each frame.
//
// In degraded mode (no WebGL) the shader + bloom canvases are skipped: the frost
// becomes a flat translucent fill and only the core + border render.

import { DPR, CROP_W, CROP_H, SHADER_SCALE, BLOOM_MAX, MIN_SAMPLE_SPAN } from '../perf';
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
  blur: number;
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
    bOut = { el: bloomOut, ctx: bloomOut.getContext('2d')!, spread: 0, scale: 1, blur: 0 };
    bIn = { el: bloomIn, ctx: bloomIn.getContext('2d')!, spread: 0, scale: 1, blur: 0 };
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

  function clampRadius(value: number): number {
    const min = Math.min(cssW, cssH);
    return Math.max(0, Math.min(value, min / 2));
  }

  function radiusFromCssToken(token: string, percentBasis: number): number | null {
    const value = parseFloat(token);
    if (Number.isNaN(value)) return null;
    return token.trim().endsWith('%') ? (percentBasis * value) / 100 : value;
  }

  function radiusFromCssValue(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '0px') return 0;

    const [horizontalPart, verticalPart = horizontalPart] = trimmed.split('/').map((part) => part.trim());
    const horizontal = horizontalPart.split(/\s+/)[0];
    const vertical = verticalPart.split(/\s+/)[0];
    const rx = radiusFromCssToken(horizontal, cssW);
    const ry = radiusFromCssToken(vertical, cssH);
    if (rx == null && ry == null) return null;
    if (rx == null) return ry;
    if (ry == null) return rx;
    return Math.min(rx, ry);
  }

  function resolveRadius(): number {
    const min = Math.min(cssW, cssH);
    const r = opts.radius;
    if (r != null) {
      if (typeof r === 'number') return clampRadius(r);
      const s = r.trim();
      if (s === '50%') return min / 2;
      if (s.endsWith('%')) {
        const pct = parseFloat(s);
        return Number.isNaN(pct) ? 0 : clampRadius((min * pct) / 100);
      }
      const px = parseFloat(s);
      if (!Number.isNaN(px)) return clampRadius(px);
    }
    if (kind === 'circle') return min / 2;
    return clampRadius(radiusFromCssValue(getComputedStyle(el).borderRadius) ?? 0);
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
    b.blur = size;
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
    const sampleW = Math.max(cssW, CROP_W * shaderScale * MIN_SAMPLE_SPAN);
    const sampleH = Math.max(cssH, CROP_H * shaderScale * MIN_SAMPLE_SPAN);
    let srcW = (sampleW * cw) / CROP_W / shaderScale;
    let srcH = (sampleH * ch) / CROP_H / shaderScale;
    if (srcW > cw) srcW = cw;
    if (srcH > ch) srcH = ch;
    return { sx: Math.max(0, (cw - srcW) / 2), sy: Math.max(0, (ch - srcH) / 2), srcW, srcH };
  }

  function bloomSourceInset(b: Bloom): number {
    if (!settings) return 0;
    if (b.blur <= 0) return 0;
    const rim = settings.coreInset + Math.max(settings.coreBlur, b.blur) * 0.5;
    const sourceInset = Math.max(2, b.blur, rim);
    return Math.min(sourceInset, Math.max(0, Math.min(cssW, cssH) / 2 - 0.5));
  }

  function attenuateBloomCorners(ctx: CanvasRenderingContext2D, b: Bloom, dx: number, dy: number): void {
    const min = Math.min(cssW, cssH);
    if (b.blur <= 0) return;
    if (cornerRadius <= 0 || cornerRadius >= min / 2 - 0.5) return;

    const zone = Math.min(min / 2, cornerRadius + b.blur * 1.25) * b.scale;
    const amount = Math.min(0.55, 0.14 + b.blur / 45);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${amount})`;
    ctx.fillRect(dx, dy, zone, zone);
    ctx.fillRect(dx + cssW * b.scale - zone, dy, zone, zone);
    ctx.fillRect(dx, dy + cssH * b.scale - zone, zone, zone);
    ctx.fillRect(dx + cssW * b.scale - zone, dy + cssH * b.scale - zone, zone, zone);
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

    const inset = bloomSourceInset(b) * s;
    const iW = dW - inset * 2;
    const iH = dH - inset * 2;
    if (iW > 0 && iH > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.roundRect(dx + inset, dy + inset, iW, iH, Math.max(0, cornerRadius * s - inset));
      ctx.fill();
    }
    attenuateBloomCorners(ctx, b, dx, dy);
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
