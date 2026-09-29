import { test, expect } from "./auth-fixtures";

test("leaving a pending registration does not redirect the user back", async ({
  page,
}) => {
  await page.goto("/register?next=history");
  await page.route("**/api/auth/register", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({ status: 201, json: { message: "Created" } });
  });
  await page.getByLabel("Họ và tên").fill("Test Member");
  await page.getByLabel("Địa chỉ email").fill("test@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Test-password123");
  await page.getByLabel("Xác nhận mật khẩu").fill("Test-password123");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/register"),
  );
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await page.getByRole("link", { name: "Tra cứu không cần tài khoản" }).click();
  await response;
  await expect(page).toHaveURL(/\/search$/);
});

test("registration pending and server errors preserve safe fields and clear passwords", async ({
  page,
}) => {
  await page.goto("/register");
  for (const status of [409, 422, 429, 500]) {
    await page.route("**/api/auth/register", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({ status, json: { code: "registration_conflict" } });
    });
    await page.getByLabel("Họ và tên").fill("Tài khoản thử");
    await page.getByLabel("Địa chỉ email").fill("test@example.test");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Test-password123");
    await page.getByLabel("Xác nhận mật khẩu").fill("Test-password123");
    await page
      .getByRole("button", { name: "Tạo tài khoản", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Đang tạo tài khoản…", exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole("status")).not.toBeEmpty();
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Xác nhận mật khẩu")).toHaveValue("");
    await expect(page.getByLabel("Địa chỉ email")).toHaveValue(
      "test@example.test",
    );
    await expect(
      page.getByRole("button", { name: "Tạo tài khoản", exact: true }),
    ).toBeEnabled();
  }
  for (const [width, height] of [
    [320, 568],
    [440, 956],
    [834, 1194],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const box = (await page.locator(".form-notice").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});

test("registration validates UTF-8 password byte limit before sending", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Họ và tên").fill("Nguyễn An");
  await page.getByLabel("Địa chỉ email").fill("test@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("ệ".repeat(25));
  await page.getByLabel("Xác nhận mật khẩu").fill("ệ".repeat(25));
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByText("Mật khẩu tối đa 72 byte và không chứa ký tự null."),
  ).toBeVisible();
});
