import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_ORIGIN = 'https://emachine.instantar.io';

// The proxy lets the browser call the API same-origin, so CORS on the API host
// doesn't matter during development or `vite preview`.
const proxy = {
  '/datamodel': { target: API_ORIGIN, changeOrigin: true, secure: true },
};

export default defineConfig({
  plugins: [react()],
  server: { host: true, proxy },
  preview: { host: true, proxy },
});
