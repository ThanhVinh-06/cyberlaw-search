import {test, expect, mockAuth} from './auth-fixtures';

test('user table waits for first data and does not jump or replay during reload', async ({page}) => {
  await mockAuth(page, 'admin');
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/admin/users**', async route => {
    await pending;
    await route.fallback();
  });
  await page.addInitScript(() => {
    (window as any).tableReveals = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.matches('.cl-admin-table-card')) (window as any).tableReveals.push({frames, options});
      return original.call(this, frames, options);
    };
  });
  await page.goto('/admin');
  await expect(page.getByText('Đang tải tài khoản…')).toBeVisible();
  await expect(page.getByText('Không tìm thấy người dùng nào')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).tableReveals.length)).toBe(0);
  release();
  await expect(page.locator('.cl-admin-table tbody tr')).not.toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).tableReveals.length)).toBe(1);
  await expect(page.locator('.cl-admin-table-card')).toHaveCSS('translate', 'none');
  const card = page.locator('.cl-admin-table-card');
  const before = (await card.boundingBox())!;
  let finishReload!: () => void;
  const reloadPending = new Promise<void>(resolve => { finishReload = resolve; });
  await page.route('**/api/admin/users**', async route => {
    await reloadPending;
    await route.fallback();
  });
  await page.getByRole('button', {name:'Tải lại dữ liệu'}).click();
  await expect(page.getByText('Đang tải tài khoản…')).toBeVisible();
  const during = (await card.boundingBox())!;
  expect(during.y).toBeCloseTo(before.y, 0);
  expect(during.height).toBeCloseTo(before.height, 0);
  finishReload();
  await expect(page.getByText('Đang tải tài khoản…')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).tableReveals.length)).toBe(1);
});
