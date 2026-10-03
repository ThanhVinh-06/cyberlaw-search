import { test, expect, type Page } from "./auth-fixtures";

async function settle(page: Page) {
  await expect
    .poll(() =>
      page
        .locator("#cl-chat-panel")
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe("none");
  await expect
    .poll(() =>
      page
        .locator(".cl-chat-content")
        .evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
}

test("account popovers share the morph, fit the viewport and preserve the form", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, width, height] of [
    ["login", 1440, 1000],
    ["register", 390, 844],
    ["login", 320, 568],
    ["register", 844, 390],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`/${route}`);
    const email = page.getByLabel("Địa chỉ email");
    await email.fill("demo@example.com");
    const launcher = page.getByRole("button", {
      name: "Mở trò chuyện với trợ lý AI",
    });
    await launcher.click();
    const dialog = page.getByRole("dialog", {
      name: "Trò chuyện với trợ lý CyberLaw",
    });
    // The account pages run the same assistant as the public site, so the panel opens
    // on the real conversation rather than a "coming soon" placeholder.
    await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
    await expect(dialog).toContainText("Xin chào, tôi là trợ lý CyberLaw.");
    await settle(page);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    await page.screenshot({
      path: testInfo.outputPath(`account-chat-${width}.png`),
    });
    await dialog.getByRole("button", { name: "Đóng trò chuyện" }).click();
    await expect(launcher).toBeFocused();
    await launcher.click();
    await expect(dialog).toHaveCount(1);
    await email.click();
    await expect(email).toBeFocused();
    await expect(email).toHaveValue("demo@example.com");
    await expect(dialog).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("account popover supports keyboard, reduced motion and a real answer", async ({
  page,
}) => {
  await page.goto("/login");
  const launcher = page.getByRole("button", {
    name: "Mở trò chuyện với trợ lý AI",
  });
  await launcher.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cl-chat-panel")).toHaveCSS("transform", "none");
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await launcher.click();
  await expect(page.locator("#cl-chat-panel")).toHaveCSS("transform", "none");
  // An anonymous visitor on the account pages is answered like a signed-in user.
  await page.getByRole("button", { name: "An ninh mạng là gì?" }).click();
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await page.getByRole("button", { name: "Mở Điều 2" }).click();
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toHaveCount(0);
});

test("chat morphs from its launcher and keeps draft and messages on reopen", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search");
  const launcher = page.getByRole("button", {
    name: "Mở trò chuyện với trợ lý AI",
  });
  const initialBox = await launcher.boundingBox();
  await launcher.click();
  const dialog = page.getByRole("dialog", {
    name: "Trò chuyện với trợ lý CyberLaw",
  });
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
  await settle(page);
  await expect(page.locator(".cl-result h3").first()).toHaveCSS("opacity", "1");
  const expanded = await dialog.boundingBox();
  expect(expanded!.width).toBeGreaterThan(initialBox!.width);
  expect(expanded!.height).toBeGreaterThan(initialBox!.height);
  expect(expanded!.x + expanded!.width).toBeCloseTo(
    initialBox!.x + initialBox!.width,
    0,
  );
  expect(expanded!.y + expanded!.height).toBeCloseTo(
    initialBox!.y + initialBox!.height,
    0,
  );
  await page.screenshot({ path: testInfo.outputPath("chat-desktop.png") });
  await page.getByRole("button", { name: "An ninh mạng là gì?" }).click();
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await page.getByLabel("Câu hỏi cho trợ lý AI").fill("Câu hỏi đang soạn");
  await page.getByRole("button", { name: "Đóng trò chuyện" }).click();
  await expect(launcher).toBeFocused();
  // Reopen while the return animation can still be running.
  await launcher.click();
  await expect(dialog).toHaveCount(1);
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toHaveValue(
    "Câu hỏi đang soạn",
  );
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await page.getByRole("button", { name: "Mở Điều 2" }).click();
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
  expect(errors).toEqual([]);
});

test("keyboard and reduced motion avoid morphing; outside click keeps its focus", async ({
  page,
}) => {
  await page.goto("/search");
  const launcher = page.getByRole("button", {
    name: "Mở trò chuyện với trợ lý AI",
  });
  await launcher.focus();
  await page.keyboard.press("Enter");
  expect(
    await page
      .locator("#cl-chat-panel")
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await launcher.click();
  expect(
    await page
      .locator("#cl-chat-panel")
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  await page.getByLabel("Từ khóa hoặc câu hỏi").click();
  await expect(page.getByLabel("Từ khóa hoặc câu hỏi")).toBeFocused();
  await expect(
    page.getByRole("dialog", { name: "Trò chuyện với trợ lý CyberLaw" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hỏi đáp cùng AI AI", exact: true })
    .click();
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
});

test("chat fits small screens and short viewports", async ({
  page,
}, testInfo) => {
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/search");
    await page
      .getByRole("button", { name: "Mở trò chuyện với trợ lý AI" })
      .click();
    await settle(page);
    const box = await page.locator("#cl-chat-panel").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`chat-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Mở trò chuyện với trợ lý AI" }),
    ).toBeFocused();
  }
});
