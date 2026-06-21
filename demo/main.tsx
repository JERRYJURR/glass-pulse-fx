import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FilePlus,
  FolderPlus,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Settings2,
  Sparkles,
  Sun,
  Upload,
  Zap,
  X,
} from 'lucide-react';
import '@fontsource/public-sans/300.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/overpass-mono/400.css';
import '@fontsource/overpass-mono/500.css';
import '@fontsource/overpass-mono/600.css';
import { Agentation } from 'agentation';
import './style.css';

import { VELOCITY_PRESETS } from '../src/core';
import type { EffectParams, FpsMode, Kind, Theme } from '../src/core';
import { GlassFx } from '../src/GlassFx';
import {
  activePreset,
  allPresets,
  clone,
  defaultPreset,
  isDirty,
  libPresets,
  loadState,
  lookFromPreset,
  normalizeFps,
  presetFromLook,
  saveState,
} from './model';
import type { DemoPreset, DemoState, PaletteRow, WorkingLook } from './model';

type TabId = 'install' | 'playground';
type SnapPoint = 'partial' | 'full';
type CopyKind = 'react' | 'vanilla' | 'preset';

const heroCopy = 'Frosted glass UI component with rich animated backlighting.';

const tabItems: { id: TabId; label: string }[] = [
  { id: 'install', label: 'Install' },
  { id: 'playground', label: 'Playground' },
];

const motionModes = [
  { label: 'Linear', value: 0 },
  { label: 'Center', value: 1 },
  { label: 'Radial', value: 2 },
  { label: 'Orbit', value: 3 },
];

const fpsModes: FpsMode[] = [15, 30, 60];

const copySpring = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
} as const;

function syncPalette(look: WorkingLook): void {
  const enabled = look.palette.filter((row) => row.on);
  look.effectParams.colors = (enabled.length ? enabled : [look.palette[0]]).map((row) => row.color);
}

function setNumberPath(root: unknown, path: string, value: number): void {
  const parts = path.split('.');
  let target = root as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] as Record<string, unknown>;
  target[parts[parts.length - 1]] = value;
}

function paramNumber(look: WorkingLook, key: keyof EffectParams): number {
  const value = look.effectParams[key];
  return typeof value === 'number' ? value : 0;
}

function setParamNumber(look: WorkingLook, key: keyof EffectParams, value: number): void {
  (look.effectParams as unknown as Record<keyof EffectParams, unknown>)[key] = value;
}

const px0 = (value: number) => `${value.toFixed(0)}px`;
const px1 = (value: number) => `${value.toFixed(1)}px`;
const pct0 = (value: number) => `${Math.round(value * 100)}%`;
const f2 = (value: number) => value.toFixed(2);
const deg = (value: number) => `${value.toFixed(0)}deg`;

const tsLiteral = (value: unknown): string =>
  JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, '$1:')
    .replace(/"/g, "'");

function presetIdent(name: string): string {
  const raw = name
    .replace(/[^A-Za-z0-9]+([A-Za-z0-9])/g, (_match, char: string) => char.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, '');
  const ident = raw.charAt(0).toLowerCase() + raw.slice(1);
  return /^[a-z]/.test(ident) && ident !== 'default' ? ident : 'myLook';
}

function codeFor(kind: CopyKind, state: DemoState): string {
  const active = activePreset(state);
  const ident = presetIdent(active.data.name);
  const currentPreset = presetFromLook(state.working, active.data.name);

  if (kind === 'vanilla') {
    return `import { createGlass } from 'glass-pulse-fx/core';
import type { GlassPreset } from 'glass-pulse-fx/core';

const ${ident}: GlassPreset = ${tsLiteral(currentPreset)};

const glass = createGlass(document.querySelector('#target')!, {
  preset: ${ident},
  theme: '${state.theme}',
});
`;
  }

  if (kind === 'preset') {
    return `import type { GlassPreset } from 'glass-pulse-fx';

export const ${ident}: GlassPreset = ${tsLiteral(currentPreset)};
`;
  }

  return `import { GlassFx } from 'glass-pulse-fx';
import type { GlassPreset } from 'glass-pulse-fx';

const ${ident}: GlassPreset = ${tsLiteral(currentPreset)};

export function Example() {
  return (
    <GlassFx preset={${ident}} radius={12}>
      <button className="your-button">Your component</button>
    </GlassFx>
  );
}
`;
}

function Wordmark(): React.JSX.Element {
  return (
    <svg className="wordmark" xmlns="http://www.w3.org/2000/svg" viewBox="-6.735 35.018 100.004 24.007" aria-label="Glass Pulse FX">
      <path
        fill="currentColor"
        d="M-1.034 59.485c-1.153 0-2.183-0.505-3.091-1.516-0.908-1.01-1.617-2.436-2.126-4.275-0.51-1.843-0.764-3.961-0.766-6.357s0.254-4.514 0.766-6.356c0.51-1.843 1.219-3.267 2.126-4.275C-3.216 35.698-2.187 35.193-1.034 35.193c0.487 0 0.898 0.039 1.23 0.117 0.332 0.077 0.71 0.205 1.131 0.382 0.531 0.221 0.985 0.377 1.362 0.465l0.93 5.592-0.333 0.067-0.233-0.567c-0.555-1.308-1.019-2.313-1.396-3.012-0.378-0.7-0.775-1.214-1.198-1.548-0.422-0.332-0.919-0.5-1.496-0.499-0.929 0-1.683 0.377-2.259 1.132-0.576 0.755-1.008 1.947-1.296 3.579-0.29 1.63-0.432 3.778-0.433 6.439s0.138 4.809 0.413 6.44c0.275 1.63 0.71 2.823 1.297 3.578 0.587 0.755 1.347 1.132 2.276 1.133 1.086 0 1.873-0.817 2.361-2.447 0.487-1.63 0.754-4.187 0.797-7.669-0.531-0.444-1.429-0.787-2.693-1.032v-0.333h4.355v12.445h-0.332l-1.297-7.122h1.032l-0.332 2.395c-0.311 1.486-0.804 2.651-1.48 3.494-0.677 0.843-1.479 1.265-2.411 1.266ZM4.727 58.655c0.311-0.088 0.541-0.184 0.698-0.281 0.154-0.101 0.311-0.26 0.465-0.481V37.522l-1.429 1.065-0.234-0.264L7.053 35.36h0.332v22.529c0.154 0.221 0.311 0.383 0.465 0.481 0.154 0.101 0.388 0.194 0.697 0.283v0.332h-3.824v-0.332ZM10.791 59.485c-0.465 0-0.871-0.194-1.213-0.583-0.343-0.389-0.516-0.925-0.515-1.613 0-1.154 0.414-2.268 1.246-3.345 0.831-1.077 2.055-2.291 3.672-3.645l1.963-1.629 0.166 0.332-2.126 1.863c-1.173 1.042-2.04 2.013-2.593 2.911-0.555 0.899-0.831 1.76-0.831 2.58 0 0.864 0.443 1.298 1.332 1.297 0.531 0 1.19-0.327 1.978-0.981 0.785-0.653 1.556-1.425 2.31-2.313l0.233 0.266c-1.219 1.443-2.161 2.502-2.825 3.18-0.664 0.678-1.192 1.128-1.58 1.347-0.388 0.221-0.791 0.332-1.214 0.333ZM16.775 59.485c-0.399 0-0.694-0.215-0.882-0.648-0.188-0.434-0.281-1.103-0.281-2.013v-11.116c0-0.931-0.05-1.564-0.149-1.896-0.101-0.332-0.338-0.5-0.715-0.5-0.355 0-0.791 0.234-1.311 0.7-0.52 0.465-1.076 1.143-1.663 2.031-0.587 0.888-1.136 1.92-1.646 3.094h-0.332l1.03-4.392c0.265-0.154 0.764-0.465 1.496-0.931 0.863-0.553 1.551-0.965 2.059-1.23 0.51-0.266 0.975-0.399 1.398-0.399 0.553 0 0.913 0.133 1.08 0.399 0.167 0.266 0.25 0.787 0.25 1.563v11.48c0 0.598 0.05 1.032 0.15 1.298 0.101 0.266 0.295 0.399 0.581 0.399s0.603-0.139 0.948-0.418c0.343-0.276 0.814-0.715 1.413-1.314l0.232 0.235-0.631 0.832c-0.754 1.021-1.367 1.747-1.846 2.18-0.479 0.434-0.871 0.649-1.179 0.649ZM25.102 59.485c-0.355 0-0.647-0.032-0.88-0.101-0.234-0.066-0.526-0.168-0.882-0.301-0.355-0.154-0.643-0.266-0.864-0.332-0.221-0.066-0.5-0.101-0.831-0.101l-1.828-5.724 0.301-0.133c1.041 2.242 2.001 3.778 2.876 4.61 0.877 0.832 1.744 1.247 2.61 1.247 0.399 0 0.72-0.139 0.964-0.415 0.244-0.276 0.366-0.67 0.366-1.18 0-0.843-0.271-1.701-0.814-2.579-0.545-0.874-1.357-1.98-2.443-3.313-1.107-1.353-1.938-2.473-2.495-3.361-0.555-0.888-0.831-1.763-0.83-2.629 0-0.931 0.25-1.664 0.749-2.196 0.5-0.532 1.213-0.798 2.142-0.797 0.399 0 0.741 0.032 1.031 0.101 0.287 0.066 0.553 0.143 0.797 0.233 0.576 0.199 1.086 0.344 1.529 0.434l1.495 4.658-0.3 0.133c-0.754-1.332-1.414-2.34-1.978-3.028-0.566-0.688-1.076-1.143-1.529-1.364-0.453-0.221-0.938-0.332-1.445-0.332-0.422 0-0.749 0.112-0.98 0.332-0.234 0.221-0.349 0.532-0.348 0.93 0 0.731 0.265 1.521 0.796 2.364 0.531 0.843 1.341 1.92 2.428 3.227 1.132 1.374 1.984 2.523 2.56 3.446 0.576 0.92 0.863 1.792 0.863 2.614 0 1.042-0.254 1.896-0.765 2.563-0.51 0.665-1.274 0.997-2.295 0.997ZM33.688 59.485c-0.355 0-0.647-0.032-0.882-0.101-0.234-0.066-0.526-0.168-0.881-0.301-0.355-0.154-0.643-0.266-0.863-0.332-0.221-0.066-0.5-0.101-0.831-0.101l-1.827-5.724 0.299-0.133c1.041 2.242 2.001 3.778 2.877 4.61 0.877 0.832 1.744 1.247 2.611 1.247 0.399 0 0.72-0.139 0.963-0.415 0.244-0.276 0.366-0.67 0.367-1.18 0-0.843-0.271-1.701-0.817-2.579-0.545-0.874-1.357-1.98-2.443-3.313-1.107-1.353-1.938-2.473-2.493-3.361-0.555-0.888-0.831-1.763-0.831-2.629 0-0.931 0.25-1.664 0.75-2.196 0.5-0.532 1.213-0.798 2.142-0.797 0.399 0 0.741 0.032 1.031 0.101 0.287 0.066 0.553 0.143 0.796 0.233 0.576 0.199 1.086 0.344 1.529 0.434l1.496 4.658-0.3 0.133c-0.754-1.332-1.414-2.34-1.979-3.028-0.566-0.688-1.076-1.143-1.529-1.364-0.453-0.221-0.938-0.332-1.445-0.332-0.422 0-0.749 0.112-0.979 0.332-0.234 0.221-0.349 0.532-0.349 0.93 0 0.731 0.265 1.521 0.797 2.364 0.531 0.843 1.341 1.92 2.427 3.227 1.132 1.374 1.984 2.523 2.561 3.446 0.576 0.92 0.863 1.792 0.862 2.614 0 1.042-0.254 1.896-0.765 2.563-0.51 0.665-1.274 0.997-2.294 0.997ZM36.965 58.655c0.332-0.112 0.603-0.239 0.816-0.383 0.209-0.143 0.393-0.362 0.549-0.649V37.056c-0.154-0.287-0.338-0.505-0.549-0.648-0.209-0.143-0.481-0.271-0.816-0.382v-0.334h4.422c1.639 0 2.995 0.516 4.07 1.548 1.076 1.032 1.612 2.457 1.612 4.275 0 1.664-0.322 3.106-0.963 4.326-0.643 1.22-1.479 2.14-2.509 2.762-1.029 0.622-2.101 0.931-3.209 0.931h-0.399v8.087c0.154 0.29 0.338 0.505 0.55 0.649 0.209 0.143 0.481 0.271 0.817 0.383v0.332h-4.388v-0.332ZM40.423 48.537c0.841 0 1.623-0.221 2.342-0.665 0.72-0.444 1.297-1.12 1.729-2.031 0.432-0.909 0.647-2.041 0.648-3.395s-0.178-2.518-0.531-3.361c-0.355-0.843-0.837-1.452-1.445-1.829-0.61-0.377-1.336-0.567-2.178-0.567h-0.996v11.848h0.433ZM50.37 59.32c-0.576 0-0.998-0.149-1.263-0.449-0.265-0.301-0.399-0.817-0.398-1.547v-12.812l-1.429 1.065-0.234-0.265 2.826-2.962h0.332v12.945c0 0.888 0.081 1.502 0.248 1.847 0.167 0.344 0.469 0.516 0.915 0.516 0.664 0 1.458-0.354 2.376-1.063 0.919-0.71 1.857-1.564 2.809-2.563l0.234 0.367c-0.975 1.109-2.138 2.207-3.49 3.294-1.351 1.087-2.326 1.63-2.926 1.629ZM55.687 59.32v-14.808l-1.429 1.065-0.233-0.265 2.825-2.962h0.333v14.742l1.428-1 0.234 0.266-2.825 2.962h-0.333ZM58.83 58.655c0.311-0.088 0.541-0.184 0.699-0.281 0.154-0.101 0.311-0.26 0.465-0.481V37.522l-1.429 1.065-0.233-0.264 2.825-2.963h0.332v22.529c0.154 0.221 0.311 0.383 0.465 0.481 0.154 0.101 0.388 0.194 0.698 0.283v0.332h-3.822v-0.332ZM68.088 59.485c-0.355 0-0.647-0.032-0.881-0.101-0.234-0.066-0.526-0.168-0.882-0.301-0.355-0.154-0.643-0.266-0.862-0.332-0.221-0.066-0.5-0.101-0.832-0.101l-1.827-5.724 0.299-0.133c1.041 2.242 2.001 3.778 2.877 4.61 0.877 0.832 1.744 1.247 2.61 1.247 0.399 0 0.72-0.139 0.963-0.415 0.244-0.276 0.366-0.67 0.368-1.18 0-0.843-0.271-1.701-0.816-2.579-0.545-0.874-1.357-1.98-2.443-3.313-1.107-1.353-1.938-2.473-2.494-3.361-0.555-0.888-0.831-1.763-0.831-2.629 0-0.931 0.25-1.664 0.749-2.196 0.5-0.532 1.213-0.798 2.143-0.797 0.399 0 0.741 0.032 1.031 0.101 0.287 0.066 0.553 0.143 0.796 0.233 0.576 0.199 1.086 0.344 1.531 0.434l1.494 4.658-0.3 0.133c-0.754-1.332-1.414-2.34-1.979-3.028-0.566-0.688-1.076-1.143-1.529-1.364-0.453-0.221-0.938-0.332-1.447-0.332-0.422 0-0.749 0.112-0.98 0.332-0.234 0.221-0.349 0.532-0.348 0.93 0 0.731 0.265 1.521 0.797 2.364 0.531 0.843 1.341 1.92 2.427 3.227 1.132 1.374 1.984 2.523 2.56 3.446 0.576 0.92 0.863 1.792 0.863 2.614 0 1.042-0.254 1.896-0.764 2.563-0.51 0.665-1.274 0.997-2.295 0.997ZM76.368 59.485c-0.841 0-1.617-0.372-2.327-1.115-0.71-0.741-1.28-1.818-1.712-3.227-0.432-1.409-0.647-3.079-0.647-5.009 0-2.528 0.372-4.488 1.113-5.872 0.741-1.386 1.79-2.08 3.14-2.08 0.754 0 1.445 0.327 2.077 0.981 0.632 0.653 1.132 1.552 1.494 2.696 0.366 1.143 0.56 2.414 0.582 3.81h-7.181c0.087 1.709 0.326 3.18 0.715 4.41 0.388 1.231 0.874 2.164 1.464 2.795 0.587 0.633 1.213 0.95 1.877 0.949 0.487 0 0.942-0.184 1.363-0.55 0.419-0.367 0.841-0.925 1.264-1.681 0.419-0.755 0.898-1.763 1.428-3.028l0.332 0.067c-0.863 2.462-1.694 4.222-2.493 5.274-0.796 1.053-1.629 1.582-2.493 1.583ZM72.878 49.337l-0.499-0.499h5.952c-0.066-1.64-0.343-2.997-0.831-4.06-0.489-1.066-1.107-1.597-1.861-1.599-1.84 0-2.759 1.742-2.761 5.225v0.93ZM81.889 43.142V35.631h4.377v0.782h-3.439v2.504h3.126v0.782h-3.126v3.443h-0.938ZM87.391 43.142l2.419-3.797-2.419-3.714h1.129l1.977 3.151 1.896-3.151h1.128l-2.419 3.714 2.419 3.797h-1.128l-1.896-3.068-1.977 3.068h-1.129Z"
      />
    </svg>
  );
}

function GoogleLogo(): React.JSX.Element {
  return (
    <svg viewBox="4 4 16 16" width="16" height="16" aria-hidden="true">
      <path d="M18.688 12.159c0-.494-.044-.969-.126-1.425H12v2.697h3.75c-.165.868-.658 1.602-1.4 2.097v1.755h2.26c1.318-1.216 2.078-3.002 2.078-5.124z" fill="#4285F4" />
      <path d="M12 18.967c1.881 0 3.458-.621 4.61-1.684l-2.26-1.755c-.621.418-1.412.671-2.35.671-1.811 0-3.35-1.222-3.902-2.868H5.781v1.798C6.927 17.403 9.277 18.967 12 18.967z" fill="#34A853" />
      <path d="M8.098 13.324c-.139-.418-.222-.862-.221-1.324s.082-.906.221-1.324V8.878H5.781C5.306 9.815 5.034 10.873 5.034 12s.272 2.185.747 3.123l1.805-1.407.512-.392z" fill="#FBBC05" />
      <path d="M12 7.807c1.026 0 1.938.354 2.666 1.04l1.996-1.996C15.451 5.724 13.881 5.034 12 5.034 9.277 5.034 6.927 6.598 5.781 8.878l2.317 1.798C8.649 9.03 10.188 7.807 12 7.807z" fill="#EA4335" />
    </svg>
  );
}

function AppleLogo(): React.JSX.Element {
  return (
    <svg viewBox="4 4 16 16" width="16" height="16" aria-hidden="true">
      <path d="M12.101 8.597c-.632 0-1.61-.719-2.64-.693-1.36.018-2.607.789-3.307 2.009-1.411 2.45-.364 6.069 1.013 8.06.675.969 1.472 2.06 2.528 2.026 1.013-.043 1.393-.658 2.623-.658 1.221 0 1.567.658 2.64.632 1.091-.017 1.784-.987 2.451-1.965.771-1.125 1.091-2.217 1.108-2.277-.026-.009-2.121-.814-2.147-3.238-.017-2.027 1.653-2.996 1.731-3.039-.953-1.393-2.415-1.549-2.926-1.584-1.333-.104-2.45.727-3.074.727zM14.353 6.553c.562-.675.933-1.618.83-2.553-.805.035-1.775.537-2.354 1.212-.52.597-.969 1.559-.849 2.476.892.069 1.81-.459 2.373-1.134" fill="currentColor" />
    </svg>
  );
}

function GithubLogo({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg viewBox="2 2 20 20" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.247C6.475 2.247 2 6.725 2 12.247c0 4.42 2.865 8.167 6.837 9.488.5.094.684-.215.684-.481 0-.237-.009-.867-.013-1.7-2.781.603-3.368-1.342-3.368-1.342-.455-1.154-1.113-1.462-1.113-1.462-.905-.62.07-.608.07-.608 1.005.07 1.532 1.03 1.532 1.03.892 1.53 2.341 1.088 2.913.832.09-.647.347-1.087.633-1.337-2.221-.25-4.555-1.11-4.555-4.942 0-1.092.387-1.983 1.029-2.683-.112-.253-.45-1.27.088-2.647 0 0 .837-.268 2.75 1.025a9.578 9.578 0 0 1 2.5-.338c.85.005 1.7.115 2.5.338 1.9-1.293 2.737-1.025 2.737-1.025.538 1.377.2 2.394.1 2.647.638.7 1.025 1.591 1.025 2.683 0 3.842-2.337 4.687-4.562 4.933.35.3.675.914.675 1.85 0 1.339-.013 2.414-.013 2.739 0 .262.175.575.688.475C19.137 20.41 22 16.66 22 12.247 22 6.725 17.522 2.247 12 2.247"
      />
    </svg>
  );
}

interface PresetPickerProps {
  state: DemoState;
  dirty: boolean;
  onSelect: (id: string) => void;
  onReset: () => void;
  compact?: boolean;
}

function PresetPicker({ state, dirty, onSelect, onReset, compact = false }: PresetPickerProps): React.JSX.Element {
  const presets = allPresets(state);
  const active = activePreset(state);
  return (
    <div className={compact ? 'preset-block preset-block--compact' : 'preset-block'}>
      <div className="preset-select-field">
        <span className="preset-muted">Preset:</span>
        <span>{active.data.name}</span>
        <select value={state.activeId} onChange={(event) => onSelect(event.currentTarget.value)} aria-label="Preset">
          <optgroup label="Library">
            {libPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.data.name}</option>
            ))}
          </optgroup>
          {state.presets.length > 0 && (
            <optgroup label="My presets">
              {state.presets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.data.name}</option>
              ))}
            </optgroup>
          )}
          {!presets.length && <option value={defaultPreset.id}>{defaultPreset.data.name}</option>}
        </select>
        <ChevronDown size={12} aria-hidden="true" />
      </div>
      {!compact && dirty && (
        <div className="preset-meta-row">
          <span>Edited</span>
          <button type="button" onClick={onReset}>
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface TabsProps {
  value: TabId;
  onChange: (value: TabId) => void;
}

function Tabs({ value, onChange }: TabsProps): React.JSX.Element {
  return (
    <div className="tabs" role="tablist" aria-label="Homepage sections">
      {tabItems.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            className="tab"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
          >
            {active && <motion.span className="tab-indicator" layoutId="tab-indicator" transition={copySpring} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface CopyButtonProps {
  label: string;
  getText: () => string;
  className?: string;
  children?: React.ReactNode;
}

function CopyButton({ label, getText, className = 'copy-button', children }: CopyButtonProps): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);

  async function onCopy(): Promise<void> {
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.button
      className={className}
      type="button"
      aria-label={copied ? 'Copied' : label}
      title={label}
      whileTap={{ scale: 0.96 }}
      transition={copySpring}
      onClick={() => void onCopy()}
    >
      {children}
      <span className="copy-icon">
        <AnimatePresence mode="popLayout" initial={false}>
          {copied ? (
            <motion.span key="check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
              <Check size={16} />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
              <Copy size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

interface InstallContentProps {
  state: DemoState;
}

function InstallContent({ state }: InstallContentProps): React.JSX.Element {
  return (
    <div className="install-panel">
      <div className="install-block">
        <div className="block-label">Installation</div>
        <div className="code-card">
          <code>npm install glass-pulse-fx</code>
          <CopyButton label="Copy install command" getText={() => 'npm install glass-pulse-fx'} />
        </div>
      </div>
      <div className="install-block">
        <div className="block-label">Use this preset</div>
        <div className="code-card code-card--tall">
          <pre>{codeFor('react', state)}</pre>
          <CopyButton label="Copy React snippet" getText={() => codeFor('react', state)} />
        </div>
      </div>
    </div>
  );
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

interface NumberFieldProps {
  value: number;
  min: number;
  max: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  fixed?: boolean;
  /** field displays as a percentage (e.g. 0.5 -> "50%"), so typed input is read as a percent too */
  percent?: boolean;
}

// Width of the drag-to-scrub zone on each side of the field. Clicking the middle behaves
// like a normal text input; only the left/right edges start a scrub.
const SCRUB_EDGE = 10;

function nearEdge(el: HTMLInputElement, clientX: number): boolean {
  const rect = el.getBoundingClientRect();
  return clientX - rect.left <= SCRUB_EDGE || rect.right - clientX <= SCRUB_EDGE;
}

function NumberField({ value, min, max, format, onChange, fixed = false, percent = false }: NumberFieldProps): React.JSX.Element {
  const [draft, setDraft] = React.useState<string | null>(null);
  const drag = React.useRef({ x: 0, v: 0, active: false });

  function onPointerDown(event: React.PointerEvent<HTMLInputElement>): void {
    if (event.button !== 0) return;
    // Scrub only from the borders; a click in the body is a plain text-input click.
    if (!nearEdge(event.currentTarget, event.clientX)) return;
    event.preventDefault();
    drag.current = { x: event.clientX, v: value, active: false };
    const snap = max - min >= 50 ? 1 : 0.01;
    const span = max - min;
    const move = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - drag.current.x;
      if (!drag.current.active) {
        if (Math.abs(dx) < 3) return;
        drag.current.active = true;
        document.body.style.cursor = 'ew-resize';
      }
      moveEvent.preventDefault();
      onChange(clamp(Math.round((drag.current.v + (dx / 180) * span) / snap) * snap, min, max));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <input
      className={fixed ? 'num-box num-box--fixed' : 'num-box'}
      type="text"
      inputMode="decimal"
      value={draft ?? format(value)}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        // hint the scrub affordance: ew-resize on the edges, text cursor in the body
        if (drag.current.active) return;
        event.currentTarget.style.cursor = nearEdge(event.currentTarget, event.clientX) ? 'ew-resize' : 'text';
      }}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        setDraft(raw);
        const num = Number.parseFloat(raw.replace(/[^0-9.+-]/g, ''));
        if (Number.isFinite(num)) onChange(clamp(percent ? num / 100 : num, min, max));
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

interface NumberSpec {
  label: string;
  value: number;
  min: number;
  max: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  percent?: boolean;
}

function PairRow({ left, right }: { left: NumberSpec; right?: NumberSpec }): React.JSX.Element {
  return (
    <div className="pair-row">
      {[left, right].map((field, index) =>
        field ? (
          <label className="pair-cell" key={field.label}>
            <span className="ctl-label">{field.label}</span>
            <NumberField value={field.value} min={field.min} max={field.max} format={field.format} onChange={field.onChange} percent={field.percent} />
          </label>
        ) : (
          <span className="pair-cell" key={`empty-${index}`} aria-hidden="true" />
        ),
      )}
    </div>
  );
}

interface SliderSpec extends NumberSpec {
  step: number;
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderSpec): React.JSX.Element {
  const fill = max > min ? (value - min) / (max - min) : 0;
  return (
    <div className="slider-row">
      <span className="ctl-label">{label}</span>
      <NumberField value={value} min={min} max={max} format={format} onChange={onChange} fixed />
      <input
        className="track"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': fill } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

interface DropdownProps {
  label: string;
  value: number;
  options: { label: string; value: number }[];
  onChange: (value: number) => void;
}

function DropdownRow({ label, value, options, onChange }: DropdownProps): React.JSX.Element {
  return (
    <label className="dropdown-row">
      <span className="ctl-label">{label}</span>
      <div className="dropdown">
        <select value={value} onChange={(event) => onChange(Number(event.currentTarget.value))}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown size={12} aria-hidden="true" />
      </div>
    </label>
  );
}

type SegValue = number | string | boolean;

interface SegRowProps {
  label: string;
  value: SegValue;
  options: { label: string; value: SegValue }[];
  onChange: (value: SegValue) => void;
}

function SegRow({ label, value, options, onChange }: SegRowProps): React.JSX.Element {
  return (
    <div className="seg-row">
      <span className="ctl-label">{label}</span>
      <div className="seg">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              className={active ? 'is-active' : ''}
              onClick={() => onChange(option.value)}
            >
              {active && <motion.span className="seg-indicator" layoutId={`seg-${label}`} transition={copySpring} />}
              <span className="seg-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(raw: string): string | null {
  let v = raw.trim().replace(/[^#0-9a-fA-F]/g, '');
  if (v && !v.startsWith('#')) v = `#${v}`;
  if (!HEX_RE.test(v)) return null;
  const body = v.slice(1);
  const full = body.length === 3 ? body.split('').map((c) => c + c).join('') : body;
  return `#${full.toLowerCase()}`;
}

// Editable hex field: type or paste a value; applies live when valid, reverts on blur if not.
function HexInput({ value, onChange }: { value: string; onChange: (value: string) => void }): React.JSX.Element {
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <input
      className="palette-hex"
      type="text"
      spellCheck={false}
      autoComplete="off"
      value={draft ?? value}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        setDraft(raw);
        const hex = normalizeHex(raw);
        if (hex) onChange(hex);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

interface PaletteControlProps {
  rows: PaletteRow[];
  onColor: (index: number, value: string) => void;
  onToggle: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

function PaletteControl({ rows, onColor, onToggle, onDelete, onAdd }: PaletteControlProps): React.JSX.Element {
  const enabledCount = rows.filter((row) => row.on).length;
  return (
    <div className="palette-control">
      <div className="group-heading">
        <span className="palette-heading">
          <span>Colors</span>
          <span className="palette-count">{rows.length}/5</span>
        </span>
        <button type="button" className="tiny-button" disabled={rows.length >= 5} onClick={onAdd} aria-label="Add color">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>
      <div className="palette-list">
        {rows.map((row, index) => {
          const canDisable = !row.on || enabledCount > 1;
          const canDelete = rows.length > 1 && (!row.on || enabledCount > 1);
          return (
            <div className={row.on ? 'palette-row' : 'palette-row is-off'} key={`${row.color}-${index}`}>
              <div className="palette-value">
                <label className="palette-swatch" title="Pick color">
                  <span style={{ backgroundColor: row.color }} />
                  <input type="color" value={row.color} onChange={(event) => onColor(index, event.currentTarget.value)} />
                </label>
                <HexInput value={row.color} onChange={(value) => onColor(index, value)} />
              </div>
              <button type="button" className="icon-button" title={row.on ? 'Hide color' : 'Show color'} disabled={!canDisable} onClick={() => onToggle(index)}>
                {row.on ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button type="button" className="icon-button" title="Remove color" disabled={!canDelete} onClick={() => onDelete(index)}>
                <Minus size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ControlGroupProps {
  title: string;
  children: React.ReactNode;
}

function ControlGroup({ title, children }: ControlGroupProps): React.JSX.Element {
  return (
    <section className="control-group">
      <div className="group-heading">{title}</div>
      <div className="control-stack">{children}</div>
    </section>
  );
}

interface ControlsProps {
  state: DemoState;
  dirty: boolean;
  onSelectPreset: (id: string) => void;
  onResetPreset: () => void;
  mutate: (updater: (draft: DemoState) => void) => void;
}

function Controls({ state, mutate }: ControlsProps): React.JSX.Element {
  const look = state.working;
  const setParam = (key: keyof EffectParams) => (value: number) => mutate((draft) => setParamNumber(draft.working, key, value));
  const setGlass = (path: string) => (value: number) => mutate((draft) => setNumberPath(draft.working.settings, path, value));

  return (
    <div className="controls">
      <section className="control-group colors-group">
        <PaletteControl
          rows={look.palette}
          onColor={(index, value) => mutate((draft) => {
            draft.working.palette[index].color = value;
            syncPalette(draft.working);
          })}
          onToggle={(index) => mutate((draft) => {
            const enabledCount = draft.working.palette.filter((row) => row.on).length;
            const row = draft.working.palette[index];
            if (row.on && enabledCount === 1) return;
            row.on = !row.on;
            syncPalette(draft.working);
          })}
          onDelete={(index) => mutate((draft) => {
            const row = draft.working.palette[index];
            const enabledCount = draft.working.palette.filter((item) => item.on).length;
            if (draft.working.palette.length === 1 || (row.on && enabledCount === 1)) return;
            draft.working.palette.splice(index, 1);
            syncPalette(draft.working);
          })}
          onAdd={() => mutate((draft) => {
            if (draft.working.palette.length >= 5) return;
            draft.working.palette.push({ color: draft.working.palette[draft.working.palette.length - 1].color, on: true });
            syncPalette(draft.working);
          })}
        />
        <PairRow
          left={{ label: 'Spread', value: paramNumber(look, 'colorSpread'), min: 0, max: 6, format: f2, onChange: setParam('colorSpread') }}
          right={{ label: 'Skew', value: paramNumber(look, 'colorSkew'), min: 0, max: 6, format: f2, onChange: setParam('colorSkew') }}
        />
        <PairRow
          left={{ label: 'Drift', value: paramNumber(look, 'colorDrift'), min: -1, max: 1, format: f2, onChange: setParam('colorDrift') }}
          right={{ label: 'Brightness', value: paramNumber(look, 'bright'), min: 0, max: 2, format: f2, onChange: setParam('bright') }}
        />
      </section>
      <ControlGroup title="Effect">
        <DropdownRow
          label="Motion"
          value={Math.round(paramNumber(look, 'motion'))}
          options={motionModes}
          onChange={(value) => mutate((draft) => setParamNumber(draft.working, 'motion', value))}
        />
        <DropdownRow
          label="Easing"
          value={Math.round(paramNumber(look, 'velocity'))}
          options={VELOCITY_PRESETS.map((preset, index) => ({ label: preset.label, value: index }))}
          onChange={setParam('velocity')}
        />
        <SliderRow label="Speed" min={-2} max={2} step={0.01} value={paramNumber(look, 'speed')} format={f2} onChange={setParam('speed')} />
        <PairRow
          left={{ label: 'Density', value: paramNumber(look, 'scale'), min: 0.1, max: 4, format: f2, onChange: setParam('scale') }}
          right={{ label: 'Gap', value: paramNumber(look, 'interval'), min: 0, max: 0.9, format: pct0, onChange: setParam('interval'), percent: true }}
        />
        <PairRow
          left={{ label: 'Fade in', value: paramNumber(look, 'rampIn'), min: 0.01, max: 1, format: pct0, onChange: setParam('rampIn'), percent: true }}
          right={{ label: 'Fade out', value: paramNumber(look, 'rampOut'), min: 0.01, max: 1, format: pct0, onChange: setParam('rampOut'), percent: true }}
        />
        <PairRow
          left={{ label: 'Angle', value: paramNumber(look, 'angle'), min: 0, max: 360, format: deg, onChange: setParam('angle') }}
          right={{ label: 'Inset', value: look.settings.shaderInset, min: 0, max: 28, format: px0, onChange: setGlass('shaderInset') }}
        />
      </ControlGroup>
      <ControlGroup title="Glass">
        <SliderRow label="Opacity" min={0.3} max={1} step={0.02} value={look.settings.frost} format={f2} onChange={setGlass('frost')} />
        <PairRow
          left={{ label: 'Blur', value: look.settings.bgBlur, min: 0, max: 20, format: px1, onChange: setGlass('bgBlur') }}
          right={{ label: 'Inset', value: look.settings.frostInset, min: 0, max: 12, format: px1, onChange: setGlass('frostInset') }}
        />
      </ControlGroup>
      <ControlGroup title="Core">
        <SliderRow label="Opacity" min={0} max={1} step={0.02} value={look.settings.coreOpacity} format={f2} onChange={setGlass('coreOpacity')} />
        <PairRow
          left={{ label: 'Feather', value: look.settings.coreBlur, min: 0, max: 32, format: px0, onChange: setGlass('coreBlur') }}
          right={{ label: 'Inset', value: look.settings.coreInset, min: 0, max: 28, format: px0, onChange: setGlass('coreInset') }}
        />
        <SegRow
          label="Scaling"
          value={look.settings.coreProportional}
          options={[{ label: 'Fixed', value: false }, { label: 'Proportional', value: true }]}
          onChange={(value) => mutate((draft) => { draft.working.settings.coreProportional = Boolean(value); })}
        />
      </ControlGroup>
      <ControlGroup title="Inner bloom">
        <SliderRow label="Opacity" min={0} max={1} step={0.05} value={look.settings.innerBloom.level} format={f2} onChange={setGlass('innerBloom.level')} />
        <SliderRow label="Size" min={0} max={24} step={1} value={look.settings.innerBloom.size} format={px0} onChange={setGlass('innerBloom.size')} />
      </ControlGroup>
      <ControlGroup title="Outer bloom">
        <SliderRow label="Opacity" min={0} max={0.9} step={0.05} value={look.settings.outerBloom.level} format={f2} onChange={setGlass('outerBloom.level')} />
        <SliderRow label="Size" min={0} max={64} step={1} value={look.settings.outerBloom.size} format={px0} onChange={setGlass('outerBloom.size')} />
      </ControlGroup>
      <ControlGroup title="Performance">
        <SegRow
          label="FPS"
          value={state.fps}
          options={fpsModes.map((fps) => ({ label: String(fps), value: fps }))}
          onChange={(value) => mutate((draft) => { draft.fps = normalizeFps(Number(value)); })}
        />
        <SegRow
          label="Bloom"
          value={state.bloomClip}
          options={[{ label: 'Overflow', value: false }, { label: 'Clip', value: true }]}
          onChange={(value) => mutate((draft) => { draft.bloomClip = Boolean(value); })}
        />
      </ControlGroup>
    </div>
  );
}

function useNearViewport<T extends HTMLElement>(rootMargin = '700px'): [React.RefObject<T>, boolean] {
  const ref = React.useRef<T>(null);
  const [near, setNear] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, near];
}

function glassProps(state: DemoState) {
  return {
    theme: state.theme,
    effect: state.working.effect,
    effectParams: state.working.effectParams,
    settings: state.working.settings,
    // no fill/border — GlassFx inherits each card's own CSS (translucency flattened)
    fps: state.fps,
    bloomClip: state.bloomClip,
  };
}

interface GlassPreviewProps {
  state: DemoState;
  className: string;
  kind?: Kind;
  radius?: number | string;
  children: React.ReactNode;
}

// Shared hover/tap interaction so every mock lifts the same way (cards, pricing, seg pills).
const cardHover = {
  whileHover: { y: -4, scale: 1.012 },
  whileTap: { scale: 0.992 },
  transition: { type: 'spring' as const, stiffness: 360, damping: 30 },
};

function GlassPreview({ state, className, kind = 'card', radius = 16, children }: GlassPreviewProps): React.JSX.Element {
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const content = <div className="mock-content">{children}</div>;

  return (
    <motion.div ref={ref} className="mock-motion" {...cardHover}>
      {near ? (
        <GlassFx className={`mock-glass ${className}`} kind={kind} radius={radius} {...glassProps(state)}>
          {content}
        </GlassFx>
      ) : (
        <div className={`mock-glass mock-glass--static ${className}`}>{content}</div>
      )}
    </motion.div>
  );
}

interface PreviewItem {
  id: string;
  slotClass: string;
  render: (state: DemoState) => React.ReactNode;
}

const previewItems: PreviewItem[] = [
  {
    id: 'ask',
    slotClass: 'slot-ask',
    render: (state) => (
      <GlassPreview state={state} className="mock-ask" radius={16}>
        <div className="prompt-card">
          <div className="prompt-placeholder">Ask anything...</div>
          <div className="prompt-actions">
            <button type="button" aria-label="Add attachment"><Plus size={16} /></button>
            <button type="button" aria-label="Preview"><Eye size={16} /></button>
            <span className="prompt-spacer" />
            <button type="button" aria-label="Voice input"><AudioLines size={16} /></button>
            <button type="button" className="send-button" aria-label="Send"><ArrowUp size={16} /></button>
          </div>
        </div>
      </GlassPreview>
    ),
  },
  {
    id: 'login',
    slotClass: 'slot-login',
    render: (state) => (
      <GlassPreview state={state} className="mock-login" radius={16}>
        <div className="login-card">
          <div className="login-head">
            <div className="mock-title">Let's get started!</div>
            <div className="mock-sub">Create your account to continue.</div>
          </div>
          <div className="login-auth">
            <button type="button"><GoogleLogo />Continue with Google</button>
            <button type="button"><AppleLogo />Continue with Apple</button>
          </div>
          <div className="login-divider"><span />OR<span /></div>
          <label className="login-email">
            <span>Email</span>
            <input type="email" value="john.smith@email.com" readOnly />
          </label>
          <button type="button" className="login-submit">Continue</button>
          <div className="login-foot">Already have an account? <span>Sign in</span></div>
        </div>
      </GlassPreview>
    ),
  },
  {
    id: 'command',
    slotClass: 'slot-command',
    render: (state) => (
      <GlassPreview state={state} className="mock-command" radius={16}>
        <div className="command-card">
          <div className="command-search">
            <Search size={20} />
            <span>Search for anything...</span>
            <X size={16} />
          </div>
          <div className="command-section-label">Actions</div>
          {['Create new file', 'Create new folder', 'Upload a file', 'Go to settings'].map((label, index) => (
            <div className="command-row" key={label}>
              <span className="command-icon">
                {index === 0 ? <FilePlus size={20} /> : index === 1 ? <FolderPlus size={20} /> : index === 2 ? <Upload size={20} /> : <Settings size={20} />}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </GlassPreview>
    ),
  },
  {
    id: 'segmented',
    slotClass: 'slot-segmented',
    render: (state) => (
      <div className="mock-segmented-free">
        <motion.button className="seg-pill" type="button" {...cardHover}>About us</motion.button>
        <motion.button className="seg-pill is-raised" type="button" {...cardHover}>Log in</motion.button>
        <motion.div className="seg-pill-motion" {...cardHover}>
          <GlassFx className="seg-pill seg-pill--glass" kind="card" radius={8} {...glassProps(state)}>
            <span className="seg-pill-label">Sign up</span>
          </GlassFx>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'pricing',
    slotClass: 'slot-pricing',
    render: (state) => {
      const plans = [
        {
          name: 'Starter',
          price: '$12',
          sub: 'For individuals or small teams',
          cta: 'Get Starter plan',
          glass: false,
          features: ['5 users', '1,000 AI tokens', 'Community support', 'Regular updates', 'Customizable themes'],
        },
        {
          name: 'Pro',
          price: '$32',
          sub: 'For mid-size teams',
          cta: 'Get Pro plan',
          glass: true,
          features: ['20 users', '5,000 AI tokens', 'Early access to beta features', 'Professional designed themes', 'Dedicated priority support', 'Advanced dashboard'],
        },
      ];
      return (
        <div className="mock-pricing-free">
          {plans.map((plan) => {
            const inner = (
              <>
                <div className="pricing-top">
                  <div className="mock-title">{plan.name}</div>
                  <div className="price-row">
                    <span>{plan.price}</span>
                    <span>USD / month</span>
                  </div>
                  <div className="mock-sub">{plan.sub}</div>
                  <button type="button">{plan.cta}</button>
                </div>
                <div className="pricing-features">
                  {plan.features.map((feature) => (
                    <div key={feature}><Check size={20} /><span>{feature}</span></div>
                  ))}
                </div>
              </>
            );
            return (
              <motion.div className="pricing-plan-motion" key={plan.name} {...cardHover}>
                {plan.glass ? (
                  <GlassFx className="pricing-plan pricing-plan--glass" kind="card" radius={16} {...glassProps(state)}>
                    <div className="pricing-inner">{inner}</div>
                  </GlassFx>
                ) : (
                  <div className="pricing-plan">{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      );
    },
  },
  {
    id: 'upload',
    slotClass: 'slot-upload',
    render: (state) => (
      <GlassPreview state={state} className="mock-upload" radius={16}>
        <div className="upload-head">
          <div className="upload-copy">
            <Upload size={20} />
            <div>
              <div className="mock-title">Uploading file 1 of 4</div>
              <div className="mock-sub">Design requirements.pdf</div>
            </div>
          </div>
          <X size={16} />
        </div>
        <div className="progress-frame">
          <div className="progress-line"><span /></div>
        </div>
      </GlassPreview>
    ),
  },
  {
    id: 'unlock',
    slotClass: 'slot-unlock',
    render: (state) => (
      <GlassPreview state={state} className="mock-unlock" radius={16}>
        <div className="upgrade-copy">
          <Zap size={20} />
          <div>
            <div className="mock-title">Unlock more features with Pro</div>
            <div className="mock-sub">Get access to every feature with the Pro plan.</div>
          </div>
        </div>
        <button type="button">Upgrade</button>
      </GlassPreview>
    ),
  },
  {
    id: 'generating',
    slotClass: 'slot-generating',
    render: (state) => (
      <GlassPreview state={state} className="mock-generating" radius={16}>
        <div className="generating-copy">
          <span className="generating-spinner" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="dot"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: dot * 0.16 }}
              />
            ))}
          </span>
          <span><span className="gen-full">Generating 1 of 4 pages...</span><span className="gen-short">Generating pages...</span></span>
        </div>
        <button type="button">Cancel</button>
      </GlassPreview>
    ),
  },
  {
    id: 'theme',
    slotClass: 'slot-theme',
    render: (state) => (
      <GlassPreview state={state} className="mock-theme" radius={16}>
        <div className="theme-icon"><Sparkles size={24} /></div>
        <div>
          <div className="mock-title">Create a new theme</div>
          <div className="mock-sub">Start from a blank template</div>
        </div>
      </GlassPreview>
    ),
  },
  {
    id: 'quickstart',
    slotClass: 'slot-quickstart',
    render: (state) => (
      <GlassPreview state={state} className="mock-quickstart" radius={16}>
        <div className="quick-image"><div className="quick-image-media" /></div>
        <div className="quick-body">
          <div>
            <div className="mock-title">Quick start</div>
            <div className="mock-sub">Start from a blank template</div>
          </div>
          <button type="button">Get started</button>
        </div>
      </GlassPreview>
    ),
  },
];

interface PreviewRailProps {
  state: DemoState;
}

function DesktopPreviewRail({ state }: PreviewRailProps): React.JSX.Element {
  const railRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, startY: 0, startScroll: 0 });

  React.useLayoutEffect(() => {
    if (!window.matchMedia('(min-width: 801px)').matches) return;
    const rail = railRef.current;
    const firstCopy = rail?.querySelector<HTMLElement>('.preview-copy');
    if (!rail || !firstCopy) return;

    const loopHeight = () => firstCopy.getBoundingClientRect().height;
    let jumping = false;

    const jumpTo = (top: number) => {
      jumping = true;
      window.scrollTo({ top, behavior: 'auto' });
      window.requestAnimationFrame(() => { jumping = false; });
    };

    const onScroll = () => {
      if (jumping) return;
      const height = loopHeight();
      const y = window.scrollY;
      if (height <= 0) return;
      if (y > height * 2 - window.innerHeight - 4) {
        jumpTo(y - height);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (jumping || event.deltaY >= 0 || window.scrollY > 1) return;
      const height = loopHeight();
      if (height <= 0) return;
      event.preventDefault();
      jumpTo(Math.max(0, height + event.deltaY));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <div
      ref={railRef}
      className="desktop-preview-rail"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = { active: true, startY: event.clientY, startScroll: window.scrollY };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.classList.add('is-dragging');
      }}
      onPointerMove={(event) => {
        if (!drag.current.active) return;
        window.scrollTo({ top: drag.current.startScroll + drag.current.startY - event.clientY, behavior: 'auto' });
      }}
      onPointerUp={(event) => {
        drag.current.active = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
        event.currentTarget.classList.remove('is-dragging');
      }}
      onPointerCancel={(event) => {
        drag.current.active = false;
        event.currentTarget.classList.remove('is-dragging');
      }}
    >
      {[0, 1, 2].map((copyIndex) => (
        <div className="preview-copy" key={copyIndex} aria-hidden={copyIndex !== 1}>
          {previewItems.map((item) => (
            <section className={`desktop-preview-slot ${item.slotClass}`} key={`${copyIndex}-${item.id}`}>
              {item.render(state)}
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}

function MobileCarousel({ state }: PreviewRailProps): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  const copyWidth = React.useRef(0);

  React.useLayoutEffect(() => {
    const scroller = ref.current;
    const firstCopy = scroller?.querySelector<HTMLElement>('.mobile-copy');
    if (!scroller || !firstCopy) return;
    copyWidth.current = firstCopy.getBoundingClientRect().width;
  }, []);

  const onScroll = () => {
    const scroller = ref.current;
    const width = copyWidth.current;
    if (!scroller || width <= 0) return;
    if (scroller.scrollLeft > width * 2 - scroller.clientWidth - 4) scroller.scrollLeft -= width;
  };

  return (
    <div className="mobile-carousel" ref={ref} onScroll={onScroll}>
      {[0, 1, 2].map((copyIndex) => (
        <div className="mobile-copy" key={copyIndex} aria-hidden={copyIndex !== 1}>
          {previewItems.map((item) => (
            <div className="mobile-preview-card" key={`${copyIndex}-${item.id}`}>{item.render(state)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProgressiveBlur({ edge }: { edge: 'top' | 'bottom' }): React.JSX.Element {
  return (
    <div className={`progressive-blur progressive-blur--${edge}`} aria-hidden="true">
      <div className="pb-layer pb-layer--2" />
      <div className="pb-layer pb-layer--4" />
      <div className="pb-layer pb-layer--6" />
      <div className="pb-layer pb-layer--8" />
      <div className="pb-gradient" />
    </div>
  );
}

interface NavProps {
  theme: Theme;
  onTheme: () => void;
}

function Nav({ theme, onTheme }: NavProps): React.JSX.Element {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Wordmark />
        <div className="nav-actions">
          <CopyButton className="install-pill" label="Copy install command" getText={() => 'npm install glass-pulse-fx'}>
            <span>npm install glass-pulse-fx</span>
          </CopyButton>
          <a className="icon-button" title="GitHub" href="https://github.com/JERRYJURR/glass-pulse-fx">
            <GithubLogo size={20} />
          </a>
          <button className="icon-button" type="button" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer(): React.JSX.Element {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copy">© 2026 Jerry Kou</span>
        <nav aria-label="Footer links">
          <a href="#website">Website</a>
          <a href="#x">X</a>
          <a href="#email">Email</a>
          <a href="#github">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}

interface DesktopShellProps extends ControlsProps {
  tab: TabId;
  onTab: (tab: TabId) => void;
}

function DesktopShell({ state, dirty, tab, onTab, onSelectPreset, onResetPreset, mutate }: DesktopShellProps): React.JSX.Element {
  return (
    <div className="desktop-shell">
      <div className="desktop-main">
        <aside className="left-rail">
          <p className="hero-copy">{heroCopy}</p>
          <PresetPicker state={state} dirty={dirty} onSelect={onSelectPreset} onReset={onResetPreset} />
          <Tabs value={tab} onChange={onTab} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="left-panel-body"
              key={tab}
              initial={{ opacity: 0, x: tab === 'install' ? -12 : 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: tab === 'install' ? 12 : -12, filter: 'blur(8px)' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'install' ? (
                <div className="install-left" id="install">
                  <InstallContent state={state} />
                </div>
              ) : (
                <Controls state={state} dirty={dirty} onSelectPreset={onSelectPreset} onResetPreset={onResetPreset} mutate={mutate} />
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
        <main className="right-rail" aria-label="Glass component previews">
          <DesktopPreviewRail state={state} />
        </main>
      </div>
      <ProgressiveBlur edge="top" />
      <ProgressiveBlur edge="bottom" />
    </div>
  );
}

interface SheetProps extends ControlsProps {
  open: boolean;
  onClose: () => void;
}

function ControlSheet({ open, onClose, state, dirty, onSelectPreset, onResetPreset, mutate }: SheetProps): React.JSX.Element {
  const [snap, setSnap] = React.useState<SnapPoint>('partial');
  const y = useMotionValue(0);

  React.useEffect(() => {
    if (open) setSnap('partial');
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="sheet-backdrop"
            type="button"
            aria-label="Close controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={`control-sheet control-sheet--${snap}`}
            role="dialog"
            aria-modal="true"
            aria-label="Customize glass effect"
            style={{ y }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.24 }}
            onDragEnd={(_event, info) => {
              const shouldClose = snap === 'partial' && (info.offset.y > 110 || info.velocity.y > 900);
              if (shouldClose) {
                onClose();
                return;
              }
              if (info.offset.y < -80 || info.velocity.y < -700) setSnap('full');
              else if (info.offset.y > 80 || info.velocity.y > 700) setSnap('partial');
              void animate(y, 0, { type: 'spring', stiffness: 420, damping: 42 });
            }}
          >
            <div className="sheet-handle" />
            <Controls state={state} dirty={dirty} onSelectPreset={onSelectPreset} onResetPreset={onResetPreset} mutate={mutate} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface MobileShellProps extends ControlsProps {
  onOpenControls: () => void;
  onTheme: () => void;
}

function MobileShell({ state, dirty, onSelectPreset, onResetPreset, onOpenControls, onTheme }: MobileShellProps): React.JSX.Element {
  return (
    <div className="mobile-shell">
      <header className="mobile-nav">
        <Wordmark />
        <div className="mobile-actions">
          <a className="icon-button" title="GitHub" href="https://github.com/JERRYJURR/glass-pulse-fx"><GithubLogo size={16} /></a>
          <button className="icon-button" type="button" title={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onTheme}>
            {state.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <main className="mobile-content">
        <p className="hero-copy">{heroCopy}</p>
        <div className="mobile-control-row">
          <PresetPicker state={state} dirty={dirty} onSelect={onSelectPreset} onReset={onResetPreset} compact />
          <button className="customize-button" type="button" onClick={onOpenControls}>
            <Settings2 size={16} />
            <span>Customize</span>
          </button>
        </div>
        <MobileCarousel state={state} />
        <InstallContent state={state} />
      </main>
      <Footer />
    </div>
  );
}

function App(): React.JSX.Element {
  const [state, setState] = React.useState<DemoState>(() => loadState());
  const [tab, setTab] = React.useState<TabId>('install');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const dirty = isDirty(state);

  React.useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    const timer = window.setTimeout(() => saveState(state), 150);
    return () => window.clearTimeout(timer);
  }, [state]);

  const mutate = React.useCallback((updater: (draft: DemoState) => void) => {
    setState((previous) => {
      const draft = clone(previous);
      updater(draft);
      return draft;
    });
  }, []);

  const selectPreset = React.useCallback((id: string) => {
    setState((previous) => {
      const draft = clone(previous);
      draft.activeId = id;
      const preset: DemoPreset = allPresets(draft).find((item) => item.id === id) ?? defaultPreset;
      draft.working = lookFromPreset(preset.data, draft.theme, preset.palette);
      return draft;
    });
  }, []);

  const resetPreset = React.useCallback(() => {
    setState((previous) => {
      const draft = clone(previous);
      const preset = activePreset(draft);
      draft.working = lookFromPreset(preset.data, draft.working.baseTheme, preset.palette);
      return draft;
    });
  }, []);

  const toggleTheme = React.useCallback(() => {
    mutate((draft) => {
      draft.theme = draft.theme === 'dark' ? 'light' : 'dark';
    });
  }, [mutate]);

  const controlsProps = {
    state,
    dirty,
    onSelectPreset: selectPreset,
    onResetPreset: resetPreset,
    mutate,
  };

  return (
    <>
      <Nav theme={state.theme} onTheme={toggleTheme} />
      <DesktopShell {...controlsProps} tab={tab} onTab={setTab} />
      <MobileShell {...controlsProps} onOpenControls={() => setSheetOpen(true)} onTheme={toggleTheme} />
      <ControlSheet {...controlsProps} open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <Footer />
      {import.meta.env.DEV && (
        <Agentation
          endpoint="http://localhost:4747"
          onSessionCreated={(id) => console.info('[agentation] session', id)}
        />
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
