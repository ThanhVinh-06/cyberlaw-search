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
      const animation = original.call(this, frames, options);
      if (this.matches('.cl-admin-table-card')) (window as any).tableReveals.push({frames, options, animation});
      return animation;
    };
  });
  await page.goto('/search');
  await page.locator('.cl-sidebar').getByRole('link', {name:'Quản trị hệ thống'}).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Đang tải tài khoản…')).toBeVisible();
  await expect(page.getByText('Không tìm thấy người dùng nào')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).tableReveals.filter((r: any) => r.animation.playState !== 'idle').length)).toBe(1);
  const entrance = await page.evaluate(() => (window as any).tableReveals.find((r: any) => r.animation.playState !== 'idle'));
  expect(entrance.options.duration).toBe(1200);
  expect(entrance.options.delay).toBe(290);
  release();
  await expect(page.locator('.cl-admin-table tbody tr')).not.toHaveCount(0);
  expect(await page.evaluate(() => (window as any).tableReveals.filter((r: any) => r.animation.playState !== 'idle').length)).toBe(1);
  // No moving ancestor adds a second entrance to the table.
  expect(await page.locator('.cl-admin-table-card').evaluate(el => {
    let parent = el.parentElement;
    while (parent) {
      if (parent.getAnimations().some(a => a.playState === 'running')) return true;
      parent = parent.parentElement;
    }
    return false;
  })).toBe(false);
  await expect(page.locator('.cl-admin-table-card')).toHaveCSS('translate', 'none');
  const card = page.locator('.cl-admin-table-card');
  await page.getByRole('button', {name:'Tải lại dữ liệu'}).scrollIntoViewIfNeeded();
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
  expect(await page.evaluate(() => (window as any).tableReveals.filter((r: any) => r.animation.playState !== 'idle').length)).toBe(1);
});

test('reload and internal user-tab entries use a single slower synchronized entrance', async ({page}) => {
  await mockAuth(page, 'admin');
  await page.addInitScript(() => {
    (window as any).entries = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      const animation = original.call(this, frames, options);
      if (this.matches('.cl-admin-table-card, .cl-admin-stat-card')) {
        (window as any).entries.push({table:this.matches('.cl-admin-table-card'), options, animation});
      }
      return animation;
    };
  });
  await page.goto('/search');
  await page.locator('.cl-sidebar').getByRole('link', {name:'Quản trị hệ thống'}).click();
  await expect(page.locator('.cl-admin-table-card')).toBeVisible();
  await page.reload();
  const check = async () => {
    await expect(page.locator('.cl-admin-table-card')).toHaveCSS('translate','none');
    // React StrictMode probes newly mounted effects and cancels the first run.
    // Only count animations that actually run/finish, not canceled probes.
    const calls = await page.evaluate(() => (window as any).entries.filter((c: any) => c.animation.playState !== 'idle').map((c: any) => ({table:c.table,options:c.options})));
    expect(calls.filter((c: any) => c.table)).toHaveLength(1);
    expect(calls.every((c: any) => c.options.duration === 1200)).toBe(true);
  };
  await check();
  for (const tab of ['Ma trận quyền hạn', 'Thống kê & Báo cáo', 'Văn bản & Tri thức']) {
    const sidebar = page.locator('aside.cl-admin-sidebar');
    await sidebar.getByRole('button', {name:tab,exact:true}).click();
    await page.evaluate(() => { (window as any).entries = []; });
    await sidebar.getByRole('button', {name:'Người dùng & Phân quyền',exact:true}).click();
    await check();
  }
});
