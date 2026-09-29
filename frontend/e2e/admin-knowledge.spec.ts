import { mockAuth } from "./auth-fixtures";
import { Buffer } from "node:buffer";
import { test, expect, type Page } from "./auth-fixtures";
import AxeBuilder from "@axe-core/playwright";

async function openKnowledge(page: Page) {
  await mockAuth(page, "admin");
  await page.goto("/admin/documents");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { level: 1, name: "Văn bản & Tri thức" }),
  ).toBeVisible();
}
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
}
async function tab(page: Page, name: string) {
  await page.getByRole("tab", { name, exact: true }).click();
}
const desktopRows = (page: Page) =>
  page.locator(".cl-knowledge-desktop-list tbody tr");

test("documents: search, draft validation, PDF preview, safe delete and archive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openKnowledge(page);
  await settle(page);
  await page.screenshot({
    path: "test-results/knowledge-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Thêm văn bản", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên văn bản").fill("Văn bản kiểm tra giao diện");
  await dialog.getByLabel(/^Số hiệu/).fill("VB-MAU-01");
  await dialog.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(
    dialog.getByText("Số hiệu này đã có trong danh sách."),
  ).toBeVisible();
  await expect(dialog.getByLabel(/^Số hiệu/)).toBeFocused();
  await dialog.getByLabel(/^Số hiệu/).fill("THU-01");
  await dialog.getByLabel("Ngày có hiệu lực").fill("2026-09-28");
  await dialog.getByLabel("Ngày hết hiệu lực").fill("2026-09-27");
  await dialog.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(
    dialog.getByText("Ngày kết thúc phải từ ngày có hiệu lực trở đi."),
  ).toBeVisible();
  await dialog.getByLabel("Ngày hết hiệu lực").fill("");
  await dialog.getByLabel("Tài liệu PDF", { exact: true }).setInputFiles({
    name: "tai-lieu-thu.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await dialog.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Tìm kiếm văn bản" })
    .fill("van ban kiem tra");
  await expect(desktopRows(page)).toHaveCount(1);
  const title = desktopRows(page).getByRole("button", {
    name: "Văn bản kiểm tra giao diện",
    exact: true,
  });
  await title.click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("link", { name: "Xem PDF đã chọn" }),
  ).toHaveAttribute("href", /^blob:/);
  await dialog.getByRole("button", { name: "Công bố", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Công bố", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(title).toBeFocused();
  await title.click();
  await dialog.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await dialog.getByLabel("Tên văn bản").fill("Văn bản kiểm tra đã sửa");
  await dialog.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(desktopRows(page)).toHaveCount(4);
  await desktopRows(page)
    .getByRole("button", { name: "Văn bản kiểm tra đã sửa", exact: true })
    .click();
  await expect(dialog.getByText("THU-01 · Phiên bản 2")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Xóa văn bản", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(desktopRows(page)).toHaveCount(3);
  await desktopRows(page)
    .getByRole("button", {
      name: "An ninh mạng — văn bản minh họa",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Xóa văn bản", exact: true })
    .click();
  await expect(
    dialog.getByText(/Văn bản đang có điều khoản liên quan/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Lưu trữ thay thế" }).click();
  await dialog.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Lọc trạng thái").selectOption("archived");
  await expect(desktopRows(page)).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("knowledge links: create clause, keyword and rule; validate citations and deletion restrictions", async ({
  page,
}) => {
  await openKnowledge(page);
  await tab(page, "Điều khoản");
  await page
    .getByRole("button", { name: "Thêm điều khoản", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Số điều/).fill("1");
  await dialog
    .getByLabel("Nội dung nguyên văn")
    .fill("Đoạn thử nghiệm dành riêng cho giao diện.");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    dialog.getByText(/Vị trí điều\/khoản\/điểm này đã tồn tại/),
  ).toBeVisible();
  await dialog.getByLabel(/^Số điều/).fill("10a");
  await dialog.getByLabel("Tiêu đề điều khoản").fill("Điều khoản dùng thử");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(desktopRows(page)).toHaveCount(1);
  await expect(desktopRows(page)).toContainText("Điều khoản dùng thử");
  await tab(page, "Từ khóa & Khái niệm");
  await page.getByRole("button", { name: "Thêm từ khóa", exact: true }).click();
  await dialog.getByLabel(/^Cụm từ/).fill("Từ khóa thử");
  await dialog.getByLabel("Biến thể tìm kiếm").fill("tu khoa thu, thu nghiem");
  await dialog.getByLabel(/^Định nghĩa/).fill("Định nghĩa dùng thử.");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    dialog.getByText("Chọn điều khoản làm căn cứ cho định nghĩa."),
  ).toBeVisible();
  await dialog.getByLabel("Căn cứ định nghĩa").selectOption("7");
  await dialog.getByRole("checkbox", { name: /Điều 10a/ }).check();
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Tìm kiếm từ khóa" })
    .fill("thu nghiem");
  await expect(desktopRows(page)).toHaveCount(1);
  await expect(desktopRows(page)).toContainText("1 liên kết");
  await tab(page, "Quy định");
  await page
    .getByRole("button", { name: "Thêm quy định", exact: true })
    .click();
  await dialog.getByLabel("Điều khoản làm căn cứ").selectOption("7");
  await dialog.getByLabel("Loại quy định").selectOption("procedure");
  await dialog.getByLabel(/^Hành vi/).fill("Hành vi thử nghiệm");
  await dialog.getByLabel("Trích nguyên văn căn cứ").fill("Trích sai nguồn");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    dialog.getByText(
      "Đoạn trích phải khớp nguyên văn trong điều khoản đã chọn.",
    ),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Dùng nguyên văn" }).click();
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Lọc loại nội dung").selectOption("procedure");
  await expect(desktopRows(page)).toHaveCount(1);
  await desktopRows(page)
    .getByRole("button", { name: "Hành vi thử nghiệm", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Điều 10a/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "Chi tiết điều khoản" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Từ khóa thử", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await tab(page, "Điều khoản");
  await page
    .getByRole("textbox", { name: "Tìm kiếm điều khoản" })
    .fill("Điều khoản dùng thử");
  await desktopRows(page)
    .getByRole("button", { name: "Xóa Điều khoản dùng thử", exact: true })
    .click();
  await expect(dialog.getByText(/Điều khoản đang làm căn cứ/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Xác nhận xóa" }),
  ).toHaveCount(0);
});

for (const width of [320, 440, 834]) {
  test(`four knowledge tabs and forms fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 956 });
    await openKnowledge(page);
    for (const [index, name] of [
      "Văn bản",
      "Điều khoản",
      "Từ khóa & Khái niệm",
      "Quy định",
    ].entries()) {
      await tab(page, name);
      await settle(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `test-results/knowledge-${width}-${index}.png`,
        fullPage: true,
      });
      await page.locator("[data-knowledge-add]").click();
      const dialog = page.getByRole("dialog");
      const rect = (await dialog.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(956);
      expect(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      const save = dialog.getByRole("button", {
        name: /Lưu bản nháp|Lưu thay đổi/,
      });
      await expect(save).toBeInViewport();
      await expect(dialog).toHaveCSS("opacity", "1");
      if (index === 3 && width === 440)
        await page.screenshot({
          path: "test-results/knowledge-mobile-form.png",
        });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.locator("[data-knowledge-add]")).toBeFocused();
      const list = page.locator(
        width <= 720
          ? ".cl-knowledge-mobile-list"
          : ".cl-knowledge-desktop-list",
      );
      await list.locator(".cl-knowledge-title-button").first().click();
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS("opacity", "1");
      if (index === 3 && width === 440)
        await page.screenshot({
          path: "test-results/knowledge-mobile-detail.png",
        });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.locator("body")).not.toHaveCSS(
        "pointer-events",
        "none",
      );
    }
  });
}

test("animation only on tab changes, reduced motion, keyboard tabs and accessible dialogs", async ({
  page,
}) => {
  await openKnowledge(page);
  await settle(page);
  const pageAudit = await new AxeBuilder({ page })
    .include(".cl-knowledge-page")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(pageAudit.violations).toEqual([]);
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    (window as typeof window & { revealCalls: number }).revealCalls = 0;
    Element.prototype.animate = function (...args) {
      if (this.hasAttribute("data-admin-reveal"))
        (window as typeof window & { revealCalls: number }).revealCalls++;
      return original.apply(this, args);
    };
  });
  await tab(page, "Điều khoản");
  await settle(page);
  const revealCalls = () =>
    page.evaluate(
      () => (window as typeof window & { revealCalls: number }).revealCalls,
    );
  const count = await revealCalls();
  expect(count).toBeGreaterThan(0);
  await page
    .getByRole("textbox", { name: "Tìm kiếm điều khoản" })
    .pressSequentially("an ninh");
  await page.getByLabel("Lọc theo văn bản").selectOption("2");
  await expect.poll(revealCalls).toBe(count);
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy nội dung phù hợp" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
    .last()
    .click();
  await expect.poll(revealCalls).toBe(count);
  await page.getByRole("tab", { name: "Điều khoản", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Từ khóa & Khái niệm", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Từ khóa & Khái niệm", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(await revealCalls()).toBe(count);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await tab(page, "Quy định");
  await settle(page);
  const translations = await page
    .locator("[data-admin-reveal]")
    .evaluateAll((elements) =>
      elements.map((el) => getComputedStyle(el).translate),
    );
  expect(
    translations.every((value) => value === "none" || value === "0px"),
  ).toBe(true);
  await page.locator("[data-knowledge-add]").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .include(".cl-knowledge-dialog")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-knowledge-add]")).toBeFocused();
});
