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
