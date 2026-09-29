import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function sendCode(page: Page) {
  await page.getByLabel("Địa chỉ email").fill("preview@example.invalid");
  await page
    .getByRole("button", { name: "Gửi mã xác nhận", exact: true })
    .click();
  return (await page.getByTestId("preview-code").innerText()).trim();
}

test("login email, invalid code, password validation and automatic return", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/login?next=history");
  await page.getByRole("button", { name: "Quên mật khẩu?" }).click();
  await expect(page.getByLabel("Địa chỉ email")).toBeFocused();
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await page.getByLabel("Địa chỉ email").fill("preview@example.invalid");
  await page.getByRole("button", { name: "Quên mật khẩu?" }).click();
  await expect(page).toHaveURL(/\/forgot-password\?next=history$/);
  await expect(page.getByLabel("Địa chỉ email")).toHaveValue(
    "preview@example.invalid",
  );
  const code = await sendCode(page);
  await expect(page.getByLabel("Mã xác nhận", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("Mã xác nhận", { exact: true })
    .fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Xác nhận mã", exact: true }).click();
  await expect(
    page.getByText("Mã chưa đúng. Bạn còn 4 lượt thử."),
  ).toBeVisible();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Xác nhận mã", exact: true }).click();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toBeFocused();
  await page
    .getByRole("button", { name: "Xác nhận mật khẩu mới", exact: true })
    .click();
  await expect(
    page.getByText("Mật khẩu cần có ít nhất 8 ký tự."),
  ).toBeVisible();
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("PreviewOnly!123");
  await page
    .getByLabel("Xác nhận mật khẩu mới", { exact: true })
    .fill("Different!123");
  await page
    .getByRole("button", { name: "Xác nhận mật khẩu mới", exact: true })
    .click();
  await expect(page.getByText("Mật khẩu nhập lại chưa khớp.")).toBeVisible();
  await page
    .getByRole("button", { name: "Hiện mật khẩu mới", exact: true })
    .click();
  await expect(
    page.getByLabel("Mật khẩu mới", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page
    .getByLabel("Xác nhận mật khẩu mới", { exact: true })
    .fill("PreviewOnly!123");
  await page
    .getByRole("button", { name: "Xác nhận mật khẩu mới", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?next=history$/);
  await expect(page.getByRole("status")).toContainText(
    "Mật khẩu tài khoản chưa thay đổi",
  );
  await expect(page.getByLabel("Địa chỉ email")).toHaveValue(
    "preview@example.invalid",
  );
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  expect(posts).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});

test("attempt limit, resend, email change and expiry invalidate the preview challenge", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/forgot-password");
  await page
    .getByRole("button", { name: "Gửi mã xác nhận", exact: true })
    .click();
  await expect(page.getByText("Bạn hãy nhập địa chỉ email.")).toBeVisible();
  const code = await sendCode(page);
  for (let i = 0; i < 5; i++) {
    await page
      .getByLabel("Mã xác nhận", { exact: true })
      .fill(code === "000000" ? "111111" : "000000");
    await page
      .getByRole("button", { name: "Xác nhận mã", exact: true })
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Xác nhận mã", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Mã đã hết lượt thử. Bạn hãy gửi lại mã."),
  ).toBeVisible();
  await page.clock.fastForward(31000);
  await page.getByRole("button", { name: "Gửi lại mã", exact: true }).click();
  await expect(page.getByLabel("Mã xác nhận", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Xác nhận mã", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Mã xác nhận", { exact: true })
    .fill((await page.getByTestId("preview-code").innerText()).trim());
  await page.getByRole("button", { name: "Xác nhận mã", exact: true }).click();
  await page.clock.fastForward(301000);
  await expect(
    page.getByRole("button", { name: "Xác nhận mật khẩu mới", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Mã đã hết hạn");
  await page.getByRole("button", { name: "Gửi lại mã", exact: true }).click();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toHaveCount(0);
  await page.getByLabel("Địa chỉ email").fill("another@example.invalid");
  await expect(page.getByLabel("Mã xác nhận", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("preview-code")).toHaveCount(0);
});

test("keyboard and reduced motion keep verification usable and accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/forgot-password");
  await page.getByLabel("Địa chỉ email").fill("preview@example.invalid");
  await page.getByLabel("Địa chỉ email").press("Enter");
  const code = (await page.getByTestId("preview-code").innerText()).trim();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill(code);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("all three stages fit phones, tablets, layout boundaries and landscape", async ({
  page,
}) => {
  test.setTimeout(120000);
  const sizes = [
    [320, 568],
    [390, 844],
    [440, 956],
    [700, 900],
    [701, 900],
    [768, 1024],
    [834, 1194],
    [900, 1000],
    [901, 1000],
    [1000, 1000],
    [1001, 1000],
    [1024, 1366],
    [1440, 1000],
    [1920, 1080],
    [844, 390],
    [956, 440],
  ];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto("/forgot-password");
    for (let stage = 0; stage < 3; stage++) {
      if (stage === 1) await sendCode(page);
      if (stage === 2) {
        await page
          .getByLabel("Mã xác nhận", { exact: true })
          .fill((await page.getByTestId("preview-code").innerText()).trim());
        await page
          .getByRole("button", { name: "Xác nhận mã", exact: true })
          .click();
      }
      await expect(page.locator(".reset-page .submit-button")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${width} stage ${stage}: horizontal overflow`,
      ).toBe(true);
      const measurements = await page
        .locator(".reset-page input, .reset-page .submit-button, .reset-steps")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const r = element.getBoundingClientRect();
            return {
              left: r.left,
              right: r.right,
              width: r.width,
              viewport: innerWidth,
            };
          }),
        );
      for (const r of measurements) {
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.right).toBeLessThanOrEqual(r.viewport + 1);
        expect(r.width).toBeGreaterThan(150);
      }
    }
    if (width === 320 || width === 440 || width === 1440) {
      await expect(page.locator(".reset-password-fields")).toHaveCSS(
        "opacity",
        "1",
      );
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({
        path: `test-results/reset-password-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(browserErrors).toEqual([]);
});

test("touch on iPhone-sized screen completes code step and opens navigation", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 440, height: 956 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/login");
  await page.getByLabel("Địa chỉ email").fill("preview@example.invalid");
  await page.getByRole("button", { name: "Quên mật khẩu?" }).tap();
  await page
    .getByRole("button", { name: "Gửi mã xác nhận", exact: true })
    .tap();
  await page
    .getByLabel("Mã xác nhận", { exact: true })
    .fill((await page.getByTestId("preview-code").innerText()).trim());
  await page.getByRole("button", { name: "Xác nhận mã", exact: true }).tap();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mở menu điều hướng" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.close();
});
