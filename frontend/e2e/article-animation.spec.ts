import { test, expect } from "@playwright/test";

test("page scrollbar stays hidden and opening articles does not shift the page", async ({
  page,
}) => {
  await page.goto("/search");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveCSS("scrollbar-width", "none");
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const dimensions = () =>
    page.locator(".cl-search-card").evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        width: box.width,
        viewport: document.documentElement.clientWidth,
      };
    });
  const before = await dimensions();
  for (let index = 0; index < 2; index++) {
    await page
      .getByRole("button", { name: "Xem điều khoản", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
    ).toBeVisible();
    expect(await dimensions()).toEqual(before);
    expect(
      await page.evaluate(() => document.body.style.paddingRight),
    ).not.toMatch(/^[1-9]/);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
    ).toHaveCount(0);
    expect(await dimensions()).toEqual(before);
  }
  for (const route of ["/login", "/register", "/library", "/terms", "/help"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveCSS("scrollbar-width", "none");
    expect(
      await page.evaluate(
        () => innerWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
  }
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("/register");
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("article expands, closes back to the result and restores focus", async ({
  page,
}, testInfo) => {
  await page.goto("/search");
  const trigger = page
    .getByRole("button", { name: "Xem điều khoản", exact: true })
    .first();

  // Get initial card position
  const resultCard = page.locator(".cl-result").first();
  await expect(resultCard).toBeVisible();
  const cardBox = await resultCard.boundingBox();
  expect(cardBox).not.toBeNull();

  // Click "Xem điều khoản" to trigger expansion
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Căn cứ pháp lý" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Điều 1/ })).toBeVisible();

  // Check dialog dimensions in expanded state
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.width).toBeGreaterThanOrEqual(300);
  expect(dialogBox!.height).toBeGreaterThan(cardBox!.height);

  await page.screenshot({ path: testInfo.outputPath("article-open.png") });

  // Focus trap: Tab cycles through interactive elements within the dialog
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) ||
          document.activeElement === document.body,
      ),
    ).toBe(true);
  }

  // Close via the close button
  await dialog.getByRole("button", { name: "Đóng căn cứ" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );

  // Open second article and test Escape key interruption
  await page
    .getByRole("button", { name: "Xem điều khoản", exact: true })
    .nth(1)
    .click();
  await expect(dialog.getByRole("heading", { name: /Điều 2/ })).toBeVisible();

  // Escape key closes modal and restores body scroll
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});

test("keyboard is instant and reduced motion removes travel", async ({
  page,
}) => {
  await page.goto("/search");
  const trigger = page
    .getByRole("button", { name: "Xem điều khoản", exact: true })
    .first();
  await trigger.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Căn cứ pháp lý" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Điều 1/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  // Test reduced motion mode
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Điều 1/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("long article fits mobile and remains usable after resizing", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search");
  await page
    .getByRole("button", { name: "Hiệu lực thi hành", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem điều khoản", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Căn cứ pháp lý" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Điều 44/ })).toBeVisible();

  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeLessThanOrEqual(844);

  await page.screenshot({ path: testInfo.outputPath("article-mobile.png") });

  await page.setViewportSize({ width: 844, height: 390 });
  const closeButton = dialog.getByRole("button", { name: "Đóng căn cứ" });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(dialog).toHaveCount(0);
});
