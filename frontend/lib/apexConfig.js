/**
 * Build-time settings for the web app. Everything else (branding, features,
 * the signed-in user) comes from the backend at runtime via /api/v1/config.
 */
const env = import.meta.env;

export const apexConfig = {
  /** Backend origin; empty means same origin (nginx or the Vite proxy forwards /api). */
  apiBaseUrl: (env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  apiPrefix: '/api/v1',
  requestTimeoutMs: Number(env.VITE_REQUEST_TIMEOUT_MS || 30000),
  storageKeys: {
    token: 'stockham.token',
    settings: 'stockham.settings.v2',
  },
};
