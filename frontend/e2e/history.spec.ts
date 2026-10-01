import { test, expect, mockAuth } from './auth-fixtures';

test('history loads a private conversation, shows citation snapshot and deletes it', async ({page}) => {
  await mockAuth(page,'user');
  let deleted=false;
  await page.route('**/api/history?*', route => route.fulfill({json: deleted ? {items:[],total:0,page:1,per_page:12} : {items:[{id:'7',title:'Câu hỏi riêng',updated_at:'2026-10-02T10:00:00Z'}],total:1,page:1,per_page:12}}));
  await page.route('**/api/history/7?*', route => route.fulfill({json:{id:'7',title:'Câu hỏi riêng',page:1,total:1,per_page:20,messages:[{id:'9',role:'assistant',text:'<script>alert(1)</script> Câu trả lời',status:'answered',created_at:'2026-10-02T10:00:00Z',citations:[{id:'2',law:'116/2025/QH15',title:'Luật An ninh mạng',version:1,article:'2',clause:'1',point:'',text:'Nguyên văn căn cứ',source:'javascript:alert(1)',page:3}]}]}}));
  await page.route('**/api/auth/csrf', route => route.fulfill({json:{csrf_token:'fixture-csrf'}}));
  await page.route('**/api/history/7', route => { deleted=true; return route.fulfill({json:{deleted:true}}); });
  await page.addInitScript(() => {
    (window as any).historyReveals=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.hasAttribute('data-admin-reveal')) (window as any).historyReveals.push(options);
      return original.call(this,frames,options);
    };
  });
  await page.goto('/history');
  await expect(page.getByRole('button',{name:'Câu hỏi riêng'})).toBeVisible();
  await page.getByRole('button',{name:'Câu hỏi riêng'}).click();
  await expect(page.getByText('<script>alert(1)</script> Câu trả lời')).toBeVisible();
  await expect(page.locator('.cl-history-detail script')).toHaveCount(0);
  await page.getByText(/Căn cứ:.*Điều 2/).click();
  await expect(page.getByText('Nguyên văn căn cứ')).toBeVisible();
  await expect(page.locator('.cl-history-detail a')).toHaveCount(0);
  const initial=await page.evaluate(()=>(window as any).historyReveals);
  expect(initial.every((x:any)=>x.duration===950)).toBeTruthy();
  for (const [width,height] of [[320,568],[440,956],[760,956],[761,956],[834,1194],[956,440],[1150,900],[1151,900],[1440,1000]]) {
    await page.setViewportSize({width,height});
    await expect(page.getByText('Nguyên văn căn cứ')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const selector of ['.cl-history-detail','.cl-history-select']) {
      const box=(await page.locator(selector).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    }
  }
  expect(await page.evaluate(()=>(window as any).historyReveals.length)).toBe(initial.length);
  await page.getByRole('button',{name:'Xóa hội thoại'}).click();
  await page.getByRole('button',{name:'Xác nhận xóa'}).click();
  await expect(page.getByRole('heading',{name:'Bạn chưa có cuộc hỏi đáp nào'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

test('history clears private content on expired session and supports retry after failure', async ({page})=>{
  await mockAuth(page,'user');
  let status=500;
  await page.route('**/api/history?*',route=>route.fulfill({status,json:status===200 ? {items:[{id:'1',title:'Hội thoại đã lưu',updated_at:null}],total:1,page:1,per_page:12} : {message:'Unavailable'}}));
  await page.goto('/history');
  await expect(page.getByRole('alert')).toBeVisible();
  status=200;
  const reloadBtn = page.getByRole('button',{name:'Tải lại dữ liệu'});
  await expect(reloadBtn).toBeVisible();
  await expect(reloadBtn.locator('svg')).toBeVisible();
  await reloadBtn.click();
  await expect(page.getByRole('button',{name:'Hội thoại đã lưu'})).toBeVisible();
  status=401;
  await reloadBtn.click();
  await expect(page.getByRole('link',{name:'Đăng nhập lại'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Hội thoại đã lưu'})).toHaveCount(0);
});
