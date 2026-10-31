import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // With VITE_EMACHINE_BASE_URL empty, the app calls /datamodel/... on its own
  // origin and this proxy forwards it to eMachine (no CORS needed). nginx does
  // the same in production (infrastructure/nginx/nginx.conf).
  const target = env.EMACHINE_PROXY_TARGET || 'https://emachine.instantar.io';
  const proxy = {
    '/datamodel': { target, changeOrigin: true, secure: true },
    // eMachine's cloud-storage service (file uploads from the Files tab).
    '/cloudproviders': { target, changeOrigin: true, secure: true },
  };
  return {
    plugins: [react()],
    server: { host: true, port: 5173, proxy, fs: { allow: ['..'] }, allowedHosts: ['aziro.ngrok.app'] },
    preview: { host: true, port: 4173, proxy, allowedHosts: ['aziro.ngrok.app'] },
    build: { outDir: 'dist', sourcemap: true },
    test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'], env: { VITE_EMACHINE_TOKEN: '', VITE_EMACHINE_WRITES: 'false', VITE_FORMA_TOKEN_URL: 'https://token.test/token' } },
  };
});
