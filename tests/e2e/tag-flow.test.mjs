// Editing an eMachine tag end to end, against the mock eMachine in helpers.mjs.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { BASE_URL, VIEWPORTS, openPage, pickOption } from './helpers.mjs';

let ctx;
before(async () => {
  ctx = await openPage(VIEWPORTS.phone);
});
after(async () => {
  assert.deepEqual(ctx.errors, [], 'no page errors or unmatched queries');
  await ctx.browser.close();
});

test('lists tags from eMachine', async () => {
  const { page } = ctx;
  await page.goto(BASE_URL);
  await page.locator('.tag-card', { hasText: 'D4355-1' }).waitFor();
  assert.ok(await page.getByText('Databricks').isVisible());
});

test('opens a tag with its cost lines', async () => {
  const { page } = ctx;
  await page.locator('.tag-card', { hasText: 'D4355-1' }).click();
  await page.getByRole('link', { name: 'Cost' }).click();
  assert.equal(await page.getByLabel('Regular').inputValue(), '7.00');
  await page.getByRole('link', { name: 'Expenses' }).click();
  assert.equal(await page.getByLabel('Amount').inputValue(), '35.00');
  // Saved lines can't be removed until eMachine's delete API is wired.
  assert.ok(await page.getByRole('button', { name: 'Remove expense' }).isDisabled());
});

test('saves only what changed, in eMachine’s format', async () => {
  const { page, writes } = ctx;
  await page.getByLabel('Amount').fill('40');
  await page.getByRole('link', { name: 'Labor' }).click();
  await page.getByRole('button', { name: 'Add Labor' }).click();
  await pickOption(page, 'Resource', 'Sean Hubert');
  await pickOption(page, 'Trade', 'Taping');
  await page.getByLabel('Regular').last().fill('2');
  await page.getByRole('link', { name: 'Details' }).click();
  await page.getByPlaceholder('What changed and why').fill('add door and frame');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByText('Saved', { exact: true }).waitFor();

  assert.deepEqual(writes, [
    { table: 'tags', fields: { Id: '9001', description: 'add door and frame' } },
    { table: 'tag_labor', fields: { tag_id: '9001', employee_id: '102', employee_name: 'Sean Hubert', trade_id: '3', regularhours: '2.00', overtime: '0.00', doubletime: '0.00' } },
    { table: 'tag_other_expenses', fields: { Id: '10000135', qty: '40.00' } },
  ]);
});

test('features without a known eMachine API are clearly disabled', async () => {
  const { page } = ctx;
  await page.getByRole('link', { name: 'Files' }).click();
  await page.getByText('isn’t connected to eMachine yet').first().waitFor();
  await page.getByRole('link', { name: 'Sign' }).click();
  assert.ok(await page.getByRole('button', { name: 'Submit' }).isDisabled());
  await page.goto(BASE_URL);
  const addTag = page.getByRole('button', { name: 'Add Tag' });
  assert.ok(await addTag.isDisabled(), 'Add Tag is marked disabled');
  await addTag.click({ force: true }); // still explains why when tapped
  await page.getByText('Creating new tags in eMachine isn’t connected yet').waitFor();
});
