// Checks the responsive layout at phone, tablet and desktop widths.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE_URL, VIEWPORTS, openPage } from './helpers.mjs';

const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`${name}: no horizontal scroll on list and cost screens`, async () => {
    const { browser, page, errors } = await openPage(viewport);
    try {
      await page.goto(BASE_URL);
      await page.locator('.tag-card').first().waitFor();
      assert.ok(await noHorizontalScroll(page), 'list fits');
      await page.goto(`${BASE_URL}/tags/e9001/cost/equipment`);
      await page.locator('.line-card').nth(1).waitFor();
      assert.ok(await noHorizontalScroll(page), 'cost tab fits');
      const listVisible = await page.locator('.shell__list').isVisible();
      assert.equal(listVisible, viewport.width >= 1024, 'list beside detail only on wide screens');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
