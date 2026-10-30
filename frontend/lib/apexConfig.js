/**
 * App settings: config/*.json (bundled at build time) plus VITE_* overrides.
 * There is no backend; the browser talks to eMachine directly.
 */
import appConfig from '../../config/app.config.json';
import branding from '../../config/branding.config.json';
import features from '../../config/features.config.json';
import integrations from '../../config/integrations.config.json';

const env = import.meta.env;
const emachine = integrations.emachine;
const forma = integrations.forma;
const bearer = (v) => (v || '').trim().replace(/^Bearer\s+/i, '');
const flag = (value, fallback) => (value == null || value === '' ? fallback : String(value).toLowerCase() === 'true');

export const apexConfig = {
  app: appConfig,
  branding,
  features,
  emachine: {
    // Empty base URL = same origin: nginx (or the Vite dev server) forwards /datamodel to eMachine.
    baseUrl: (env.VITE_EMACHINE_BASE_URL ?? '').replace(/\/$/, ''),
    queryPath: emachine.queryPath,
    tablePath: emachine.tablePath,
    queries: { ...emachine.queries, ...(features.issuesQuery ? { issues: features.issuesQuery } : {}) },
    writes: emachine.writes,
    timeoutMs: (emachine.timeoutSeconds || 30) * 1000,
    /** Optional token from .env (a leading "Bearer " is accepted). Without it, users paste their own on the sign-in screen. */
    token: (env.VITE_EMACHINE_TOKEN || '').trim().replace(/^Bearer\s+/i, ''),
    /**
     * Saving to eMachine is OFF unless VITE_EMACHINE_WRITES=true. While off, every
     * save is logged to the console and nothing is sent.
     */
    writesEnabled: flag(env.VITE_EMACHINE_WRITES, false),
  },
  /** Autodesk Forma project lookup (called directly from the browser). Its short-lived token is fetched from tokenUrl on demand. */
  forma: {
    apiBase: forma.apiBase,
    accountId: forma.accountId,
    projectsPath: forma.projectsPath,
    jobFilter: forma.jobFilter,
    tokenUrl: (env.VITE_FORMA_TOKEN_URL || forma.tokenUrl || '').trim(),
  },
  editableStatuses: appConfig.editableStatuses || ['Draft', 'Rejected'],
  storageKeys: {
    token: 'stockham.emachineToken',
    settings: 'stockham.settings.v2',
    approvers: 'stockham.approvers.v1',
  },
};
