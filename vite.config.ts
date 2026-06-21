import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev/build for the demo playground. The demo imports straight from ../src so it
// doubles as a live integration test (`npm run dev`). `npm run build:demo` emits a
// static site to dist-demo/ — point Vercel / GitHub Pages at that.
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  // Relative base so it also works under a GitHub Pages subpath. Vercel ignores this.
  base: './',
  // PORT lets a harness assign a free port; vite's default 5173 otherwise.
  server: {
    port: Number(process.env.PORT) || 5173,
    // listen on all interfaces so it's reachable over the tailnet (phone, etc.),
    // not just localhost
    host: true,
    // allow access via `tailscale serve` (tailnet-only hostnames)
    allowedHosts: ['.ts.net'],
  },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
