import { test, expect } from "@playwright/test";

test("real knowledge CRUD persists, enforces review, handles stale edits and keeps responsive forms", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const csrf = async () =>
    (await (await context.request.get("/api/auth/csrf")).json())
      .csrf_token as string;
  const logged = await context.request.post("/api/auth/login", {
    headers: { "X-CSRF-TOKEN": await csrf() },
    data: { email: "admin@example.test", password: "Browser-fixture!123" },
  });
  expect(logged.status()).toBe(200);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin/documents");
  await page.locator("[data-knowledge-add]").click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên văn bản").fill("Văn bản kiểm thử tích hợp");
  await dialog.getByLabel(/^Số hiệu/).fill("HTTP-FIXTURE-2025");
  await dialog.getByLabel("Ngày ban hành").fill("2025-12-10");
  await dialog.getByLabel("Ngày có hiệu lực").fill("2026-07-01");
  await dialog.getByLabel("Liên kết nguồn").fill("https://example.test/law");
  await dialog
    .getByLabel("Tài liệu PDF", { exact: true })
    .setInputFiles({
      name: "fixture.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF",
      ),
    });
  await dialog.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".cl-knowledge-desktop-list")).toContainText(
    "HTTP-FIXTURE-2025",
  );
  const snapshot = await (
    await context.request.get("/api/admin/knowledge")
  ).json();
  const doc = snapshot.van_ban.find(
    (row: { so_hieu: string }) => row.so_hieu === "HTTP-FIXTURE-2025",
  );
  const download = await context.request.get(
    `/api/admin/knowledge/van_ban/${doc.ma_van_ban}/pdf`,
  );
  expect(download.status()).toBe(200);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect((await download.body()).toString()).toContain("%PDF-1.4");
  // The endpoint rejects a real HTTP mutation without CSRF, regardless of its authenticated cookie.
  expect(
    (
      await context.request.post("/api/admin/knowledge/tu_khoa", {
        data: { revision: snapshot.revision },
      })
    ).status(),
  ).toBe(419);
  await page.getByRole("tab", { name: "Điều khoản", exact: true }).click();
  await page.locator("[data-knowledge-add]").click();
  await dialog.getByLabel("Số điều").fill("1");
  await dialog
    .getByLabel("Nội dung nguyên văn")
    .fill("Nội dung nguyên văn kiểm thử. Không được thay đổi căn cứ.");
  await dialog.getByLabel("Trang PDF").fill("1");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("tab", { name: "Từ khóa & Khái niệm", exact: true })
    .click();
  await page.locator("[data-knowledge-add]").click();
  await dialog.getByLabel("Cụm từ").fill("Từ khóa HTTP");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: "Quy định", exact: true }).click();
  await page.locator("[data-knowledge-add]").click();
  await dialog.getByLabel(/^Hành vi/).fill("Hành vi thử");
  await dialog.getByRole("button", { name: "Dùng nguyên văn" }).click();
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog).toHaveCount(0);
  // Real API data, not a mocked UI response, at the requested device widths.
  for (const [width, height] of [
    [320, 956],
    [440, 956],
    [834, 956],
    [956, 440],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    for (const name of [
      "Văn bản",
      "Điều khoản",
      "Từ khóa & Khái niệm",
      "Quy định",
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(page.locator(".cl-knowledge-list-card")).toHaveAttribute(
        "aria-busy",
        "false",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.locator("[data-knowledge-add]").click();
      await expect(dialog).toBeVisible();
      expect(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await expect(
        dialog.getByRole("button", { name: /Lưu bản nháp|Lưu thay đổi/ }),
      ).toBeInViewport();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
    await page.screenshot({
      path: `test-results/knowledge-http-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("tab", { name: "Văn bản", exact: true }).click();
  await page
    .locator(".cl-knowledge-desktop-list .cl-knowledge-title-button")
    .first()
    .click();
  await dialog.getByRole("button", { name: "Công bố", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Công bố", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Công bố", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".cl-knowledge-desktop-list")).toContainText(
    "Đã công bố",
  );
  const before = await (
    await context.request.get("/api/admin/knowledge")
  ).json();
  const save = await context.request.post(
    `/api/admin/knowledge/van_ban/${doc.ma_van_ban}`,
    {
      headers: { "X-CSRF-TOKEN": await csrf() },
      data: {
        revision: before.revision,
        so_hieu: doc.so_hieu,
        tieu_de: "Sửa từ cửa sổ khác",
      },
    },
  );
  expect(save.status()).toBe(200);
  const stale = await context.request.delete(
    `/api/admin/knowledge/van_ban/${doc.ma_van_ban}`,
    {
      headers: { "X-CSRF-TOKEN": await csrf() },
      data: { revision: before.revision },
    },
  );
  expect(stale.status()).toBe(409);
  expect(errors).toEqual([]);
});
