import { test, expect } from "./auth-fixtures";
import AxeBuilder from "@axe-core/playwright";
test.use({ hasTouch: true });

test("verification keyboard flow, wrong code and success keep history intent", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/verify-email?next=history");
  await page.getByLabel("Mã xác nhận").fill("12");
  await page.getByLabel("Mã xác nhận").press("Enter");
  await expect(page.getByRole("alert")).toContainText("đủ 6 chữ số");
  await page.getByLabel("Mã xác nhận").fill("000000");
  await page.getByLabel("Mã xác nhận").press("Enter");
  await expect(page.getByRole("alert")).toContainText("Mã chưa đúng");
  await expect(page.getByLabel("Mã xác nhận")).toHaveValue("");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel("Mã xác nhận").fill("654321");
  await page.getByLabel("Mã xác nhận").press("Enter");
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await expect(page.getByRole("status")).toContainText(
    "Xác minh email thành công",
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});

test("five failures, resend countdown and expiry come from server state", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/verify-email");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Mã xác nhận").fill("000000");
    await page
      .getByRole("button", { name: "Xác nhận email", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Xác nhận email", exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(31000);
  await page.getByRole("button", { name: "Gửi lại mã", exact: true }).click();
  await expect(page.getByLabel("Mã xác nhận")).toBeEnabled();
  await page.clock.fastForward(301000);
  await expect(
    page.getByRole("button", { name: "Xác nhận email", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Chưa có mã còn hiệu lực.", { exact: false }),
  ).toBeVisible();
});

test("session expiry, failed mail, rate limit and leaving a pending request are handled", async ({
  page,
}) => {
  await page.route("**/api/auth/email/status", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto("/verify-email");
  await expect(page.getByRole("alert")).toContainText(
    "Phiên xác minh đã hết hạn",
  );
  await expect(page.getByLabel("Mã xác nhận")).toHaveCount(0);
  await page.unroute("**/api/auth/email/status");
  await page.route("**/api/auth/email/status", (route) =>
    route.fulfill({
      json: {
        email: "verify@example.test",
        expires_in: 0,
        resend_after: 0,
        locked: false,
      },
    }),
  );
  await page.goto("/verify-email");
  for (const status of [503, 429, 419]) {
    await page.route("**/api/auth/email/send", (route) =>
      route.fulfill({ status, json: {} }),
    );
    await page.getByRole("button", { name: "Gửi lại mã", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gửi lại mã", exact: true }),
    ).toBeEnabled();
  }
  await page.unroute("**/api/auth/email/status");
  await page.goto("/verify-email");
  await page.route("**/api/auth/email/verify", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ json: { message: "Verified" } });
  });
  await page.getByLabel("Mã xác nhận").fill("654321");
  const finished = page.waitForResponse((r) =>
    r.url().endsWith("/email/verify"),
  );
  await page
    .getByRole("button", { name: "Xác nhận email", exact: true })
    .click();
  await expect(page.getByLabel("Mã xác nhận")).toBeDisabled();
  await page
    .getByRole("link", { name: "Tra cứu pháp luật", exact: true })
    .click();
  await finished;
  await expect(page).toHaveURL(/\/search$/);
});

test("correct credentials of an unverified account open verification instead of history", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 403, json: { code: "email_unverified" } }),
  );
  await page.goto("/login?next=history");
  await page.getByLabel("Địa chỉ email").fill("verify@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("pending-password123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?next=history$/);
  await expect(page.getByLabel("Mã xác nhận")).toBeVisible();
});

for (const [width, height] of [
  [320, 568],
  [390, 844],
  [440, 956],
  [700, 900],
  [701, 900],
  [834, 1194],
  [900, 1000],
  [901, 1000],
  [1000, 1000],
  [1001, 1000],
  [1440, 1000],
  [1920, 1080],
  [844, 390],
  [956, 440],
]) {
  test(`verification fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/api/auth/email/status", (route) =>
      route.fulfill({
        json: {
          email:
            "long-email-for-responsive-checking-with-many-characters@example.test",
          expires_in: 300,
          resend_after: 30,
          locked: false,
        },
      }),
    );
    await page.goto("/verify-email");
    await expect(page.getByLabel("Mã xác nhận")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const boxes = await page
      .locator(
        ".verify-email-address, .verify-email-page input, .verify-email-page .submit-button, .verify-email-page .reset-steps",
      )
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right };
        }),
      );
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width + 1);
    }
    // Wait for Motion's layout transition after async challenge data loads.
    await expect
      .poll(async () => {
        const form = await page
          .locator(".verify-email-page .auth-card")
          .boundingBox();
        const launcher = await page.locator(".cl-chat-launcher").boundingBox();
        return !!form && !!launcher && launcher.y >= form.y + form.height;
      })
      .toBe(true);
    if (width === 440 || width === 320 || width === 1440)
      await page.screenshot({
        path: `test-results/verify-email-${width}.png`,
        fullPage: true,
      });
    if (width === 440) {
      await page.getByRole("button", { name: "Mở menu điều hướng" }).tap();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    if (width === 956) {
      await page
        .getByRole("button", { name: "Mở trò chuyện với trợ lý AI" })
        .click();
      const panel = page.locator(".cl-chat-panel");
      await expect
        .poll(async () => {
          const box = await panel.boundingBox();
          return (
            !!box &&
            box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y + box.height <= height + 1
          );
        })
        .toBe(true);
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
    }
  });
}
