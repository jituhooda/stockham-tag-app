// Checks the layout chosen for phone, tablet and desktop sizes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE_URL, VIEWPORTS, expectedLayout, openPage } from './helpers.mjs';

const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const layout = expectedLayout(viewport);
  test(`${name} (${viewport.width}x${viewport.height}) uses the ${layout} layout`, async () => {
    const { browser, page, errors } = await openPage(viewport);
    try {
      await page.goto(BASE_URL);
      await page.locator('.tag-card:not(.skeleton)').first().waitFor(); // not the loading placeholders
      assert.equal(await page.locator('.shell').getAttribute('data-layout'), layout);
      assert.ok(await noHorizontalScroll(page), 'list fits');

      // Opening a tag: phones swap to the tag; tablets and desktops keep the list beside it.
      await page.locator('.tag-card', { hasText: 'D4355-1' }).click(); // sample eMachine tag with equipment lines
      await page.locator('.detail-head').waitFor();
      const split = layout !== 'phone';
      assert.equal(await page.locator('.shell__list').isVisible(), split, 'list beside the tag');
      const closeLabel = split ? 'Close tag' : 'Back to tags';
      assert.ok(await page.getByRole('button', { name: closeLabel }).isVisible(), closeLabel);
      assert.equal(await page.locator('.detail-head').getByRole('button', { name: 'Open menu' }).count(), split ? 0 : 1);

      await page.getByRole('link', { name: 'Cost' }).click();
      await page.getByRole('link', { name: 'Equipment' }).click();
      await page.locator('.line-card').nth(1).waitFor();
      assert.ok(await noHorizontalScroll(page), 'cost tab fits');
      assert.ok(await page.getByRole('button', { name: 'Save' }).isVisible(), 'Save is on screen');

      await page.getByRole('button', { name: closeLabel }).click();
      await page.waitForURL(`${BASE_URL}/`);
      await page.locator('.tag-card:not(.skeleton)').first().waitFor({ state: 'visible' });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
