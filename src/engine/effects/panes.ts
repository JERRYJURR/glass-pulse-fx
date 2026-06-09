// Panes: discrete colored bands moving along an axis. Each band fades in (leading), holds
// at full, fades out (trailing) via ALPHA — so the gaps are transparent (glass shows
// through), not black — then a transparent interval before the next band.
//
// motion 0 (linear): bands sweep along the axis; speed sign sets direction.
// motion 1 (center): the axis is mirrored about the element center, so bands emanate from
//   the center to both sides (positive speed) or converge inward (negative speed).

import { COMMON_GLSL, COMMON_UNIFORMS, uploadCommon, type UniformMap } from './common';
import type { EffectDef } from './index';
import type { EffectParams } from '../../types';

const WARP_N = 24;

// Velocity presets: how band speed varies across the element. Each bakes a cubic-bezier
// speed curve [velStart, velEnd, c0x, c0y, c1x, c1y] — speed at each end of the axis plus
// two tangent handles. `EffectParams.velocity` is an index into this list.
export const VELOCITY_PRESETS: { label: string; curve: readonly [number, number, number, number, number, number] }[] = [
  { label: 'Uniform', curve: [1, 1, 0.33, 1, 0.67, 1] },
  { label: 'Ease out', curve: [0.8, 0.35, 0.33, 0.72, 0.67, 0.45] },
  { label: 'Ease out+', curve: [1, 0.15, 0.25, 0.55, 0.6, 0.2] },
  { label: 'Ease in', curve: [0.35, 0.8, 0.33, 0.45, 0.67, 0.72] },
  { label: 'Slow middle', curve: [1, 1, 0.33, 0.35, 0.67, 0.35] },
  { label: 'Fast middle', curve: [0.45, 0.45, 0.33, 1, 0.67, 1] },
];

// Build the position-remap lookup table on the CPU: invert the cubic-bezier speed curve
// and integrate 1/speed, sampled to WARP_N points. Cached by preset index, so it only
// recomputes when the preset changes — not per frame, not per pixel.
let lutKey = -1;
const lut = new Float32Array(WARP_N);
function warpLUT(p: EffectParams): Float32Array {
  const key = VELOCITY_PRESETS[Math.round(p.velocity)] ? Math.round(p.velocity) : 0;
  if (key === lutKey) return lut;
  lutKey = key;
  const [a, b, c0x, c0y, c1x, c1y] = VELOCITY_PRESETS[key].curve;
  const bx = (t: number) => { const it = 1 - t; return 3 * it * it * t * c0x + 3 * it * t * t * c1x + t * t * t; };
  const by = (t: number) => { const it = 1 - t; return it * it * it * a + 3 * it * it * t * c0y + 3 * it * t * t * c1y + t * t * t * b; };
  const bdx = (t: number) => { const it = 1 - t; return 3 * it * it * c0x + 6 * it * t * (c1x - c0x) + 3 * t * t * (1 - c1x); };
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const speed = (s: number) => {
    let t = clamp01(s);
    for (let i = 0; i < 6; i++) {
      const d = bdx(t);
      if (Math.abs(d) < 1e-5) break;
      t = clamp01(t - (bx(t) - s) / d);
    }
    return Math.max(by(t), 0.05);
  };
  const M = 128;
  const cum = new Float64Array(M + 1);
  let prev = 1 / speed(0);
  for (let i = 1; i <= M; i++) {
    const cur = 1 / speed(i / M);
    cum[i] = cum[i - 1] + ((prev + cur) * 0.5) / M;
    prev = cur;
  }
  const total = cum[M] || 1;
  for (let j = 0; j < WARP_N; j++) {
    const fi = (j / (WARP_N - 1)) * M;
    const i0 = Math.min(M - 1, Math.floor(fi));
    lut[j] = (cum[i0] + (cum[i0 + 1] - cum[i0]) * (fi - i0)) / total;
  }
  return lut;
}

const FRAG =
  COMMON_GLSL +
  `
uniform float u_angle, u_rampIn, u_rampOut, u_interval, u_motion;
// Precomputed position-remap (the integral of 1/speed) as a 24-point lookup table. The
// velocity curve is the same for every pixel and only changes when the handles move, so
// the CPU bakes this once per change — the shader just reads it (no per-pixel solve).
uniform float u_warp[24];
uniform vec3 u_color;   // colorSpread (along), colorSkew (perpendicular), colorDrift (time)

// smooth cyclic gradient through the palette stops (u_count = colors.length)
vec3 paletteSmooth(float gc){
  int count = int(u_count + 0.5);
  float x = fract(gc) * float(count);
  float fi = floor(x);
  int i0 = int(fi);
  int i1 = i0 + 1; if(i1 >= count) i1 = 0;
  return mix(paneColor(i0), paneColor(i1), x - fi);
}

float sampleWarp(float s){
  float fi = clamp(s, 0.0, 1.0) * 23.0;
  float i0 = floor(fi);
  float fr = fi - i0;
  int idx = int(i0);
  float lo = u_warp[0];
  float hi = u_warp[23];
  for(int k = 0; k < 24; k++){          // constant-index read (portable on WebGL1)
    if(k == idx) lo = u_warp[k];
    if(k == idx + 1) hi = u_warp[k];
  }
  return mix(lo, hi, fr);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 dir = vec2(cos(u_angle), sin(u_angle));
  float u = dot(uv - 0.5, dir);
  // map the axis to 0..1, remap through the (precomputed) velocity warp, map back.
  float s = (u_motion > 0.5) ? clamp(abs(u) * 2.0, 0.0, 1.0) : clamp(u + 0.5, 0.0, 1.0);
  float w01 = sampleWarp(s);
  float warp = (u_motion > 0.5) ? w01 * 0.5 : w01 - 0.5;
  float pos = warp * u_scale - u_time * u_speed;

  // color field — sampled independently of the band index, so colour can vary within and
  // across a band: along the motion axis (spread), perpendicular (skew), and over time (drift)
  float ca = u + 0.5;
  float cp = dot(uv - 0.5, vec2(-dir.y, dir.x)) + 0.5;
  vec3 c = paletteSmooth(ca * u_color.x + cp * u_color.y + u_time * u_color.z);

  // The pane is always one unit wide; interval expands the pane+gap cycle instead of
  // stealing width from the pane. So increasing interval adds transparent space after
  // each pane while the pane's ramp/hold/ramp shape stays the same.
  float interval = clamp(u_interval, 0.0, 0.95);
  float gap = interval / max(1.0 - interval, 0.05);
  float cycle = 1.0 + gap;
  float f = mod(pos, cycle);
  float ri = clamp(u_rampIn, 0.001, 1.0);
  float ro = clamp(u_rampOut, 0.001, 1.0);
  float env = 0.0;
  if(f < 1.0){
    env = smoothstep(0.0, ri, f) * (1.0 - smoothstep(1.0 - ro, 1.0, f));
  }
  gl_FragColor = vec4(c * u_bright, env);
}`;

const dark: EffectParams = {
  colors: ['#ff2d9b', '#7a5cff', '#19c3ff', '#15e6a4', '#ffd23f'],
  speed: 0.25, scale: 1.6, bright: 1.0,
  colorSpread: 2.0, colorSkew: 0, colorDrift: 0,
  velocity: 1, // Ease out
  rampIn: 0.25, rampOut: 0.5, interval: 0.4, angle: 0, motion: 0,
};
const light: EffectParams = {
  colors: ['#ff84c4', '#a99bff', '#79dbff', '#7ef0c2', '#ffe39b'],
  speed: 0.25, scale: 1.6, bright: 1.0,
  colorSpread: 2.0, colorSkew: 0, colorDrift: 0,
  velocity: 1, // Ease out
  rampIn: 0.25, rampOut: 0.5, interval: 0.4, angle: 0, motion: 0,
};

export const panes: EffectDef = {
  id: 'panes',
  label: 'Panes',
  frag: FRAG,
  uniforms: [
    ...COMMON_UNIFORMS,
    'u_angle', 'u_warp[0]', 'u_color', 'u_rampIn', 'u_rampOut', 'u_interval', 'u_motion',
  ],
  defaults: { dark, light },
  upload(gl: WebGLRenderingContext, U: UniformMap, p: EffectParams) {
    uploadCommon(gl, U, p);
    gl.uniform1f(U.u_angle, (p.angle * Math.PI) / 180);
    gl.uniform1fv(U['u_warp[0]'], warpLUT(p));
    gl.uniform3f(U.u_color, p.colorSpread, p.colorSkew, p.colorDrift);
    gl.uniform1f(U.u_rampIn, p.rampIn);
    gl.uniform1f(U.u_rampOut, p.rampOut);
    gl.uniform1f(U.u_interval, p.interval);
    gl.uniform1f(U.u_motion, p.motion);
  },
  controls: [
    { kind: 'colors', label: 'Palette' },
    { kind: 'slider', key: 'colorSpread', label: 'Color spread', min: 0, max: 6, step: 0.1 },
    { kind: 'slider', key: 'colorSkew', label: 'Color skew', min: 0, max: 6, step: 0.1 },
    { kind: 'slider', key: 'colorDrift', label: 'Color drift', min: -1, max: 1, step: 0.01 },
    {
      kind: 'select', key: 'motion', label: 'Motion',
      options: [
        { label: 'Linear', value: 0 },
        { label: 'Center', value: 1 },
      ],
    },
    { kind: 'slider', key: 'speed', label: 'Speed', min: -1, max: 1, step: 0.01 },
    {
      kind: 'select', key: 'velocity', label: 'Velocity',
      options: VELOCITY_PRESETS.map((v, i) => ({ label: v.label, value: i })),
    },
    { kind: 'slider', key: 'scale', label: 'Band density', min: 0.1, max: 4, step: 0.05 },
    { kind: 'slider', key: 'interval', label: 'Interval', min: 0, max: 0.9, step: 0.02 },
    { kind: 'slider', key: 'rampIn', label: 'Ramp in', min: 0.01, max: 1, step: 0.02 },
    { kind: 'slider', key: 'rampOut', label: 'Ramp out', min: 0.01, max: 1, step: 0.02 },
    { kind: 'slider', key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, unit: '°' },
    { kind: 'slider', key: 'bright', label: 'Brightness', min: 0, max: 2, step: 0.05 },
  ],
};
