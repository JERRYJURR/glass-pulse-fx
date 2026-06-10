import { defineConfig } from 'tsup';

// Dual ESM + CJS library build with .d.ts. Three entries: the React-inclusive index,
// the framework-agnostic core, and the preset collection. React is external (a peer).
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    presets: 'src/presets/index.ts',
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
