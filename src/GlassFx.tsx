// React wrapper over the vanilla core. SSR-safe: the WebGL instance is only created
// in a layout effect (client-only); the server renders a plain wrapper + children.

import * as React from 'react';
import { createGlass } from './core';
import { DEFAULT_SETTINGS, mergeSettings } from './engine/settings';
import { EFFECTS, mergeEffectParams } from './engine/effects';
import type { EffectId, EffectParams, FpsMode, GlassInstance, GlassSettings, Theme } from './types';

export interface GlassFxProps {
  children?: React.ReactNode;
  /** base shader. default 'panes' */
  effect?: EffectId;
  /** shader params, merged onto the effect's theme defaults */
  effectParams?: Partial<EffectParams>;
  /** 'dark' | 'light' | 'auto' (follows prefers-color-scheme). default 'auto' */
  theme?: Theme | 'auto';
  fill?: string;
  radius?: number | string;
  fps?: FpsMode;
  paused?: boolean;
  settings?: Partial<GlassSettings>;
  settingsByTheme?: Partial<Record<Theme, Partial<GlassSettings>>>;
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

function effectiveSettings(
  theme: Theme,
  settings?: Partial<GlassSettings>,
  settingsByTheme?: Partial<Record<Theme, Partial<GlassSettings>>>,
): Partial<GlassSettings> {
  return mergeSettings(mergeSettings(DEFAULT_SETTINGS[theme], settings), settingsByTheme?.[theme]);
}

export function GlassFx({
  children,
  effect = 'panes',
  effectParams,
  theme = 'auto',
  fill,
  radius,
  fps = 'default',
  paused = false,
  settings,
  settingsByTheme,
  className,
  style,
}: GlassFxProps): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<GlassInstance | null>(null);
  const resolvedTheme = useResolvedTheme(theme);

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const g = createGlass(ref.current, {
      effect,
      effectParams,
      theme: resolvedTheme,
      fill,
      radius,
      fps,
      paused,
      settings: effectiveSettings(resolvedTheme, settings, settingsByTheme),
    });
    inst.current = g;
    return () => {
      g.destroy();
      inst.current = null;
    };
    // create once; prop changes are synced by the effects below
  }, []);

  React.useEffect(() => {
    inst.current?.setEffect(effect);
    if (effectParams) inst.current?.setEffectParams(mergeEffectParams(EFFECTS[effect].defaults[resolvedTheme], effectParams));
  }, [effect]);

  React.useEffect(() => {
    if (effectParams) inst.current?.setEffectParams(effectParams);
  }, [JSON.stringify(effectParams)]);

  React.useEffect(() => {
    inst.current?.setTheme(resolvedTheme);
    inst.current?.update(effectiveSettings(resolvedTheme, settings, settingsByTheme));
    if (fill != null) inst.current?.setFill(fill);
  }, [resolvedTheme]);

  React.useEffect(() => {
    if (fill != null) inst.current?.setFill(fill);
  }, [fill]);

  React.useEffect(() => {
    inst.current?.setPaused(paused);
  }, [paused]);

  React.useEffect(() => {
    inst.current?.setFps(fps);
  }, [fps]);

  React.useEffect(() => {
    inst.current?.update(effectiveSettings(resolvedTheme, settings, settingsByTheme));
  }, [JSON.stringify(settings), JSON.stringify(settingsByTheme)]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
