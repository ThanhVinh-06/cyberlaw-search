import { test, expect } from "@playwright/test";

test("real SMTP reset changes password, revokes old cookie and rejects grant replay", async ({
  page,
  context,
  playwright,
}) => {
  const email = "reset-browser@example.test";
  const oldPassword = " Reset-before!123 ";
  const newPassword = " Reset-after!123 ";
  const post = async (path: string, data: object) => {
    const { csrf_token } = await (
      await context.request.get("/api/auth/csrf")
    ).json();
    return context.request.post(`/api/auth/${path}`, {
      headers: { "X-CSRF-TOKEN": csrf_token },
      data,
    });
  };
  expect(
    (
      await post("register", {
        name: "Reset Browser",
        email,
        password: oldPassword,
        password_confirmation: oldPassword,
      })
    ).status(),
  ).toBe(201);
  expect((await post("login", { email, password: oldPassword })).status()).toBe(
    200,
  );
  const oldSession = await context.storageState();
  await post("logout", {});
  // Keep another valid session to demonstrate server-side revocation across browsers.
  const other = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:5174",
  });
  const { csrf_token: otherToken } = await (
    await other.get("/api/auth/csrf")
  ).json();
  expect(
    (
      await other.post("/api/auth/login", {
        headers: { "X-CSRF-TOKEN": otherToken },
        data: { email, password: oldPassword },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/forgot-password?next=history");
  await page.getByLabel("Địa chỉ email").fill(email);
  const requested = page.waitForResponse((r) =>
    r.url().endsWith("/password/request"),
  );
  await page
    .getByRole("button", { name: "Gửi mã xác nhận", exact: true })
    .click();
  expect((await requested).status()).toBe(202);
  const inbox = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:8026",
  });
  const message = await (await inbox.get("/api/v1/message/latest")).json();
  expect(message.To[0].Address).toBe(email);
  const code = (message.Text || message.HTML).match(/\b[0-9]{6}\b/)?.[0];
  expect(typeof code).toBe("string");
  await expect(page.getByTestId("preview-code")).toHaveCount(0);
  await page.getByLabel("Mã xác nhận", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Xác nhận mã", exact: true }).click();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toBeVisible();
  const grantSession = await context.storageState();
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(newPassword);
  await page
    .getByLabel("Xác nhận mật khẩu mới", { exact: true })
    .fill(newPassword);
  await page
    .getByRole("button", { name: "Xác nhận mật khẩu mới", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await expect(page.getByRole("status")).toContainText(
    "Đổi mật khẩu thành công",
  );
  expect((await other.get("/api/auth/me")).status()).toBe(401);
  for (const storageState of [oldSession, grantSession]) {
    const replay = await playwright.request.newContext({
      baseURL: "http://127.0.0.1:5174",
      storageState,
    });
    const { csrf_token } = await (await replay.get("/api/auth/csrf")).json();
    expect(
      (
        await replay.post("/api/auth/password/complete", {
          headers: { "X-CSRF-TOKEN": csrf_token },
          data: {
            email,
            password: oldPassword,
            password_confirmation: oldPassword,
          },
        })
      ).status(),
    ).toBe(422);
    await replay.dispose();
  }
  expect((await post("login", { email, password: oldPassword })).status()).toBe(
    401,
  );
  await page.getByLabel("Mật khẩu", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await inbox.dispose();
  await other.dispose();
});

test("real registration creates a normal user, returns to login and rejects duplicates", async ({
  page,
  context,
}) => {
  await page.goto("/register?next=history");
  await page.getByLabel("Họ và tên").fill("Người dùng kiểm thử");
  await page.getByLabel("Địa chỉ email").fill("new-member@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(" Registration-browser!123 ");
  await page.getByLabel("Xác nhận mật khẩu").fill(" Registration-browser!123 ");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/register"),
  );
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  expect((await response).status()).toBe(201);
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await expect(page.getByRole("status")).toContainText(
    "Tạo tài khoản thành công",
  );
  await expect(page.getByLabel("Địa chỉ email")).toHaveValue(
    "new-member@example.test",
  );
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  expect((await context.request.get("/api/auth/me")).status()).toBe(401);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(" Registration-browser!123 ");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  const me = await context.request.get("/api/auth/me");
  expect((await me.json()).user.vai_tro).toBe("user");
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.goto("/admin");
  await expect(page.locator(".cl-admin-shell")).toHaveCount(0);
  const { csrf_token } = await (
    await context.request.get("/api/auth/csrf")
  ).json();
  await context.request.post("/api/auth/logout", {
    headers: { "X-CSRF-TOKEN": csrf_token },
  });
  const { csrf_token: nextToken } = await (
    await context.request.get("/api/auth/csrf")
  ).json();
  const duplicate = await context.request.post("/api/auth/register", {
    headers: { "X-CSRF-TOKEN": nextToken },
    data: {
      name: "Replacement",
      email: "NEW-MEMBER@example.test",
      password: "other-password123",
      password_confirmation: "other-password123",
      vai_tro: "admin",
    },
  });
  expect(duplicate.status()).toBe(409);
});

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
