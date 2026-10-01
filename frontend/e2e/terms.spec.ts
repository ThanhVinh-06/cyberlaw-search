import { test, expect, mockAuth } from './auth-fixtures';

const article = {id:'2',category:'definition',label:'Khái niệm',title:'Điều 2 khoản 1. Giải thích từ ngữ',summary:'Khái niệm',text:'An ninh mạng là sự ổn định của không gian mạng.',note:'Luật số 116/2025/QH15.',source:'https://example.test/source',so_dieu:'2',so_khoan:'1'};
const term = {id:'1',cum_tu:'An ninh mạng',bien_the:['an ninh mang'],dinh_nghia:'Sự ổn định của không gian mạng.',article};

test('terms loads, searches without accents and stays within mobile width', async ({page}) => {
  await mockAuth(page,'user');
  await page.route('**/api/terms*', route => route.fulfill({json:{items:[term],total:1,page:1,per_page:12}}));
  await page.addInitScript(() => {
    (window as any).termReveals=[]; const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){if(this.hasAttribute('data-admin-reveal')) (window as any).termReveals.push(options); return original.call(this,frames,options)};
  });
  for (const [width, height] of [[320, 568], [440, 956], [760, 956], [761, 956], [834, 1194], [956, 440], [1150, 900], [1151, 900], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Từ điển thuật ngữ' })).toBeVisible();
    const reloadBtn = page.getByRole('button', { name: 'Tải lại dữ liệu' });
    await expect(reloadBtn).toBeVisible();
    await expect(reloadBtn.locator('svg')).toBeVisible();

    const termCard = page.locator('.cl-term-card').first();
    await expect(termCard).toBeVisible();
    const termBottom = termCard.locator('.cl-term-bottom');
    await expect(termBottom).toBeVisible();
    // Check that button is centered in card
    const isCentered = await termBottom.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.justifyContent === 'center' && style.display === 'flex';
    });
    expect(isCentered).toBe(true);

    // Clicking anywhere on the box (card) opens the popup dialog
    await termCard.click({ position: { x: 30, y: 30 } });
    const dialog = page.getByRole('dialog', { name: 'Căn cứ pháp lý' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Điều 2.');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Clicking directly on the button also opens the popup dialog
    const linkBtn = termCard.getByRole('button', { name: /^Xem .*Điều 2/ });
    await expect(linkBtn).toBeVisible();
    await linkBtn.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.getByLabel('Tìm thuật ngữ').fill('an ninh mang');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await expect(page.getByText('An ninh mạng', { exact: true })).toBeVisible();
    await reloadBtn.click();
    await expect(page.getByText('An ninh mạng', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const calls = await page.evaluate(() => (window as any).termReveals);
  expect(calls.every((x: any) => x.duration === 950)).toBeTruthy();
});
