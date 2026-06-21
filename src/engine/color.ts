// Tiny color helpers. Hex in, GL/CSS out.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(c: string): boolean {
  return HEX.test(c.trim());
}

function expand(h: string): number {
  let s = h.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return parseInt(s, 16);
}

/** '#rrggbb' -> [r, g, b] in 0..1, for GL uniforms. */
export function hexToRgb(h: string): [number, number, number] {
  const n = expand(h);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** '#rrggbb' + alpha -> 'rgba(r,g,b,a)', for CSS. */
export function hexToRgba(h: string, a: number): string {
  const n = expand(h);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Fold an alpha into any CSS color when it's hex; otherwise return it unchanged. */
export function withAlpha(color: string, a: number): string {
  return isHexColor(color) ? hexToRgba(color, a) : color;
}

export interface RGBA {
  /** r,g,b in 0..255, a in 0..1 */
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parse a CSS color (hex or rgb()/rgba(), incl. computed `rgb(...)`) to RGBA. */
export function parseColor(c: string): RGBA {
  const s = c.trim();
  if (isHexColor(s)) {
    const n = expand(s);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return { r: 0, g: 0, b: 0, a: 0 };
  const parts = m[1].split(/[,/]/).map((p) => parseFloat(p.trim()));
  return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] == null ? 1 : parts[3] };
}

/** Porter-Duff source-over: paint `fg` onto `bg` (the eyedropper composite). */
export function compositeOver(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

/** RGBA -> '#rrggbb' (alpha dropped — caller should composite to opaque first). */
export function rgbToHex(c: RGBA): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
