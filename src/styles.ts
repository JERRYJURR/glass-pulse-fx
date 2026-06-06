// Layer class names + the static structural styles for each layer.
// The library applies these inline so consumers don't need to import a CSS file;
// the class names exist as styling/debugging hooks.

export const PREFIX = 'gpfx';

export const CLASS = {
  bloomOut: `${PREFIX}-bloom-out`,
  bloomIn: `${PREFIX}-bloom-in`,
  shader: `${PREFIX}-shader`,
  frost: `${PREFIX}-frost`,
  coreClip: `${PREFIX}-core-clip`,
  core: `${PREFIX}-core`,
  border: `${PREFIX}-border`,
} as const;

type Style = Partial<CSSStyleDeclaration>;

// z-order, bottom -> top: blooms, shader, frost, core, border, then content (the children).
export const STRUCT: Record<keyof typeof CLASS, Style> = {
  bloomOut: { position: 'absolute', pointerEvents: 'none', zIndex: '0' },
  bloomIn: { position: 'absolute', pointerEvents: 'none', zIndex: '1' },
  shader: {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '2',
  },
  frost: { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '3' },
  coreClip: {
    position: 'absolute', inset: '0', pointerEvents: 'none',
    zIndex: '4', overflow: 'hidden',
  },
  core: { position: 'absolute' },
  border: { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '5' },
};

export function assign(el: HTMLElement, s: Style): void {
  Object.assign(el.style, s);
}
