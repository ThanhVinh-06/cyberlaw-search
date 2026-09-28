import { test, expect } from "@playwright/test";

test("original public views retain filters, article references and sample chat", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tìm kiếm quy định pháp luật" }),
  ).toBeVisible();
  await expect(page.locator(".cl-result")).toHaveCount(3);
  await page.getByLabel("Từ khóa hoặc câu hỏi").fill("");
  await page.getByLabel("Loại nội dung").selectOption("definition");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".cl-result")).toHaveCount(1);
  await expect(page.locator(".cl-result")).toContainText("Điều 2.");
  await page.getByLabel("Ban hành từ ngày").fill("2026-01-01");
  await page.getByLabel("Đến ngày").fill("2025-01-01");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Ngày bắt đầu");
  await expect(page.locator(".cl-result")).toHaveCount(1);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Ban hành từ ngày")).toHaveValue("");
  await expect(page.locator(".cl-result")).toHaveCount(3);
  await page.getByLabel("Ban hành từ ngày").fill("2026-01-01");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByText("Chưa tìm thấy kết quả phù hợp")).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByLabel("Từ khóa hoặc câu hỏi").fill("dieu 44");
  await page.getByLabel("Tìm kiếm theo").selectOption("article");
  await page.getByLabel("Từ khóa hoặc câu hỏi").press("Control+Enter");
  await expect(page.locator(".cl-result")).toHaveCount(1);
  await page.getByRole("link", { name: "Thư viện văn bản" }).click();
  await page
    .getByRole("button", { name: "Điều 2 · Giải thích từ ngữ" })
    .click();
  await expect(page.locator(".cl-document-card:visible")).toContainText(
    "Trích khoản 1",
  );
  await page
    .getByRole("link", { name: "Từ điển thuật ngữ", exact: true })
    .click();
  await page.getByRole("button", { name: "Xem khoản 1 Điều 2" }).click();
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toContainText("Điều 2.");
  await page.keyboard.press("Escape");
  await page.goBack();
  await page.goBack();
  await expect(page.getByLabel("Từ khóa hoặc câu hỏi")).toHaveValue("dieu 44");
  await expect(page.locator(".cl-result")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Mở trò chuyện với trợ lý AI" })
    .click();
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
  await page
    .getByRole("button", { name: "Luật có hiệu lực từ khi nào?" })
    .click();
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await page.getByRole("button", { name: "Mở Điều 44" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Trò chuyện với trợ lý CyberLaw" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở trò chuyện với trợ lý AI" }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".auth-form")).toBeVisible();
  await page.getByRole("link", { name: "Tra cứu không cần tài khoản" }).click();
  await expect(page.locator(".cl-sidebar")).toBeVisible();
  expect(errors).toEqual([]);
});

test("public layout stays responsive and retains the original sidebar", async ({
  page,
}) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".cl-sidebar")).toBeVisible();
    if (width >= 768)
      expect(
        await page
          .locator(".cl-sidebar")
          .evaluate((e) => getComputedStyle(e).position),
      ).toBe("fixed");
    for (const route of ["/search", "/library", "/terms"]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/");
    const centerOffsets = await page
      .locator(".cl-result-bottom > .cl-link-button")
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const link = button.getBoundingClientRect();
          const card = button.closest(".cl-result")!.getBoundingClientRect();
          return Math.abs(
            link.left + link.width / 2 - card.left - card.width / 2,
          );
        }),
      );
    expect(centerOffsets).toHaveLength(3);
    expect(Math.max(...centerOffsets)).toBeLessThan(1);
    if (width === 1440 || width === 390) {
      await page.screenshot({
        path: `../docs/design/screenshots/main-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Mở trò chuyện với trợ lý AI" })
        .click();
      await expect
        .poll(() =>
          page
            .locator("#cl-chat-panel")
            .evaluate((element) => getComputedStyle(element).transform),
        )
        .toBe("none");
      await expect
        .poll(() =>
          page
            .locator(".cl-chat-content")
            .evaluate((element) => getComputedStyle(element).opacity),
        )
        .toBe("1");
      await page.screenshot({
        path: `../docs/design/screenshots/main-chat-${width}.png`,
        fullPage: true,
      });
    }
  }
});
