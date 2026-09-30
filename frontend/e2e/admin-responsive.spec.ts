import { mockAuth } from "./auth-fixtures";
import { test, expect, type Page } from "./auth-fixtures";

test("phone touch menu switches all four tabs and releases scroll lock", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await openAdmin(page);
    for (let index = 0; index < 4; index++) {
      await page.getByRole("button", { name: "Mở menu quản trị" }).tap();
      const drawer = page.getByRole("dialog", { name: "Điều hướng quản trị" });
      const box = (await drawer.boundingBox())!;
      expect(box.width).toBeLessThan(440);
      if (index === 0)
        await page.screenshot({ path: "test-results/admin-mobile-menu.png" });
      await drawer.locator(".cl-admin-nav-item").nth(index).tap();
      await expect(drawer).toHaveCount(0);
      await expect(page.locator("body")).not.toHaveCSS(
        "pointer-events",
        "none",
      );
      await checkHeader(page);
    }
  } finally {
    await context.close();
  }
});

async function openAdmin(page: Page) {
  await mockAuth(page, "admin");
  await page.goto("/admin");
  await page.evaluate(() => document.fonts.ready);
}

async function checkHeader(page: Page) {
  const header = page.locator(".cl-admin-topbar");
  const box = (await header.boundingBox())!;
  for (const selector of [
    ".cl-admin-breadcrumb-active",
    ".cl-admin-topbar-actions",
    ".cl-admin-topbar-actions a",
  ]) {
    const element = header.locator(selector);
    const rect = (await element.boundingBox())!;
    expect(rect.y).toBeGreaterThanOrEqual(box.y);
    expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height + 1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width);
  }
  await expect(header.locator(".cl-admin-breadcrumb-active")).toHaveCSS(
    "white-space",
    "nowrap",
  );
  const crumb = (await header.locator(".cl-admin-breadcrumb").boundingBox())!;
  const actions = (await header
    .locator(".cl-admin-topbar-actions")
    .boundingBox())!;
  expect(crumb.x + crumb.width).toBeLessThanOrEqual(actions.x);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}

for (const width of [320, 440, 834, 900, 901, 956, 1024, 1440]) {
  test(`four admin tabs stay readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 956 ? 440 : width < 600 ? 956 : 1050 });
    await openAdmin(page);
    await page.screenshot({
      path: `test-results/admin-header-initial-${width}.png`,
    });
    await checkHeader(page);
    const labels = [
      "Người dùng & Phân quyền",
      "Ma trận quyền hạn",
      "Thống kê & Báo cáo",
      "Văn bản & Tri thức",
    ];
    for (const [index, label] of labels.entries()) {
      if (width <= 900) {
        await page.getByRole("button", { name: "Mở menu quản trị" }).click();
        const drawer = page.getByRole("dialog", {
          name: "Điều hướng quản trị",
        });
        await expect(drawer).toBeVisible();
        await drawer.getByRole("button", { name: label, exact: true }).click();
        await expect(drawer).toHaveCount(0);
      } else {
        await page
          .locator("aside.cl-admin-sidebar")
          .getByRole("button", { name: label, exact: true })
          .click();
      }
      await checkHeader(page);
      // Headings can truncate but must remain a single readable line on phones.
      if (width <= 600) {
        const title = page.locator("main h1").first();
        await expect(title).toHaveCSS("text-overflow", "ellipsis");
        const dimensions = await title.evaluate((el) => ({
          height: el.clientHeight,
          line: parseFloat(getComputedStyle(el).lineHeight),
        }));
        expect(dimensions.height).toBeLessThanOrEqual(dimensions.line + 1);
      }
      if (index === 0 || index === 1) {
        await expect(page.locator('.cl-admin-table-responsive')).toBeVisible();
        if (index === 1) {
          const actions = page.locator('.cl-matrix-actions');
          const badge = (await actions.locator('.cl-admin-status-pill').boundingBox())!;
          const reload = (await actions.getByRole('button', {name:'Tải lại ma trận'}).boundingBox())!;
          expect(reload.y).toBeGreaterThanOrEqual(badge.y + badge.height);
          expect(reload.x + reload.width).toBeLessThanOrEqual(width);
        }
        if (index === 0) {
          const nameLines = await page
            .locator(".cl-admin-user-cell-name")
            .evaluateAll((cells) =>
              cells.map(
                (cell) =>
                  cell.getBoundingClientRect().height /
                  parseFloat(getComputedStyle(cell).lineHeight),
              ),
            );
          expect(Math.max(...nameLines)).toBeLessThanOrEqual(2.1);
        }
        const table = page.locator(".cl-admin-table-responsive");
        const tableBox = (await table.boundingBox())!;
        expect(tableBox.x + tableBox.width).toBeLessThanOrEqual(width);
        const scrollable = await table.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
          return el.scrollWidth <= el.clientWidth || el.scrollLeft > 0;
        });
        expect(scrollable).toBe(true);
      }
      if (width === 440)
        await page.waitForFunction(() =>
          document
            .getAnimations()
            .every(
              (animation) =>
                animation.effect?.getTiming().iterations === Infinity ||
                animation.playState !== "running",
            ),
        );
      if (width === 440)
        await page.screenshot({
          path: `test-results/admin-mobile-tab-${index}.png`,
        });
    }
    if (width <= 900) {
      await page.getByRole("button", { name: "Mở menu quản trị" }).click();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Điều hướng quản trị" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Mở menu quản trị" }),
      ).toBeFocused();
    }
  });
}
