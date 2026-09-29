import { test, expect, fillLogin } from "./auth-fixtures";

test("login shows pending state and explains 419, 429 and network failures", async ({
  page,
}) => {
  await page.goto("/login");
  let attempts = 0;
  let status = 429;
  await page.route("**/api/auth/login", async (route) => {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status,
      json: { message: "Server detail is not echoed" },
    });
  });
  await fillLogin(page, "user");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".submit-button")).toBeDisabled();
  await expect(page.locator(".submit-button")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Vui lòng chờ một phút");
  expect(attempts).toBe(1);
  status = 419;
  await fillLogin(page, "user");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Phiên bảo vệ đã hết hạn",
  );
  await page.route("**/api/auth/login", (route) => route.abort());
  await fillLogin(page, "user");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Không thể kết nối dịch vụ tài khoản",
  );
  await expect(page.locator(".submit-button")).toBeEnabled();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("failed logout keeps session visible and offers a retry", async ({
  page,
}) => {
  await page.goto("/login");
  await fillLogin(page, "user");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.route("**/api/auth/logout", (route) => route.abort());
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Chưa đăng xuất được");
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
