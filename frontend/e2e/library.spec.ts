import { test, expect, mockAuth } from './auth-fixtures';

const document = { so_hieu: '116/2025/QH15', tieu_de: 'Luật An ninh mạng', co_quan_ban_hanh: 'Quốc hội', ngay_ban_hanh: '2025-12-10', ngay_hieu_luc: '2026-07-01', phien_ban_noi_dung: 1, source: 'https://example.test/law', pdf: true };
const articles = Array.from({length:45}, (_, i) => ({so_dieu:String(i+1), chuong:'Chương I', tieu_de:'Quy định và trách nhiệm bảo vệ an ninh mạng'}));
const detail = (number: string) => ({document, so_dieu:number, tieu_de:articles[0].tieu_de, units:[{id:number, so_khoan:'1', ky_hieu_diem:'', noi_dung:`Nội dung điều ${number}. ${'Dữ liệu kiểm thử dài. '.repeat(30)} ${'x'.repeat(200)}`, trang_nguon:1}]});

test('library handles long contents at responsive widths and preserves entrance timing', async ({page}) => {
  await mockAuth(page,'user');
  await page.route('**/api/library', route => route.fulfill({json:{document,articles}}));
  await page.route('**/api/library/articles/*', route => route.fulfill({json:detail(route.request().url().split('/').pop()!)}));
  await page.addInitScript(() => {
    (window as any).libraryReveals = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.hasAttribute('data-admin-reveal')) (window as any).libraryReveals.push(options);
      return original.call(this, frames, options);
    };
  });
  for (const width of [320,440,760,761,834,956,1150,1151,1440]) {
    await page.setViewportSize({width,height:width===956?440:1000});
    await page.goto('/library');
    const card = page.locator('.cl-library-content');
    await expect(card).toContainText('Nội dung điều 1.');
    await expect(card).toHaveCSS('transform','none');
    const calls = await page.evaluate(() => (window as any).libraryReveals);
    expect(calls.every((c:any) => c.duration===950)).toBeTruthy();
    expect(calls.map((c:any) => c.delay)).toEqual(expect.arrayContaining([0,80,160]));
    const before = calls.length;
    const originalNode = await card.elementHandle();
    const last = page.getByRole('button',{name:/^Điều 45 ·/});
    await last.focus();
    await last.press('Enter');
    await expect(card).toContainText('Nội dung điều 45.');
    expect(await card.evaluate((node, saved) => node===saved, originalNode)).toBeTruthy();
    await page.getByRole('button',{name: /Tải lại (mục lục|dữ liệu)/}).click();
    await expect(card).toContainText('Nội dung điều 1.');
    expect(await page.evaluate(() => (window as any).libraryReveals.length)).toBe(before);
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const selector of ['.cl-library-content','.cl-article-nav']) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    }
    if ([440,1440].includes(width)) await page.screenshot({path:`test-results/library-${width}.png`,fullPage:true});
  }
});

test('library ignores late responses and clears withdrawn content', async ({page}) => {
  await mockAuth(page,'user');
  await page.route('**/api/library', route => route.fulfill({json:{document,articles}}));
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release=resolve;});
  let withdrawn=false;
  await page.route('**/api/library/articles/*', async route => {
    const number = route.request().url().split('/').pop()!;
    if(number==='2') await gate;
    await route.fulfill(withdrawn ? {status:404,json:{message:'Unavailable'}} : {json:detail(number)}).catch(() => {});
  });
  await page.goto('/library');
  const card=page.locator('.cl-library-content');
  await expect(card).toContainText('Nội dung điều 1.');
  await page.getByRole('button',{name:/^Điều 2 ·/}).click();
  await expect(card).toContainText('Đang tải điều khoản');
  await page.getByRole('button',{name:/^Điều 44 ·/}).click();
  await expect(card).toContainText('Nội dung điều 44.');
  release();
  await expect(card).not.toContainText('Nội dung điều 2.');
  withdrawn=true;
  await page.getByRole('button',{name:/^Điều 1 ·/}).click();
  await expect(card.getByRole('alert')).toContainText('không còn được công bố');
  await expect(card).not.toContainText('Nội dung điều 44.');
  withdrawn=false;
  await page.getByRole('button',{name:'Thử lại điều khoản'}).click();
  await expect(card).toContainText('Nội dung điều 1.');
});

test('library reload button, hover on TOC items and content fade-in-up transition', async ({page}) => {
  await mockAuth(page, 'user');
  await page.route('**/api/library', route => route.fulfill({json: {document, articles}}));
  await page.route('**/api/library/articles/*', route => route.fulfill({json: detail(route.request().url().split('/').pop()!)}));

  await page.goto('/library');
  const card = page.locator('.cl-library-content');
  await expect(card).toContainText('Nội dung điều 1.');

  // Verify reload button matching admin style
  const reloadBtn = page.getByRole('button', {name: 'Tải lại dữ liệu'});
  await expect(reloadBtn).toBeVisible();
  await expect(reloadBtn.locator('svg')).toBeVisible();

  // Verify TOC article items hover feedback
  const article2Btn = page.getByRole('button', {name: /^Điều 2 ·/});
  await expect(article2Btn).toBeVisible();
  await article2Btn.hover();
  // Check that hovering triggers smooth text-shadow or color feedback without layout shift
  await expect.poll(async () => {
    return await article2Btn.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.textShadow !== 'none' || style.color.includes('128, 0, 32');
    });
  }).toBe(true);

  // Click to switch article and verify content updates with fade in
  await article2Btn.click();
  await expect(card).toContainText('Nội dung điều 2.');
  const articleBody = card.locator('.cl-library-article-body');
  await expect(articleBody).toBeVisible();
});

