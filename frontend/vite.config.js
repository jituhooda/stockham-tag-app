import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In development the browser talks to Vite, which forwards API calls to the backend.
  const backend = env.VITE_DEV_BACKEND_URL || 'http://localhost:8000';
  const proxy = {
    '/api': { target: backend, changeOrigin: true },
    '/health': { target: backend, changeOrigin: true },
  };
  return {
    plugins: [react()],
    server: { host: true, port: 5173, proxy },
    preview: { host: true, port: 4173, proxy },
    build: { outDir: 'dist', sourcemap: true },
    test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'] },
  };
});
