import { mockAuth } from "./auth-fixtures";
import { test, expect, type Page } from "./auth-fixtures";

async function openStats(page: Page) {
  // Mock API responses for dashboard layout tests; server auth is tested separately.
  await mockAuth(page, "admin");
  await page.goto("/admin/stats");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".cl-question-card")).toHaveCount(6);
  await expect(page.locator(".cl-admin-stats-dashboard")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(
    page.locator(".cl-stats-card").filter({ hasText: "Xu hướng Hỏi đáp AI & Tra cứu Pháp luật" }),
  ).toHaveAttribute("data-admin-reveal", "180");
  // Interaction geometry is measured after the staggered card entrances finish.
  // The separate entrance test inspects their actual keyframes and timing.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-admin-reveal]')].every(el =>
      el.getAnimations().every(animation => animation.playState !== 'running'),
    ),
  );
}

test('trend card animates upward once without replay on filter changes', async ({page}) => {
  await mockAuth(page, 'admin');
  await page.addInitScript(() => {
    (window as any).trendReveals = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.matches('.cl-stats-card[data-admin-reveal]')) {
        (window as any).trendReveals.push({frames, options, recent: this.classList.contains('cl-recent-questions')});
      }
      return original.call(this, frames, options);
    };
  });
  await page.goto('/admin/stats');
  await expect.poll(() => page.evaluate(() => (window as any).trendReveals.length)).toBeGreaterThan(0);
  const calls = await page.evaluate(() => (window as any).trendReveals);
  expect(calls.at(-1).frames).toEqual([{opacity:'0',translate:'0 14px'},{opacity:1,translate:'0 0'}]);
  expect(calls.every((call: any) => call.options.duration === 1200)).toBe(true);
  expect(calls.find((call: any) => call.recent).options.delay).toBe(300);
  await page.getByRole('button', {name:'6 tháng gần nhất'}).click();
  expect(await page.evaluate(() => (window as any).trendReveals.length)).toBe(calls.length);
});

test("classification is below AI accuracy; chart supports pinned points and keyboard", async ({
  page,
}) => {
  await openStats(page);
  const donut = await page.locator(".cl-donut-container").boundingBox();
  const classification = await page.locator(".cl-reg-card").boundingBox();
  const questions = await page.locator(".cl-recent-questions").boundingBox();
  expect(classification!.y).toBeGreaterThan(donut!.y + donut!.height);
  expect(classification!.x).toBeGreaterThan(questions!.x + questions!.width);
  expect(questions!.width).toBeGreaterThan(600);
  const chart = page.getByRole("slider").first();
  await chart.scrollIntoViewIfNeeded();
  const before = await chart.boundingBox();
  await chart.click({ position: { x: before!.width * (160.5 / 300), y: 40 } });
  await expect(chart).toHaveAttribute("aria-valuenow", "4");
  await expect(chart).toHaveAttribute("aria-valuetext", /36 quy định.*Đã ghim/);
  await page.mouse.move(0, 0);
  await expect(chart).toHaveAttribute("data-active", "true");
  expect((await chart.boundingBox())!.height).toBe(before!.height);
  await chart.press("Home");
  await expect(chart).toHaveAttribute("aria-valuenow", "1");
  await chart.press("ArrowRight");
  await expect(chart).toHaveAttribute("aria-valuetext", /28 quy định/);
  await chart.press("End");
  await expect(chart).toHaveAttribute("aria-valuenow", "7");
  await page.screenshot({
    path: "test-results/admin-stats-chart.png",
    fullPage: true,
  });
  await chart.press("Escape");
  await expect(chart).toHaveAttribute("data-active", "false");
});

test("question grows from its card, keeps the page steady and restores focus", async ({
  page,
}) => {
  await openStats(page);
  const card = page.locator(".cl-question-card").first();
  await card.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const original = await card.boundingBox();
  const neighborBefore = await page
    .locator(".cl-question-card")
    .nth(1)
    .boundingBox();
  const viewport = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  await page.evaluate(() => {
    const frames: { height: number; width: number; scale: string }[] = [];
    (window as any).__questionFrames = frames;
    const started = performance.now();
    function sample() {
      const dialog = document.querySelector(".cl-question-dialog");
      if (dialog) {
        const box = dialog.getBoundingClientRect();
        frames.push({
          height: box.height,
          width: box.width,
          scale: getComputedStyle(dialog).transform,
        });
      }
      if (performance.now() - started < 1400) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await card.click();
  const dialog = page.getByRole("dialog", { name: "CHI TIẾT HỎI ĐÁP" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("transform", "none");
  const expanded = await dialog.boundingBox();
  expect(expanded!.height).toBeGreaterThan(original!.height * 2);
  expect(
    (await page.locator(".cl-question-card").nth(1).boundingBox())!.y,
  ).toBeCloseTo(neighborBefore!.y, 0);
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(
    viewport,
  );
  const frames = await page.evaluate(
    () => (window as any).__questionFrames as { height: number }[],
  );
  expect(frames.length).toBeGreaterThan(4);
  const intermediate = frames.filter(
    (frame) =>
      frame.height > original!.height + 15 &&
      frame.height < expanded!.height - 15,
  );
  expect(intermediate.length).toBeGreaterThan(3);
  await page.screenshot({ path: "test-results/admin-stats-question.png" });
  await page.keyboard.press("Tab");
  await expect
    .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeFocused();
  // Closing during the opening spring must not leave the overlay or scroll lock behind.
  await card.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
  await card.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("transform", "none");
  await expect(
    dialog.getByRole("link", { name: "Mở thư viện pháp luật" }),
  ).toHaveAttribute("href", "/library");
  await dialog.getByRole("button", { name: "Đóng chi tiết hỏi đáp" }).click();
  await expect(dialog).toHaveCount(0);
  await card.click();
  await page.mouse.click(10, 10);
  await expect(dialog).toHaveCount(0);
});

test("chart tooltip follows the pointer within a data interval and guides ease between points", async ({
  page,
}) => {
  await openStats(page);
  const chart = page.getByRole("slider").first();
  await chart.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = (await chart.boundingBox())!;
  const tooltip = chart.locator(".cl-reg-tooltip");
  const guide = chart.locator(".cl-reg-guide-x");
  const moveTo = (x: number, y = 52) =>
    page.mouse.move(box.x + (x / 300) * box.width, box.y + y);
  await moveTo(150);
  await expect(chart).toHaveAttribute("aria-valuenow", "4");
  await expect(tooltip).toHaveCSS("opacity", "1");
  const first = (await tooltip.boundingBox())!;
  await moveTo(162, 58);
  await expect(chart).toHaveAttribute("aria-valuenow", "4");
  await expect
    .poll(async () => (await tooltip.boundingBox())!.x - first.x)
    .toBeGreaterThan(8);
  const second = (await tooltip.boundingBox())!;
  expect(second.x - first.x).toBeCloseTo((12 / 300) * box.width, 0);
  expect(second.y - first.y).toBeCloseTo(6, 0);

  const readX = () =>
    guide.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  await expect.poll(readX).toBeCloseTo(160.5, 0);
  // Record actual rendered positions, so a direct SVG-coordinate jump fails this test.
  await guide.evaluate((el) => {
    const samples: number[] = [];
    (window as any).__guideFrames = samples;
    const start = performance.now();
    const sample = () => {
      samples.push(new DOMMatrix(getComputedStyle(el).transform).m41);
      if (performance.now() - start < 350) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await moveTo(270);
  await expect(chart).toHaveAttribute("aria-valuenow", "7");
  await expect.poll(readX).toBeCloseTo(291, 0);
  const frames = await page.evaluate(
    () => (window as any).__guideFrames as number[],
  );
  expect(frames.filter((x) => x > 162 && x < 289).length).toBeGreaterThan(2);
  const last = await readX();
  await page.mouse.move(0, 0);
  await expect(chart).toHaveAttribute("data-active", "false");
  expect(await readX()).toBeCloseTo(last, 0);
  // Returning at the opposite edge starts at that point, without a fly-in.
  await moveTo(30);
  await expect(chart).toHaveAttribute("aria-valuenow", "1");
  expect(await readX()).toBeCloseTo(30, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await moveTo(270);
  await expect(guide).toHaveCSS("transition-duration", "0s");
  expect(await readX()).toBeCloseTo(291, 0);
});

for (const size of [
  { width: 440, height: 956 },
  { width: 834, height: 1194 },
]) {
  test(`stats and question detail fit ${size.width}px (${size.width === 834 ? "reduced" : "normal"} motion)`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.emulateMedia({
      reducedMotion: size.width === 834 ? "reduce" : "no-preference",
    });
    await openStats(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(size.width);
    const card = page.locator(".cl-question-card").first();
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.screenshot({
      path: `test-results/admin-stats-page-${size.width}.png`,
    });
    await card.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("transform", "none");
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    expect(box!.height).toBeLessThan(size.height);
    await expect(dialog).toHaveCSS("transform", "none");
    await dialog
      .getByRole("button", { name: "Sao chép phản hồi" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/admin-stats-${size.width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(card).toBeFocused();
  });
}

test("period tabs split chart into 4 weeks, 3 bi-months, and 6 bi-months without layout break", async ({
  page,
}) => {
  await openStats(page);

  // 1. Tab mặc định Năm 2026: 6 kỳ (mỗi kỳ 2 tháng)
  const colsYear = page.locator(".cl-barchart-col");
  await expect(colsYear).toHaveCount(6);
  const labelsYear = page.locator(".cl-barchart-x-label");
  await expect(labelsYear).toHaveText([
    "T01-02",
    "T03-04",
    "T05-06",
    "T07-08",
    "T09-10",
    "T11-12",
  ]);

  // 2. Chuyển sang 6 tháng gần nhất: 3 kỳ (mỗi kỳ 2 tháng)
  await page.getByRole("button", { name: "6 tháng gần nhất" }).click();
  const cols6m = page.locator(".cl-barchart-col");
  await expect(cols6m).toHaveCount(3);
  const labels6m = page.locator(".cl-barchart-x-label");
  await expect(labels6m).toHaveText(["T05-06", "T07-08", "T09-10"]);

  // 3. Chuyển sang 30 ngày qua: 4 tuần
  await page.getByRole("button", { name: "30 ngày qua" }).click();
  const cols30d = page.locator(".cl-barchart-col");
  await expect(cols30d).toHaveCount(4);
  const labels30d = page.locator(".cl-barchart-x-label");
  await expect(labels30d).toHaveText([
    "Tuần 1",
    "Tuần 2",
    "Tuần 3",
    "Tuần 4",
  ]);

  // 4. Hover vào cột để xác nhận tooltip hiển thị đầy đủ ngày trong tuần
  await cols30d.first().hover();
  const tooltip = page.locator(".cl-barchart-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Tuần 1 (02/09 – 08/09)");

  // 5. Kiểm tra không bị tràn layout
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("guest answers are shown as a separate metric and labelled in recent questions", async ({
  page,
}) => {
  await openStats(page);
  // Guests are not accounts, so their turns are counted apart from the account total.
  await expect(
    page.locator(".cl-stat-box").filter({ hasText: "Lượt hỏi đáp AI" }),
  ).toContainText("lượt từ khách vãng lai");
  // Lượt tra cứu pháp luật là số thật, hiển thị cùng thẻ.
  await expect(
    page.locator(".cl-stat-box").filter({ hasText: "Lượt hỏi đáp AI" }),
  ).toContainText("lượt tra cứu");
  // Legend không còn nhãn "chưa thu thập".
  await expect(page.locator(".cl-barchart-legend")).not.toContainText("chưa thu thập");
  // The guest conversation appears in the recent list under its own label.
  const guestRow = page.locator(".cl-question-card").filter({ hasText: "Khách vãng lai" });
  await expect(guestRow).toHaveCount(1);
  await expect(guestRow).toContainText("Không đăng nhập");
});

test("API 503 failure displays empty state and alert, resets properly without leaking demo figures", async ({
  page,
}) => {
  await mockAuth(page, "admin");
  let shouldFail = true;
  await page.route("**/api/admin/statistics**", async (route) => {
    if (shouldFail) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Dịch vụ thống kê tạm thời gián đoạn." }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.goto("/admin/stats");
  await expect(page.getByRole("alert")).toContainText("Dịch vụ thống kê tạm thời gián đoạn.");

  // Không leak các con số demo cũ
  const dashboardText = await page.locator(".cl-admin-stats-dashboard").innerText();
  expect(dashboardText).not.toContain("1.280");
  expect(dashboardText).not.toContain("3.450");
  expect(dashboardText).not.toContain("4.430");

  // Các thẻ chỉ số hiển thị "—"
  await expect(page.locator(".cl-stat-info-value").first()).toHaveText("—");

  // Danh sách câu hỏi và cột biểu đồ rỗng
  await expect(page.locator(".cl-question-card")).toHaveCount(0);
  await expect(page.locator(".cl-barchart-col")).toHaveCount(0);
  await expect(page.getByText("Chưa có dữ liệu truy vấn")).toBeVisible();

  // Chuyển cờ sang thành công và bấm tải lại khi API hồi phục
  shouldFail = false;
  await page.getByRole("button", { name: "Tải lại dữ liệu" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".cl-question-card")).toHaveCount(6);
  await expect(page.locator(".cl-barchart-col")).toHaveCount(6);
});

const EMPTY_VIEWPORTS = [
  { name: "320px small mobile", width: 320, height: 568 },
  { name: "440px iPhone 16 Pro Max", width: 440, height: 956 },
  { name: "834px iPad tablet", width: 834, height: 1194 },
  { name: "1440px desktop", width: 1440, height: 900 },
  { name: "956x440 landscape mobile", width: 956, height: 440 },
];

for (const vp of EMPTY_VIEWPORTS) {
  test(`empty state does not overflow or leak demo data at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await mockAuth(page, "admin");
    await page.route("**/api/admin/statistics*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Lỗi máy chủ nội bộ." }),
      }),
    );
    await page.goto("/admin/stats");
    await expect(page.getByRole("alert")).toBeVisible();
    const text = await page.locator(".cl-admin-stats-dashboard").innerText();
    expect(text).not.toContain("1.280");
    expect(text).not.toContain("3.450");
    expect(text).not.toContain("4.430");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

