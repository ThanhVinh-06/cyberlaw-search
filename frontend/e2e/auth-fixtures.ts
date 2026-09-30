import {
  test as base,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import {mockAdminUsers} from './admin-user-fixtures';

// UI-only fixtures. Real cookie/CSRF integration has its own config and never imports this file.
export async function mockAuth(
  target: Page | BrowserContext,
  role: "admin" | "user" | null = null,
) {
  if (role === 'admin') await mockAdminUsers(target);
  let currentRole = role;
  let resetAttempts = 0;
  let verificationEmail = "verify@example.test";
  let verificationAttempts = 0;
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
    else if (path.endsWith("/email/status") || path.endsWith("/email/send")) {
      if (path.endsWith("/email/send")) verificationAttempts = 0;
      body = {
        email: verificationEmail,
        expires_in: 300,
        resend_after: 30,
        locked: verificationAttempts >= 5,
      };
    } else if (path.endsWith("/email/verify")) {
      if (route.request().postDataJSON().code !== "654321") {
        verificationAttempts++;
        status = 422;
        body = {
          code:
            verificationAttempts >= 5
              ? "verification_locked"
              : "verification_invalid",
        };
      } else body = { message: "Verified" };
    } else if (path.endsWith("/password/request")) {
      resetAttempts = 0;
      status = 202;
      body = {
        message:
          "Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được mã xác nhận.",
        expires_in: 300,
        resend_after: 30,
      };
    } else if (path.endsWith("/password/verify")) {
      if (route.request().postDataJSON().code !== "123456") {
        resetAttempts++;
        status = 422;
        body = { code: resetAttempts >= 5 ? "reset_locked" : "reset_invalid" };
      } else
        body = { message: "Đã xác nhận mã. Bạn có thể nhập mật khẩu mới." };
    } else if (path.endsWith("/password/complete")) {
      currentRole = null;
      body = { message: "Đổi mật khẩu thành công." };
    } else if (path.endsWith("/register")) {
      verificationEmail = route.request().postDataJSON().email;
      status = 201;
      body = {
        message: "Created",
        verification_required: true,
        mail_sent: true,
      };
    } else if (path.endsWith("/logout")) {
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
