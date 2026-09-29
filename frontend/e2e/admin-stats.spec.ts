import { mockAuth } from "./auth-fixtures";
import { test, expect, type Page } from "./auth-fixtures";

async function openStats(page: Page) {
  // Mock API responses for dashboard layout tests; server auth is tested separately.
  await mockAuth(page, "admin");
  await page.goto("/admin/stats");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".cl-question-card")).toHaveCount(5);
  await expect(page.locator(".cl-admin-stats-dashboard")).toHaveCSS(
    "transform",
    "none",
  );
}

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
