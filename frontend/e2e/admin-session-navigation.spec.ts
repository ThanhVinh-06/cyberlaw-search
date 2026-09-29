import { fillLogin } from "./auth-fixtures";
import { test, expect, type Page } from "./auth-fixtures";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await fillLogin(page, "admin");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function expectAdminSession(page: Page) {
  await expect(
    page.getByRole("link", { name: "Quản trị hệ thống", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("cyberlaw_current_user")),
  ).toBeNull();
}

test("system links retain admin session in the current tab, including reload and back", async ({
  page,
  context,
}) => {
  await loginAsAdmin(page);
  for (const [label, route] of [
    ["Xem trang tra cứu", "/search"],
    ["Thư viện văn bản", "/library"],
  ]) {
    const link = page
      .locator("aside.cl-admin-sidebar")
      .getByRole("link", { name: label, exact: true });
    await expect(link).not.toHaveAttribute("target", "_blank");
    if (route === "/library") {
      await link.focus();
      await page.keyboard.press("Enter");
    } else await link.click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    expect(context.pages()).toHaveLength(1);
    await expectAdminSession(page);
    await page.reload();
    await expectAdminSession(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator(".cl-admin-shell")).toBeVisible();
  }
  await page
    .getByRole("link", { name: "Giao diện Tra cứu", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  expect(
    await page.evaluate(() => sessionStorage.getItem("cyberlaw_current_user")),
  ).toBeNull();
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page.locator(".cl-admin-shell")).toHaveCount(0);
});

test.describe("responsive session navigation", () => {
  test.use({ hasTouch: true, deviceScaleFactor: 3 });

  test("admin, search and library remain usable on phone, tablet and landscape", async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    await loginAsAdmin(page);
    for (const [width, height] of [
      [320, 568],
      [440, 956],
      [834, 1194],
      [1440, 900],
      [844, 390],
      [956, 440],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/admin");
      if (width <= 900) {
        await page.getByRole("button", { name: "Mở menu quản trị" }).tap();
        const menu = page.getByRole("dialog", { name: "Điều hướng quản trị" });
        const box = (await menu.boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await menu
          .getByRole("link", { name: "Về trang tra cứu", exact: true })
          .tap();
        await expect(menu).toHaveCount(0);
        await expect(page.locator("body")).not.toHaveCSS(
          "pointer-events",
          "none",
        );
      } else {
        await page
          .locator("aside.cl-admin-sidebar")
          .getByRole("link", { name: "Xem trang tra cứu", exact: true })
          .tap();
      }
      await expect(page).toHaveURL(/\/search$/);
      await expectAdminSession(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("link", { name: "Thư viện văn bản", exact: true })
        .tap();
      await expect(page).toHaveURL(/\/library$/);
      await expectAdminSession(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("link", { name: "Quản trị hệ thống", exact: true })
        .tap();
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.locator(".cl-admin-shell")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(context.pages()).toHaveLength(1);
    }
  });
});
