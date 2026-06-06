// Shared WebGL renderer: one offscreen canvas, one program per effect, ref-counted.
// Compiles every registered effect once; renderEffect() selects one, uploads its params,
// and draws a frame. Rebuilds on context loss. Released when the last instance unmounts.

import { GL_SIZE, DPR } from '../perf';
import { VERT, type UniformMap } from '../effects/common';
import { EFFECTS, EFFECT_IDS, type EffectDef } from '../effects';
import type { EffectId, EffectParams } from '../../types';

export interface SharedRenderer {
  readonly glCanvas: HTMLCanvasElement;
  readonly available: boolean;
  /** select an effect, upload its params + time, and draw one frame to glCanvas */
  renderEffect(effectId: EffectId, params: EffectParams, timeSec: number): void;
  destroy(): void;
}

interface Compiled {
  program: WebGLProgram;
  U: UniformMap;
  posLoc: number;
  def: EffectDef;
}

let shared: SharedRenderer | null = null;
let refs = 0;

export function acquireRenderer(): SharedRenderer {
  refs++;
  if (!shared) shared = createSharedRenderer();
  return shared;
}

export function releaseRenderer(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && shared) {
    shared.destroy();
    shared = null;
  }
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('glass-pulse-fx: shader compile failed: ' + log);
  }
  return s;
}

function createSharedRenderer(): SharedRenderer {
  const glCanvas = document.createElement('canvas');
  glCanvas.width = Math.round(GL_SIZE * DPR);
  glCanvas.height = Math.round(GL_SIZE * DPR);

  const gl = glCanvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('glass-pulse-fx: WebGL not available');

  let compiled: Record<string, Compiled> = {};
  let vbuf: WebGLBuffer | null = null;
  let lost = false;

  function build(): void {
    // Each effect is a single full-frame pass over a cleared buffer, so no blending is
    // needed. Disabling it lets effects write straight (non-premultiplied) alpha — bands
    // can fade to transparent (glass shows through) instead of multiplying toward black.
    gl!.disable(gl!.BLEND);

    vbuf = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, vbuf);
    gl!.bufferData(
      gl!.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl!.STATIC_DRAW,
    );

    compiled = {};
    const vert = compile(gl!, gl!.VERTEX_SHADER, VERT);
    for (const id of EFFECT_IDS) {
      const def = EFFECTS[id];
      const program = gl!.createProgram()!;
      gl!.attachShader(program, vert);
      gl!.attachShader(program, compile(gl!, gl!.FRAGMENT_SHADER, def.frag));
      gl!.linkProgram(program);
      if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
        throw new Error(`glass-pulse-fx: link failed (${id}): ` + gl!.getProgramInfoLog(program));
      }
      const U: UniformMap = {};
      for (const n of def.uniforms) U[n] = gl!.getUniformLocation(program, n);
      compiled[id] = { program, U, posLoc: gl!.getAttribLocation(program, 'a_position'), def };
    }
  }

  build();

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
    build();
  };
  glCanvas.addEventListener('webglcontextlost', onLost as EventListener);
  glCanvas.addEventListener('webglcontextrestored', onRestored);

  return {
    glCanvas,
    get available() {
      return !lost;
    },
    renderEffect(effectId, params, timeSec) {
      if (lost) return;
      const ce = compiled[effectId];
      if (!ce) return;
      gl.useProgram(ce.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
      gl.enableVertexAttribArray(ce.posLoc);
      gl.vertexAttribPointer(ce.posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(ce.U.u_resolution, glCanvas.width, glCanvas.height);
      gl.uniform1f(ce.U.u_time, timeSec);
      ce.def.upload(gl, ce.U, params);
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    destroy() {
      glCanvas.removeEventListener('webglcontextlost', onLost as EventListener);
      glCanvas.removeEventListener('webglcontextrestored', onRestored);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
