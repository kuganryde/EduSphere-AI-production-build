import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
 
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
 
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
 
    // ── Build output ───────────────────────────────────────────
    // Netlify reads from 'dist' by default
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'recharts', 'lucide-react'],
          },
        },
      },
    },
 
    // ── Dev server (local only, ignored in production) ─────────
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});