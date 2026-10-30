import { chromium } from 'playwright';

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4173';

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

/** Fresh browser page; collects page errors so tests can assert there were none. */
export async function openPage(viewport = VIEWPORTS.phone) {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  return { browser, page, errors };
}

export async function pickOption(page, comboName, optionText) {
  await page.getByRole('combobox', { name: comboName }).first().click();
  const option = optionText ? page.getByRole('option', { name: optionText }) : page.getByRole('option');
  await option.first().click();
}
