import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4173';
/** The app under test must be built with VITE_EMACHINE_BASE_URL set to this. */
export const FAKE_EMACHINE = 'https://emachine.invalid';

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  phoneLandscape: { width: 844, height: 390 },
  tablet: { width: 820, height: 1180 },
  tabletLandscape: { width: 1180, height: 820 },
  desktop: { width: 1440, height: 900 },
};

/** Expected layout per viewport (see frontend/hooks/useLayout.js). */
export const expectedLayout = ({ width, height }) =>
  width >= 1200 && height >= 500 ? 'desktop' : width >= 768 && height >= 500 ? 'tablet' : 'phone';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

/** Answer a decoded model_query SQL from the fixtures. */
function answer(sql) {
  const tagId = Number((sql.match(/tag_id = (\d+)/) || sql.match(/t\.Id = (\d+)/) || [])[1]);
  const byTag = (name) => fixture(name).filter((r) => r.tag_id === tagId);
  if (/FROM tags t ORDER BY/.test(sql)) return fixture('tags');
  if (/FROM tags t WHERE t\.Id =/.test(sql)) return fixture('tags').filter((r) => r.Id === tagId);
  if (/FROM tag_labor tl/.test(sql)) return byTag('tagLabor');
  if (/FROM tag_materials tm/.test(sql)) return byTag('tagMaterials');
  if (/FROM tag_equipment te/.test(sql)) return byTag('tagEquipment');
  if (/FROM tag_other_expenses toe/.test(sql)) return byTag('tagExpenses');
  if (/select Division from employees/i.test(sql)) return fixture('division');
  if (/from employees/i.test(sql)) return fixture('employees');
  if (/FROM trade\b/.test(sql)) return fixture('trades');
  if (/materials_master/.test(sql)) return fixture('materials');
  if (/equipment_master/.test(sql)) return fixture('equipment');
  if (/expenses_master/.test(sql)) return fixture('expenses');
  if (/from job/i.test(sql)) return fixture('jobs');
  throw new Error(`No fixture for query: ${sql}`);
}

/**
 * Fresh browser page whose eMachine traffic is answered locally. `writes`
 * collects every save the app sends ({ table, fields }); nothing leaves the machine.
 */
export async function openPage(viewport = VIEWPORTS.phone) {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport });
  const errors = [];
  const writes = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.route(`${FAKE_EMACHINE}/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    if (req.method() === 'GET' && url.pathname.endsWith('/model_query')) {
      const sql = Buffer.from(url.searchParams.get('query'), 'base64').toString('utf8');
      try {
        return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(answer(sql)) });
      } catch (e) {
        errors.push(e.message);
        return route.fulfill({ status: 500, headers: CORS, body: '{}' });
      }
    }
    if (req.method() === 'POST') {
      writes.push({ table: url.pathname.split('/').pop(), fields: Object.fromEntries(new URLSearchParams(req.postData() || '')) });
      return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: '{"status":"ok"}' });
    }
    return route.fulfill({ status: 405, headers: CORS, body: '{}' });
  });
  // Anything else outside the app itself is a bug in the test setup: block it.
  await page.route((u) => !u.href.startsWith(BASE_URL) && !u.href.startsWith(FAKE_EMACHINE), (r) => r.abort());
  return { browser, page, errors, writes };
}

export async function pickOption(page, comboName, optionText) {
  await page.getByRole('combobox', { name: comboName }).last().click();
  const option = optionText ? page.getByRole('option', { name: optionText }) : page.getByRole('option');
  await option.first().click();
}
