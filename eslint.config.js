import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-demo', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        CSS: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        MediaQueryList: 'readonly',
        Event: 'readonly',
        EventListener: 'readonly',
        WebGLRenderingContext: 'readonly',
        WebGLUniformLocation: 'readonly',
        WebGLShader: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        CSSStyleDeclaration: 'readonly',
        getComputedStyle: 'readonly',
        Float32Array: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
