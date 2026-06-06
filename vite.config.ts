import { defineConfig } from 'vite';

// Dev/build for the demo playground. The demo imports straight from ../src so it
// doubles as a live integration test (`npm run dev`). `npm run build:demo` emits a
// static site to dist-demo/ — point Vercel / GitHub Pages at that.
export default defineConfig({
  root: 'demo',
  // Relative base so it also works under a GitHub Pages subpath. Vercel ignores this.
  base: './',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
