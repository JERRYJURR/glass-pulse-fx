import { defineConfig } from 'tsup';

// Dual ESM + CJS library build with .d.ts. Two entries: the React-inclusive index
// and the framework-agnostic core. React is external (a peer dependency).
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
