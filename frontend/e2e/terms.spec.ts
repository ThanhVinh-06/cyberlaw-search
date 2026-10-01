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
  for (const width of [320,440,834,1440]) {
    await page.setViewportSize({width,height:width===320?760:1000}); await page.goto('/terms');
    await expect(page.getByRole('heading',{name:'Từ điển thuật ngữ'})).toBeVisible();
    await expect(page.getByText('An ninh mạng',{exact:true})).toBeVisible();
    await page.getByLabel('Tìm thuật ngữ').fill('an ninh mang'); await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await expect(page.getByText('An ninh mạng',{exact:true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const calls=await page.evaluate(()=> (window as any).termReveals); expect(calls.every((x:any)=>x.duration===950)).toBeTruthy();
});
