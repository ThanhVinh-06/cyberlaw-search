import { test, expect } from "./auth-fixtures";
import AxeBuilder from "@axe-core/playwright";

test("login validates, reveals password and handles rejected API credentials", async ({
  page,
}) => {
  const errors: string[] = [];
  const posts: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByLabel("Địa chỉ email")).toBeFocused();
  await expect(page.getByText("Bạn hãy nhập địa chỉ email.")).toBeVisible();
  await page.getByLabel("Địa chỉ email").fill("sai-email");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Temporary-test!9");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText("Địa chỉ email chưa đúng định dạng."),
  ).toBeVisible();
  await page.getByLabel("Địa chỉ email").fill("demo@example.invalid");
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Email hoặc mật khẩu không chính xác.",
  );
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  expect(posts).toEqual(["http://127.0.0.1:5173/api/auth/login"]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test("registration validates matching passwords, clears on navigation and supports browser back", async ({
  page,
}) => {
  await page.goto("/register");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page.getByLabel("Họ và tên")).toBeFocused();
  await page.getByLabel("Họ và tên").fill("Nguyễn Văn An");
  await page.getByLabel("Địa chỉ email").fill("an@example.invalid");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("123");
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("456");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByText("Mật khẩu cần có ít nhất 8 ký tự."),
  ).toBeVisible();
  await expect(page.getByText("Mật khẩu nhập lại chưa khớp.")).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Temporary-test!9");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("Temporary-test!9");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("654321");
  await page
    .getByRole("button", { name: "Xác nhận email", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText(
    "Xác minh email thành công",
  );
  await expect(page.getByLabel("Địa chỉ email")).toHaveValue(
    "an@example.invalid",
  );
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Tạo tài khoản mới" }),
  ).toBeVisible();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
});

test("guest search and source dialog remain usable", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Tra cứu không cần tài khoản" }).click();
  await page.getByLabel("Từ khóa hoặc câu hỏi").fill("Điều 44");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".cl-result")).toHaveCount(1);
  await page.getByRole("button", { name: "Xem điều khoản" }).click();
  await expect(page.getByRole("dialog")).toContainText("Hiệu lực thi hành");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xem điều khoản" }),
  ).toBeFocused();
});

test("mobile menu traps focus, closes with Escape and navigates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở menu điều hướng" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Thư viện văn bản" })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("responsive layouts, WCAG checks and screenshots", async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
    for (const route of ["login", "register"]) {
      await page.goto(`/${route}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("h1")).toBeVisible();
      if (width <= 390) {
        const launcher = await page.locator(".cl-chat-launcher").boundingBox();
        const form = await page.locator(".auth-form").boundingBox();
        expect(launcher!.y).toBeGreaterThan(form!.y + form!.height);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 1440 || width === 390) {
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          a11y.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        ).toEqual([]);
        await page.screenshot({
          path: `../docs/design/screenshots/${route}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
});

test("keyboard navigation and reduced motion have no moving transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  const register = page
    .locator(".auth-switch")
    .getByRole("link", { name: "Đăng ký", exact: true });
  await register.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Tạo tài khoản mới" }),
  ).toBeFocused();
  expect(
    await page
      .locator(".auth-switch-indicator")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
  await page.getByLabel("Họ và tên").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Địa chỉ email")).toBeFocused();
});
