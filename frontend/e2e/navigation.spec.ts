import { test, expect, type Page } from "@playwright/test";

async function useAdmin(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "cyberlaw_current_user",
      JSON.stringify({
        ma_nguoi_dung: 1,
        ho_ten: "Demo",
        thu_dien_tu: "admin@example.test",
        vai_tro: "admin",
        trang_thai: "active",
      }),
    ),
  );
}

async function settle(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
}

async function brandStyle(page: Page) {
  return page.locator("aside:visible .brand").evaluate((element) => {
    const style = getComputedStyle(element);
    const mark = element.querySelector(".brand-mark")!;
    const svg = mark.querySelector("svg")!;
    const slogan = element.querySelector("small")!;
    return {
      color: style.color,
      font: style.font,
      spacing: style.letterSpacing,
      mark: [
        mark.getBoundingClientRect().width,
        mark.getBoundingClientRect().height,
        getComputedStyle(mark).backgroundColor,
      ],
      icon: [
        svg.innerHTML,
        getComputedStyle(svg).width,
        getComputedStyle(svg).strokeWidth,
      ],
      slogan: [
        slogan.textContent,
        getComputedStyle(slogan).font,
        getComputedStyle(slogan).color,
      ],
      law: getComputedStyle(element.querySelector(".brand-law")!).color,
    };
  });
}

test("desktop sidebars, brand and primary actions stay consistent across routes", async ({
  page,
}) => {
  await useAdmin(page);
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/login");
    await page.evaluate(() => document.fonts.ready);
    const reference = await brandStyle(page);
    const primary = await page
      .locator(".submit-button")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    for (const route of [
      "/login",
      "/register",
      "/search",
      "/library",
      "/terms",
      "/admin",
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const sidebar = page.locator("aside:visible");
      await expect(sidebar).toHaveCSS("width", "270px");
      await expect(sidebar).toHaveCSS("background-color", "rgb(255, 254, 250)");
      expect(await brandStyle(page)).toEqual(reference);
      if (route === "/search")
        await expect(
          page.getByRole("button", { name: "Tìm kiếm", exact: true }),
        ).toHaveCSS("background-color", primary);
      if (route === "/admin")
        await expect(page.locator("[data-admin-user-add]")).toHaveCSS(
          "background-color",
          primary,
        );
      if (width === 1440 && ["/login", "/search", "/admin"].includes(route)) {
        await settle(page);
        await page.screenshot({
          path: `test-results/navigation-${route.slice(1)}-desktop.png`,
        });
      }
    }
  }
});

test("library and dictionary keep their labels and icons when leaving the account page", async ({
  page,
}) => {
  for (const [label, route] of [
    ["Thư viện văn bản", "/library"],
    ["Từ điển thuật ngữ", "/terms"],
  ]) {
    await page.goto("/login");
    const link = page.getByRole("link", { name: label, exact: true });
    const icon = await link.locator("svg").innerHTML();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    const activeLink = page.getByRole("link", { name: label, exact: true });
    await expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(await activeLink.locator("svg").innerHTML()).toBe(icon);
    await expect(page.locator(".cl-context-bar")).toContainText(label);
    if (route === "/terms")
      await expect(
        page.getByRole("heading", { name: label, exact: true }),
      ).toBeVisible();
  }
});

test("history follows login intent, shows current demo exchanges and clears on logout", async ({
  page,
}) => {
  await page.goto("/search");
  await expect(
    page.getByRole("link", { name: "Lịch sử hỏi đáp", exact: true }),
  ).toHaveCount(0);
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await page.getByRole("button", { name: "Điền User", exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(
    page.getByRole("heading", { name: "Lịch sử hỏi đáp", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quản trị hệ thống", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mở trò chuyện với trợ lý AI" })
    .click();
  await page.getByLabel("Câu hỏi cho trợ lý AI").fill("An ninh mạng là gì?");
  await page.getByLabel("Câu hỏi cho trợ lý AI").press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.locator(".cl-history-item")).toContainText(
    "An ninh mạng là gì?",
  );
  await expect(page.locator(".cl-history-item")).toContainText("Phản hồi mẫu");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await page.getByRole("button", { name: "Điền User", exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".cl-history-item")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Bạn chưa có cuộc hỏi đáp nào" }),
  ).toBeVisible();
});

test("account and public navigation fit phone and tablet widths", async ({
  page,
}) => {
  test.setTimeout(60000);
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [390, 844],
    [440, 956],
    [760, 956],
    [761, 956],
    [768, 1024],
    [834, 1194],
    [900, 1000],
    [901, 1000],
    [1024, 1366],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
    [844, 390],
    [956, 440],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "/login",
      "/register",
      "/search",
      "/library",
      "/terms",
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (width === 440 && ["/login", "/search"].includes(route)) {
        await settle(page);
        await page.screenshot({
          path: `test-results/navigation-${route.slice(1)}-mobile.png`,
          fullPage: true,
        });
      }
      if (width <= 900 && route === "/login") {
        await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
        const dialog = page.getByRole("dialog", { name: "Điều hướng chính" });
        await expect(dialog.locator(".brand")).toContainText(
          "HIỂU LUẬT · AN TÂM",
        );
        const rect = (await dialog.boundingBox())!;
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(width);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.y + rect.height).toBeLessThanOrEqual(height);
        await dialog
          .getByRole("link", { name: "Từ điển thuật ngữ", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: "Từ điển thuật ngữ", exact: true }),
        ).toBeVisible();
      }
    }
  }
});

test("signed-in history and menu fit touch screens and short landscape viewports", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 440, height: 956 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByRole("button", { name: "Điền User", exact: true }).tap();
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).tap();
    await expect(page).toHaveURL(/\/search$/);
    await page
      .getByRole("link", { name: "Lịch sử hỏi đáp", exact: true })
      .tap();
    await expect(page).toHaveURL(/\/history$/);
    for (const [width, height] of [
      [320, 568],
      [440, 956],
      [834, 1194],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await settle(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await expect(
        page.getByRole("heading", { name: "Lịch sử hỏi đáp", exact: true }),
      ).toBeVisible();
      const link = page.getByRole("link", {
        name: "Lịch sử hỏi đáp",
        exact: true,
      });
      expect(
        await link.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      if (width === 440) {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: "test-results/navigation-history-mobile.png",
          fullPage: true,
        });
      }
      await page
        .locator(".cl-history-empty")
        .getByRole("button", { name: "Hỏi đáp cùng AI" })
        .tap();
      await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
      await page.keyboard.press("Escape");
    }
  } finally {
    await context.close();
  }
});
