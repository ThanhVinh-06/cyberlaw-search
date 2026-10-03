import { mockAuth } from "./auth-fixtures";
import { test, expect } from "./auth-fixtures";

// Trang /admin chỉ được hướng dẫn đăng nhập, tuyệt đối không in tài khoản/mật khẩu mẫu.
// Chuỗi mẫu cũ (admin@cyberlaw.vn / admin12345) từng nằm trong bundle production.
const LEAKED = ["admin@cyberlaw.vn", "admin12345", "Tài khoản Quản trị viên mẫu"];

test("unauthenticated /admin asks for a login without printing demo credentials", async ({
  page,
}) => {
  await mockAuth(page, null);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Yêu cầu đăng nhập Quản trị viên" }),
  ).toBeVisible();
  const body = await page.locator("body").innerText();
  for (const secret of LEAKED) expect(body).not.toContain(secret);
  await expect(
    page.getByRole("link", { name: "Đăng nhập Quản trị viên" }),
  ).toHaveAttribute("href", "/login");
});

test("signed-in non-admin sees a refusal that names only their own account", async ({
  page,
}) => {
  await mockAuth(page, "user");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Từ chối quyền truy cập" }),
  ).toBeVisible();
  await expect(page.getByText("Tài khoản kiểm thử")).toBeVisible();
  const body = await page.locator("body").innerText();
  for (const secret of LEAKED) expect(body).not.toContain(secret);
});
