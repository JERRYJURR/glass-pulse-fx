// React wrapper over the vanilla core. SSR-safe: the WebGL instance is only created
// in a layout effect (client-only); the server renders a plain wrapper + children.

import * as React from 'react';
import { createGlass } from './core';
import { DEFAULT_SETTINGS, mergeSettings } from './engine/settings';
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
} from './types';

export interface GlassFxProps {
  children?: React.ReactNode;
  /** a shareable look (shader + params + glass material, per theme); explicit props win */
  preset?: GlassPreset;
  /** base shader. default 'panes' (or the preset's effect) */
  effect?: EffectId;
  /** shader params, merged onto the preset's params and the effect's theme defaults */
  effectParams?: Partial<EffectParams>;
  /** 'dark' | 'light' | 'auto' (follows prefers-color-scheme). default 'auto' */
  theme?: Theme | 'auto';
  /** component styling — yours, not part of presets */
  fill?: string;
  border?: Partial<BorderConfig>;
  radius?: number | string;
  kind?: Kind;
  fps?: FpsMode;
  paused?: boolean;
  /** clip the bloom to the component's rounded box (no outward spill). default false */
  bloomClip?: boolean;
  settings?: GlassSettingsPatch;
  settingsByTheme?: Partial<Record<Theme, GlassSettingsPatch>>;
  className?: string;
  style?: React.CSSProperties;
}

function useResolvedTheme(theme: Theme | 'auto'): Theme {
  const get = React.useCallback((): Theme => {
    if (theme !== 'auto') return theme;
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, [theme]);

  const [resolved, setResolved] = React.useState<Theme>(get);

  React.useEffect(() => {
    setResolved(get());
    if (theme !== 'auto' || typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme, get]);

  return resolved;
}

export function GlassFx({
  children,
  preset,
  effect,
  effectParams,
  theme = 'auto',
  fill,
  border,
  radius,
  kind,
  fps = 30,
  paused = false,
  bloomClip = false,
  settings,
  settingsByTheme,
  className,
  style,
}: GlassFxProps): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<GlassInstance | null>(null);
  const resolvedTheme = useResolvedTheme(theme);

  // resolution order: explicit props > preset > effect/theme defaults
  const resolvedEffect: EffectId = effect ?? preset?.effect ?? 'panes';
  const mergedParams: Partial<EffectParams> | undefined =
    preset?.effectParams || effectParams
      ? { ...preset?.effectParams, ...effectParams }
      : undefined;
  const effSettings = (t: Theme): GlassSettings =>
    mergeSettings(
      mergeSettings(mergeSettings(DEFAULT_SETTINGS[t], preset?.settings), settings),
      settingsByTheme?.[t],
    );

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const g = createGlass(ref.current, {
      effect: resolvedEffect,
      effectParams: mergedParams,
      theme: resolvedTheme,
      fill,
      border,
      radius,
      kind,
      fps,
      paused,
      bloomClip,
      settings: effSettings(resolvedTheme),
    });
    inst.current = g;
    return () => {
      g.destroy();
      inst.current = null;
    };
    // create once; prop changes are synced by the effects below
  }, []);

  React.useEffect(() => {
    // setEffect resets to the effect's theme defaults; re-apply the resolved overrides
    inst.current?.setEffect(resolvedEffect);
    if (mergedParams) inst.current?.setEffectParams(mergedParams);
  }, [resolvedEffect]);

  React.useEffect(() => {
    if (mergedParams) inst.current?.setEffectParams(mergedParams);
  }, [JSON.stringify(mergedParams)]);

  React.useEffect(() => {
    // the preset's params persist through this automatically (overrides are
    // constant across themes); only the merged settings need re-deriving
    inst.current?.setTheme(resolvedTheme);
    inst.current?.update(effSettings(resolvedTheme));
    if (fill != null) inst.current?.setFill(fill);
  }, [resolvedTheme]);

  React.useEffect(() => {
    if (fill != null) inst.current?.setFill(fill);
  }, [fill]);

  React.useEffect(() => {
    if (border) inst.current?.setBorder(border);
  }, [JSON.stringify(border)]);

  React.useEffect(() => {
    inst.current?.setPaused(paused);
  }, [paused]);

  React.useEffect(() => {
    inst.current?.setFps(fps);
  }, [fps]);

  React.useEffect(() => {
    inst.current?.setBloomClip(bloomClip);
  }, [bloomClip]);

  React.useEffect(() => {
    inst.current?.update(effSettings(resolvedTheme));
  }, [JSON.stringify(settings), JSON.stringify(settingsByTheme), JSON.stringify(preset?.settings)]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
