import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Static SPA build — output goes to dist/, which is what gets deployed
// to Vercel (see vercel.json) and what mobile-app's Capacitor config
// should point `webDir` at once this replaces the old static folder.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Lets `npm run dev` hit the same /api/config serverless function
      // shape as production without needing `vercel dev`. Harmless if
      // unused — see src/lib/config.js for the .env.local fallback.
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
