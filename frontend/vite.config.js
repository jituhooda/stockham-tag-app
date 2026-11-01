import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: { host: true, port: 5173, fs: { allow: ['..'] }, allowedHosts: ['aziro.ngrok.app'] },
    preview: { host: true, port: 4173, allowedHosts: ['aziro.ngrok.app'] },
    build: { outDir: 'dist', sourcemap: true },
    test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'], env: { VITE_EMACHINE_TOKEN: '', VITE_EMACHINE_WRITES: 'false', VITE_FORMA_TOKEN_URL: 'https://token.test/token' } },
  };
});
