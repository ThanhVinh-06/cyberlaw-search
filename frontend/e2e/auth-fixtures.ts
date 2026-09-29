import {
  test as base,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";

// UI-only fixtures. Real cookie/CSRF integration has its own config and never imports this file.
export async function mockAuth(
  target: Page | BrowserContext,
  role: "admin" | "user" | null = null,
) {
  let currentRole = role;
  const user = () => ({
    ma_nguoi_dung: currentRole === "admin" ? 1 : 2,
    ho_ten: "Tài khoản kiểm thử",
    thu_dien_tu: `${currentRole}@example.test`,
    vai_tro: currentRole,
    trang_thai: "active",
    ngay_tao: "2026-01-01",
    ngay_cap_nhat: "2026-01-01",
  });
  await target.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body: object = {};
    if (path.endsWith("/csrf")) body = { csrf_token: "ui-fixture-csrf" };
    else if (path.endsWith("/logout")) {
      currentRole = null;
      body = { message: "OK" };
    } else if (path.endsWith("/login")) {
      const { email, password } = route.request().postDataJSON();
      if (
        ["admin@example.test", "user@example.test"].includes(email) &&
        password === "UI-fixture-only!123"
      ) {
        currentRole = email.startsWith("admin") ? "admin" : "user";
        body = { user: user() };
      } else {
        status = 401;
        body = { message: "Email hoặc mật khẩu không chính xác." };
      }
    } else if (currentRole) body = { user: user() };
    else {
      status = 401;
      body = { message: "Unauthenticated" };
    }
    await route.fulfill({ status, json: body });
  });
}

export async function fillLogin(page: Page, role: "admin" | "user") {
  await page.getByLabel("Địa chỉ email").fill(`${role}@example.test`);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("UI-fixture-only!123");
}

export const test = base.extend<{ authFixture: void }>({
  authFixture: [
    async ({ context }, use) => {
      await mockAuth(context);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
export type { Page };
