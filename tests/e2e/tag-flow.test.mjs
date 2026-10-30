// Full user journey against a stack running with EMACHINE_MODE=fixtures.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { BASE_URL, VIEWPORTS, openPage, pickOption } from './helpers.mjs';

let ctx;
before(async () => {
  ctx = await openPage(VIEWPORTS.phone);
});
after(async () => {
  assert.deepEqual(ctx.errors, [], 'no uncaught page errors');
  await ctx.browser.close();
});

test('lists eMachine tags', async () => {
  const { page } = ctx;
  await page.goto(BASE_URL);
  await page.getByText('D4355-1').waitFor();
  assert.ok(await page.getByText('Dragoneer 1 Letterman').first().isVisible());
});

test('creates, costs, signs and submits a tag', async () => {
  const { page } = ctx;
  await page.getByRole('button', { name: 'Add Tag' }).click();
  await pickOption(page, 'Job', /Dragoneer/);
  await page.getByPlaceholder('What changed and why').fill('Add door frame at grid C-4');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByText('Saved').waitFor();
  await page.waitForURL(/\/tags\/\d+\/details/);
  const tagNumber = await page.locator('.detail-head h2').innerText();
  assert.match(tagNumber, /NEW-\d+/);

  await page.getByRole('link', { name: 'Cost' }).click();
  await page.getByRole('button', { name: 'Add Labor' }).click();
  await pickOption(page, 'Resource', 'Jacob S Adams');
  await pickOption(page, 'Trade', 'Framing');
  await page.getByLabel('Regular').fill('7');
  await page.getByRole('link', { name: 'Expenses' }).click();
  await page.getByRole('button', { name: 'Add Expense' }).click();
  await pickOption(page, 'Expense', 'Parking');
  assert.equal(await page.getByLabel('Amount').inputValue(), '35.00', 'default amount from expenses_master');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByText('Saved').waitFor();

  await page.getByRole('link', { name: 'Sign' }).click();
  await page.getByRole('combobox', { name: 'Approver' }).fill('Sean Hubert');
  await page.keyboard.press('Enter');
  const box = await page.locator('canvas.sig-pad').boundingBox();
  await page.mouse.move(box.x + 30, box.y + 100);
  await page.mouse.down();
  for (let i = 0; i < 15; i++) await page.mouse.move(box.x + 30 + i * 14, box.y + 100 + Math.sin(i) * 30);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.locator('.detail-head .status-pill', { hasText: 'Signed' }).waitFor();
  assert.ok(await page.getByText('can no longer be edited').isVisible());
});

test('the signed tag shows in the list after a reload', async () => {
  const { page } = ctx;
  await page.goto(BASE_URL);
  const card = page.locator('.tag-card', { hasText: 'Add door frame at grid C-4' }).first(); // newest first
  await card.waitFor();
  assert.equal(await card.locator('.status-pill').innerText(), 'Signed');
});

test('blocks submitting an incomplete tag', async () => {
  const { page } = ctx;
  await page.goto(`${BASE_URL}/tags/new/sign`);
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByText('Select a job on the Details tab').waitFor();
  await page.waitForURL(/\/details$/);
});
