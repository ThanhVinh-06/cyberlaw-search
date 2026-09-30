import { test, expect, mockAuth } from './auth-fixtures';

test('public tabs reveal once; typing and AI do not replay page entrances', async ({page}) => {
  await mockAuth(page, 'user');
  await page.addInitScript(() => {
    (window as any).reveals = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.hasAttribute('data-admin-reveal')) (window as any).reveals.push({frames, options});
      return original.call(this, frames, options);
    };
  });
  await page.goto('/search');
  await expect.poll(() => page.evaluate(() => (window as any).reveals.length)).toBeGreaterThan(0);
  const count = await page.evaluate(() => (window as any).reveals.length);
  await page.getByLabel('Từ khóa hoặc câu hỏi').fill('Điều 2');
  expect(await page.evaluate(() => (window as any).reveals.length)).toBe(count);
  await page.getByRole('button', {name: /Hỏi đáp cùng AI/}).click();
  expect(await page.evaluate(() => (window as any).reveals.length)).toBe(count);
  await page.keyboard.press('Escape');
  for (const [route, label] of [['/library', 'Thư viện văn bản'], ['/terms','Từ điển thuật ngữ'], ['/history','Lịch sử hỏi đáp'], ['/search','Tra cứu pháp luật']]) {
    const before = await page.evaluate(() => (window as any).reveals.length);
    await page.locator('.cl-sidebar').getByRole('link', {name:label, exact:true}).click();
    await expect(page).toHaveURL(new RegExp(route));
    await expect.poll(() => page.evaluate(() => (window as any).reveals.length)).toBeGreaterThan(before);
  }
  const calls = await page.evaluate(() => (window as any).reveals);
  expect(calls.every((c: any) => c.options.duration === 950)).toBe(true);
});

for (const width of [320,440,760,761,834,956,1150,1151,1440]) {
  test(`public views and glossary expansion fit ${width}px`, async ({page}) => {
    const height = width === 956 ? 440 : 1000;
    await page.setViewportSize({width,height});
    await mockAuth(page,'user');
    for (const route of ['/search','/library','/history','/terms']) {
      await page.goto(route);
      await expect(page.locator('.cl-view')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const trigger = page.getByRole('button', {name:'Xem khoản 1 Điều 2'});
    await trigger.click();
    const dialog = page.getByRole('dialog', {name:'Căn cứ pháp lý'});
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('transform','none');
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.height).toBeLessThanOrEqual(height);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.emulateMedia({reducedMotion:'reduce'});
    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('transform','none');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}
