import { test, expect } from "@playwright/test";

test("real HTTP login, cookies, reload, navigation and logout; stale cookie is rejected", async ({
  page,
  context,
  playwright,
}) => {
  await page.goto("/login");
  await page.getByLabel("Địa chỉ email").fill("admin@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Browser-fixture!123");
  const login = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/login"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await login).status()).toBe(200);
  await expect(page).toHaveURL(/\/admin$/);
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "cyberlaw_browser_test")!;
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "cyberlaw_browser_test=",
  );
  const oldSession = await context.storageState();
  await page.reload();
  await expect(page.locator(".cl-admin-shell")).toBeVisible();
  await page
    .locator("aside.cl-admin-sidebar")
    .getByRole("link", { name: "Xem trang tra cứu", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Quản trị hệ thống", exact: true }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto("/library");
  await expect(
    second.getByRole("link", { name: "Quản trị hệ thống", exact: true }),
  ).toBeVisible();
  await second.close();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  const replay = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:5174",
    storageState: oldSession,
  });
  expect((await replay.get("/api/auth/me")).status()).toBe(401);
  await replay.dispose();
  await page.goto("/admin");
  await expect(page.locator(".cl-admin-shell")).toHaveCount(0);
});

test("real API rejects CSRF and storage forgery; login feedback fits responsive screens", async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "cyberlaw_current_user",
      JSON.stringify({ vai_tro: "admin", ma_nguoi_dung: 1 }),
    ),
  );
  await page.goto("/admin");
  await expect(page.locator(".cl-admin-shell")).toHaveCount(0);
  expect(
    (
      await context.request.post("/api/auth/login", {
        data: { email: "admin@example.test", password: "Browser-fixture!123" },
      })
    ).status(),
  ).toBe(419);
  await page.goto("/login");
  await page.getByLabel("Địa chỉ email").fill("nobody@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Wrong-password!123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Email hoặc mật khẩu không chính xác.",
  );
  for (const [width, height] of [
    [320, 568],
    [440, 956],
    [834, 1194],
    [1440, 900],
    [844, 390],
    [956, 440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    // Form controls stay in viewport horizontally even when vertical scrolling is necessary.
    for (const field of [
      page.getByLabel("Địa chỉ email"),
      page.getByLabel("Mật khẩu", { exact: true }),
      page.locator(".submit-button"),
    ]) {
      const rect = (await field.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
    }
    if (width === 440)
      await page.screenshot({
        path: "test-results/login-real-api-440.png",
        fullPage: true,
      });
  }
});

test("real user login follows history intent and cannot render admin", async ({
  page,
}) => {
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await page.getByLabel("Địa chỉ email").fill("user@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Browser-fixture!123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await page.goto("/admin");
  await expect(page.locator(".cl-admin-shell")).toHaveCount(0);
});
