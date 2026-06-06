// Shared GLSL + uniform plumbing for the base shaders. Each effect renders a full-frame
// colour field into the shared GL canvas; the glass compositor takes it from there.
//
// `paneColor(i)` is the shared vocabulary: select one of up to 5 palette stops by index.

import { hexToRgb } from '../color';
import type { EffectParams } from '../../types';

export type UniformMap = Record<string, WebGLUniformLocation | null>;

export const VERT = `attribute vec2 a_position; void main(){ gl_Position = vec4(a_position,0.0,1.0); }`;

// Uniforms every effect declares + the palette helper.
export const COMMON_GLSL = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color1,u_color2,u_color3,u_color4,u_color5;
uniform float u_count,u_speed,u_scale,u_bright;

vec3 paneColor(int i){
  if(i<=0) return u_color1;
  else if(i==1) return u_color2;
  else if(i==2) return u_color3;
  else if(i==3) return u_color4;
  return u_color5;
}
`;

export const COMMON_UNIFORMS = [
  'u_resolution', 'u_time',
  'u_color1', 'u_color2', 'u_color3', 'u_color4', 'u_color5',
  'u_count', 'u_speed', 'u_scale', 'u_bright',
];

/** Push the shared palette + scalar uniforms. Each effect calls this, then adds its own. */
export function uploadCommon(gl: WebGLRenderingContext, U: UniformMap, p: EffectParams): void {
  for (let i = 0; i < 5; i++) {
    const c = hexToRgb(p.colors[i] ?? '#000000');
    gl.uniform3f(U[`u_color${i + 1}`], c[0], c[1], c[2]);
  }
  gl.uniform1f(U.u_count, p.paneCount);
  gl.uniform1f(U.u_speed, p.speed);
  gl.uniform1f(U.u_scale, p.scale);
  gl.uniform1f(U.u_bright, p.bright);
}
