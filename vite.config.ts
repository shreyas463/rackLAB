import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the same static build works from a domain root (Vercel,
  // Netlify) or a repo subpath (GitHub Pages project site).
  base: './',
  server: { port: 5180 },
  build: {
    // three.js + R3F are large; bump the warning ceiling rather than
    // code-splitting a single-page WebGL app that needs everything up front.
    chunkSizeWarningLimit: 1200,
  },
})
